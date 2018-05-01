import { IndexMultipleResponse } from './../models/responses/multiple-index';
import { IndexRequest } from './../models/requests/multiple-index';
import { ParseSummaryResults } from './../models/parse-summary-results';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronService } from 'ngx-electron';

import { KeyValuePair } from '../models/key-value-pair';
import { DocumentType, GeoCodeProvider, ParseSettings } from '../models/parse-settings';
import { Account } from '../models/responses/get-account';
import { Index } from '../models/responses/get-indexes';
import { JobParserConnection, ResumeParserConnection } from '../resources/parser-connection';
import { CancelationToken, ResourcePool } from '../resources/resource-pool';
import { FileSystem } from '../utilities/filesystem';
import { AppLogger } from '../utilities/logger';
import { StorageHelper } from '../utilities/storage';
import { AccountUser } from './../models/account-user';
import { OutputFormat } from './../models/parse-settings';
import { ParseResponse } from './../models/responses/parse';
import { IConnection } from './../resources/connection-interface';
import { RestService } from './../services/rest.service';

const path = (<any>window).require('path');


@Component({
  selector: 'parse',
  templateUrl: './parse.component.html',
  styleUrls: ['./parse.component.scss']
})


export class ParseComponent implements OnInit {
  @Input() documentType: DocumentType;


  loggedInAccount: AccountUser;
  account: Account = new Account();
  settings: ParseSettings = new ParseSettings();
  loading: boolean = false;
  parsing: boolean = false;
  submitted: boolean = false;
  aimEnabled: boolean = false;
  errorMessage: string;

  appLogger: AppLogger;

  //index
  showIndexModal: boolean = false;
  indexToSave: string;
  indexSaving: boolean = false;

  //selects
  geoCodeProviders = GeoCodeProvider;
  outputFormats = OutputFormat;
  normalizations: KeyValuePair[] = new Array<KeyValuePair>();
  skills: KeyValuePair[] = new Array<KeyValuePair>();
  indexes: Index[] = new Array<Index>();

  //parsing summary
  filesToParse: string[] = new Array<string>();
  totalFiles: number = 0;
  pool: ResourcePool;
  costPerParse: number = 1;
  cancellationToken: CancelationToken = new CancelationToken();
  summaryResults: ParseSummaryResults = new ParseSummaryResults();




  constructor(private router: Router, private storageSvc: StorageHelper, private fileSystem: FileSystem,
    private restSvc: RestService, public electronSvc: ElectronService, private zone: NgZone) { }

  async ngOnInit() {
    this.loggedInAccount = this.storageSvc.getLocalLoginInfo();
    this.account = (await this.restSvc.getAccount()).Value;

    this.skills = (await this.restSvc.getSkills()).Value;
    this.normalizations = (await this.restSvc.getNormalizations()).Value;

    try {
      this.getIndexes();
      this.aimEnabled = true;
    }
    catch (ex) {
      this.aimEnabled = false;
    }

    if (this.documentType == DocumentType.Resumes) {
      this.settings = this.storageSvc.getBulkResumeParseSettings();
      this.pool = new ResourcePool(this.restSvc, this.account.MaximumConcurrentRequests, ResumeParserConnection);
    }
    else if (this.documentType == DocumentType.JobOrders) {
      this.settings = this.storageSvc.getBulkJobOrderParseSettings()
      this.pool = new ResourcePool(this.restSvc, this.account.MaximumConcurrentRequests, JobParserConnection);
    }
  }

  async getIndexes() {
    let indexes = await this.restSvc.getIndexes();
    this.indexes = indexes.Value
      .filter(index => index.OwnerId == this.loggedInAccount.accountId 
        && index.IndexType == (this.documentType == DocumentType.Resumes ? 'Resume' : 'Job'));
  }

  setOutput = (path: string) => this.settings.outputDirectory = path;
  setSource = (path: string) => this.settings.inputDirectory = path;

  browseDirectory(setFunction: (path: string) => any) {
    this.zone.runOutsideAngular(() => {
      const a = this.electronSvc.remote.dialog.showOpenDialog({ properties: ['openDirectory'] }, (directory) => {
        if (directory !== undefined) {
          this.zone.run(() => setFunction(directory[0]));
        }
      });
    })
    this.summaryResults = new ParseSummaryResults();
    return false;
  }


  async onSettingsSubmit() {
    if (this.loading)
      return;

    this.errorMessage = null;

    if (!this.fileSystem.directoryExists(this.settings.inputDirectory)) {
      this.errorMessage = 'Source Path does not exist'
      return;
    }
    if (!this.fileSystem.directoryExists(this.settings.outputDirectory)) {
      this.errorMessage = 'Output Path does not exist'
      return;
    }

    this.account = (await this.restSvc.getAccount()).Value;
    this.loading = true;
    this.filesToParse = new Array<any>();

    this.saveSettings();

    this.fileSystem.getFilesInDirectory(this.settings.inputDirectory).then((fileList) => {
      this.filesToParse = fileList;
      this.loading = false;
      this.submitted = true;
      this.totalFiles = fileList.length;
    });

    if (this.documentType == DocumentType.Resumes && !this.aimEnabled)
      this.costPerParse = 1;
    else
      this.costPerParse = 2;

    if (this.settings.geoCodeProvider != GeoCodeProvider.None && !this.settings.geoCodeKey)
      this.costPerParse += .5;
  }

  private saveSettings() {
    if (!this.settings.saveSettings) {
      if (this.documentType == DocumentType.Resumes)
        this.storageSvc.setBulkResumeParseSettings(new ParseSettings());
      else if (this.documentType == DocumentType.JobOrders)
        this.storageSvc.setBulkJobOrderParseSettings(new ParseSettings());

      return;
    }

    if (this.documentType == DocumentType.Resumes)
      this.storageSvc.setBulkResumeParseSettings(this.settings);
    else if (this.documentType == DocumentType.JobOrders)
      this.storageSvc.setBulkJobOrderParseSettings(this.settings);
  }


  async onStartParsing() {
    this.parsing = true;
    this.summaryResults = new ParseSummaryResults();
    this.cancellationToken = new CancelationToken();
    let result = await this.parseDocuments(this.filesToParse.slice(0), this.cancellationToken);
    this.parsing = false;
  }

  async parseDocuments(documents: string[], token: CancelationToken): Promise<void> {
    this.initializeOutputDirectories();
    this.appLogger = new AppLogger(this.settings.outputDirectory);
    let conn: IConnection;
    let docsToIndex = new Array<IndexRequest>();

    let startTime = Date.now();
    let interval = window.setInterval(() => {
      let delta = Date.now() - startTime;
      this.summaryResults.elapsedSeconds = Math.floor(delta / 1000)
    }, 1000);

    const results = [];
    while (!token.isCancelled() && documents.length > 0 && (conn = await this.pool.getConnection()) && conn) {
      let document = documents.pop();
      let documentFileName = document.replace(this.settings.inputDirectory.replace(/\//g,'/'),'').replace(/^\\/g, '').replace(/^\//g, '')
      let result = conn.parse(this.settings, document).then(async (response: ParseResponse) => {
        if (this.account.CreditsRemaining > response.Value.CreditsRemaining) //async causes this to jump around slightly
          this.account.CreditsRemaining = response.Value.CreditsRemaining;
        this.summaryResults.numParsedSuccessfully++;
        this.summaryResults.numParsed++;
        this.summaryResults.percentComplete = Math.round((this.summaryResults.numParsed * 100) / this.totalFiles);

        //have to query for pool size every 1,000 requests per TOS
        if (this.summaryResults.numParsed % 1000 == 0) {
          this.account = (await this.restSvc.getAccount()).Value;
          this.pool.poolSize = Math.min(10,this.account.MaximumConcurrentRequests);
        }

        this.pool.release(conn);
        this.appLogger.log(`${documentFileName} parsed successfully`);

        //send index request every 100
        if (this.settings.index) {
          let documentId = documentFileName.replace(/[^0-9a-zA-Z_-]/g, '_');
          docsToIndex.push(new IndexRequest(documentId, response.Value.ParsedDocument));
          if (this.summaryResults.numParsedSuccessfully % 100 == 0){
            this.indexDocuments(docsToIndex.splice(0, 100));
          }
        }


        //check for any other errors and log
        if (response.Value.GeocodeResponse && response.Value.GeocodeResponse.Code != 'Success' && response.Value.GeocodeResponse.Code != 'InsufficientData') {
          this.summaryResults.numGeocodingErrors++;
          this.appLogger.logGeocodeError(`${documentFileName}`, response.Value.GeocodeResponse);
        }
        if (response.Value.HtmlCode && response.Value.HtmlCode != 'ovIsProbablyValid') {
          this.summaryResults.numConversionErrors++;
          this.appLogger.logConversionError(`${documentFileName} failed to convert to html`, response.Value.HtmlCode);
        }
        if (response.Value.PdfCode && response.Value.PdfCode != 'ovIsProbablyValid') {
          this.summaryResults.numConversionErrors++;
          this.appLogger.logConversionError(`${documentFileName} failed to convert to pdf`, response.Value.PdfCode);
        }
        if (response.Value.RtfCode && response.Value.RtfCode != 'ovIsProbablyValid') {
          this.summaryResults.numConversionErrors++;
          this.appLogger.logConversionError(`${documentFileName} failed to convert to rtf`, response.Value.RtfCode);
        }

      }).catch((err: HttpErrorResponse) => {
        this.summaryResults.numParsed++;
        this.summaryResults.numParseErrors++;
        if (err.error && err.error.Info) {
          this.appLogger.logParseError(`${documentFileName}`, err.error.Info)
        }
        else if (err.error) {
          this.appLogger.logParseError(`${documentFileName}`, err.error)
        }
        else {
          this.appLogger.logParseError(`${documentFileName}`, err.message)
        }

        this.pool.release(conn);
      });
      results.push(result);
    }

    await Promise.all(results);

    //index remaining documents
    if (docsToIndex.length > 0)
      await this.indexDocuments(docsToIndex);

    window.clearInterval(interval);
  }

  async indexDocuments(requests: IndexRequest[]){
    this.restSvc.indexDocuments(requests, this.settings.index).then((response: IndexMultipleResponse) => {
      for (var i = 0; i < response.Value.length; i++){
        if (response.Value[i].Code != 'Success'){
          this.summaryResults.numIndexingErrors++;
          this.appLogger.logIndexError(`${response.Value[i].DocumentId}`, response.Value[i]);
        }
        else {
          this.summaryResults.numIndexed++;
          this.appLogger.log(`${response.Value[i].DocumentId} indexed successfully`);
        }
      }
    }).catch((err: HttpErrorResponse) => {
      this.summaryResults.numIndexingErrors = this.summaryResults.numIndexingErrors + requests.length;
      if (err.error && err.error.Info) {
        this.appLogger.logIndexError('Bulk Index Failed', err.error.Info)
      }
      else if (err.error) {
        this.appLogger.logIndexError('Bulk Index Failed', err.error)
      }
      else {
        this.appLogger.logIndexError('Bulk Index Failed', err.message)
      }
    });
  }

  openExternal(url: string) {
    this.electronSvc.shell.openExternal(url);
  }

  backToSettings() {
    if (this.parsing && !this.cancellationToken.isCancelled())
      this.cancellationToken.cancel();
    this.submitted = false;
  }


  async saveIndex() {
    if (this.indexSaving)
      return;

    this.indexSaving = true;
    let indexType = this.documentType == DocumentType.Resumes ? 'Resume' : 'Job';
    await this.restSvc.saveIndex(this.indexToSave, indexType);
    let newIndex = new Index();
    newIndex.OwnerId = this.loggedInAccount.accountId;
    newIndex.Name = this.indexToSave;
    newIndex.IndexType = indexType;
    this.indexes.push(newIndex)
    this.settings.index = newIndex.Name;
    this.indexSaving = false;
    this.showIndexModal = false;
  }

  initializeOutputDirectories() {
    this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'logs'));

    if (this.settings.outputFormat == OutputFormat.XML)
      this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'xml'));
    else
      this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'json'));

    if (this.settings.outputHtml)
      this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'html'));

    if (this.settings.outputPdf)
      this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'pdf'));

    if (this.settings.outputRtf)
      this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'rtf'));
  }
  


}










