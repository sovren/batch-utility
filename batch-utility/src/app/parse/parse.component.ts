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


  loggedInAccount: AccountUser; //accountId and service key
  account: Account = new Account();
  settings: ParseSettings = new ParseSettings(); //setting to be sent to api with parsing request
  loading: boolean = false; //shows loading icon when counting files in output directory
  parsing: boolean = false; //used to show the progress bar
  submitted: boolean = false; //shows summary page
  aimEnabled: boolean = false;  //calculates credits and shows index dropdown
  errorMessage: string;

  appLogger: AppLogger; //handles logging and directory setup

  //index
  showIndexModal: boolean = false; //shows modal to create new index
  indexToSave: string; 
  indexSaving: boolean = false;

  //selects
  geoCodeProviders = GeoCodeProvider; 
  outputFormats = OutputFormat;
  normalizations: KeyValuePair[] = new Array<KeyValuePair>();
  skills: KeyValuePair[] = new Array<KeyValuePair>();
  indexes: Index[] = new Array<Index>();

  //parsing summary page and results
  filesToParse: string[] = new Array<string>(); //all files to be parsed
  totalFiles: number = 0; //count of documents to be parsed
  pool: ResourcePool; //handles async requests and pooling
  costPerParse: number = 1; //default cost for resume parsing
  cancellationToken: CancelationToken = new CancelationToken(); //cancels parsing
  summaryResults: ParseSummaryResults = new ParseSummaryResults(); //successes, errors, etc.




  constructor(private router: Router, private storageSvc: StorageHelper, private fileSystem: FileSystem,
    private restSvc: RestService, public electronSvc: ElectronService, private zone: NgZone) { }

  async ngOnInit() {
    this.loggedInAccount = this.storageSvc.getLocalLoginInfo();
    this.account = (await this.restSvc.getAccount()).Value; // get account so we know how many concurrent requests you can use

    this.skills = (await this.restSvc.getSkills()).Value; //gets available skill lists
    this.normalizations = (await this.restSvc.getNormalizations()).Value; //gets available normalizations lists

    try {
      this.getIndexes(); //gets available indexes for matching
      this.aimEnabled = true;
    }
    catch (ex) { //if this call fails, then AIM is not enabled
      this.aimEnabled = false;
    }

    if (this.documentType == DocumentType.Resumes) {
      this.settings = this.storageSvc.getBulkResumeParseSettings(); //settings can be saved on local machine
      this.pool = new ResourcePool(this.restSvc, this.account.MaximumConcurrentRequests, ResumeParserConnection);
    }
    else if (this.documentType == DocumentType.JobOrders) {
      this.settings = this.storageSvc.getBulkJobOrderParseSettings() //settings can be saved on local machine
      this.pool = new ResourcePool(this.restSvc, this.account.MaximumConcurrentRequests, JobParserConnection);
    }
  }

  async getIndexes() {
    let indexes = await this.restSvc.getIndexes(); //gets available indexes for matching
    this.indexes = indexes.Value //filter out 'public' indexes or indexes that aren't for the type of document you are trying to match
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

    //iterate through all files and subfolders in output directory
    this.fileSystem.getFilesInDirectory(this.settings.inputDirectory).then((fileList) => { 
      this.filesToParse = fileList;
      this.loading = false;
      this.submitted = true;
      this.totalFiles = fileList.length;
    });

    //job order parsing always costs 2 credits. If AIM is disabled, resume parsing costs 1 credit, otherwise 2
    //note: changing this here won't actually affect the cost of the parsing transactions. it is for display purposes only
    if (this.documentType == DocumentType.Resumes && !this.aimEnabled) 
      this.costPerParse = 1;
    else
      this.costPerParse = 2;

    //using geocoding without providing your own key costs an extra .5 credit per parse
    if (this.settings.geoCodeProvider != GeoCodeProvider.None && !this.settings.geoCodeKey)
      this.costPerParse += .5;
  }

  private saveSettings() { //can save settings to be used next time the app loads
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
    this.summaryResults = new ParseSummaryResults(); //reset summary results if they aren't already
    this.cancellationToken = new CancelationToken(); //reset cancellation token
    let result = await this.parseDocuments(this.filesToParse.slice(0), this.cancellationToken);
    this.parsing = false;
  }

  async parseDocuments(documents: string[], token: CancelationToken): Promise<void> {
    this.initializeOutputDirectories(); //create all required output folders 
    this.appLogger = new AppLogger(this.settings.outputDirectory);
    let conn: IConnection;
    let docsToIndex = new Array<IndexRequest>();

    //start a timer to track the elapsed time and calculate docs/sec
    let startTime = Date.now();
    let interval = window.setInterval(() => {
      let delta = Date.now() - startTime;
      this.summaryResults.elapsedSeconds = Math.floor(delta / 1000)
    }, 1000);

    const results = [];

    //wait for a connection to be available before sending another parse request
    //connections are based on your account's MaximumConcurrentRequests
    //check cancellation token before each request
    while (!token.isCancelled() && documents.length > 0 && (conn = await this.pool.getConnection()) && conn) {
      let document = documents.pop();
      //get filename from the full path. windows and linux use different slashes so we have to cover both
      let documentFileName = document.replace(this.settings.inputDirectory.replace(/\//g,'/'),'').replace(/^\\/g, '').replace(/^\//g, '')
      let result = conn.parse(this.settings, document).then(async (response: ParseResponse) => {
        if (this.account.CreditsRemaining > response.Value.CreditsRemaining) //async causes this to jump around slightly. just show the lowest value for display purposes
          this.account.CreditsRemaining = response.Value.CreditsRemaining;
        this.summaryResults.numParsedSuccessfully++;
        this.summaryResults.numParsed++;
        this.summaryResults.percentComplete = Math.floor((this.summaryResults.numParsed * 100) / this.totalFiles); //round down so the progress bar doesn't finish early

        //MUST query for MaximumConcurrentRequests every 1,000 requests per the Acceptable Use Policy
        if (this.summaryResults.numParsed % 1000 == 0) {
          //per the Acceptable Use Policy calling GetAccountInfo is ONLY acceptable in conjunction with Batch Transactions like in this app
          this.account = (await this.restSvc.getAccount()).Value;
          this.pool.poolSize = Math.min(10,this.account.MaximumConcurrentRequests);
        }

        //after it's done parsing, the connection can be released so it can be used for another parsing transaction while we continue with further processing
        this.pool.release(conn);
        this.appLogger.log(`${documentFileName} parsed successfully`);

        //During batch transactions, index separately from parsing
        if (this.settings.index) {
          //documentID MUST only contain letters, numbers, underscores, and dashes
          let documentId = documentFileName.replace(/[^0-9a-zA-Z_-]/g, '_');
          docsToIndex.push(new IndexRequest(documentId, response.Value.ParsedDocument));

          //index documents in batches of 50. Bigger will sometimes cause the payload to be too big and return a 404
          if (this.summaryResults.numParsedSuccessfully % 50 == 0){ 
            this.indexDocuments(docsToIndex.splice(0, 50));
          }
        }


        //If parsed document came back succesfully, there might still be other errors, such as with geocoding or conversion
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

      }).catch((err: HttpErrorResponse) => { //an error here means the whole parse failed. no file will be saved to output directory
        this.summaryResults.numParsed++;
        this.summaryResults.numParseErrors++;
        if (err.error && err.error.Info) {
          this.appLogger.logParseError(`${documentFileName}`, err.error.Info);
          //Per the Acceptable Use Policy, do not resubmit any document that contained a return code from the Service indicating that the document was corrupt 
          //or of an unsupported type, or the document text field in the response was empty
          if (err.error.Info.Message.indexOf('Missing FileBytes parameter in your request') >= 0 ||
            err.error.Info.Message.indexOf('ovNoText') >= 0) {
              this.moveToDoNotProcessDirectory(document, documentFileName);
            }

        }
        else if (err.error) {
          this.appLogger.logParseError(`${documentFileName}`, err.error);
        }
        else {
          this.appLogger.logParseError(`${documentFileName}`, err.message);
        }

        //Per the Acceptable Use Policy, do not resubmit any document that returned an exception 
        //which included this phrase: "System.Net.WebException: The underlying connection was closed".
        if (err.message.indexOf('The underlying connection was closed') >= 0)
          this.moveToDoNotProcessDirectory(document, documentFileName);

        this.pool.release(conn);
      });
      results.push(result);
    }

    //wait for the last few connections to finish
    await Promise.all(results); 

    //index remaining documents
    if (docsToIndex.length > 0)
      await this.indexDocuments(docsToIndex);

    //stop the timer
    window.clearInterval(interval);
  }

  moveToDoNotProcessDirectory(fullPath:string, fileName:string){
    var doNotProcessDirectory = path.join(this.settings.inputDirectory, 'FAILED AND DO NOT RESUBMIT');
    this.fileSystem.makeDirIfNotExists(doNotProcessDirectory);
    this.fileSystem.moveFile(fullPath, path.join(doNotProcessDirectory, fileName));
  }

  async indexDocuments(requests: IndexRequest[]){
    this.restSvc.indexDocuments(requests, this.settings.index).then((response: IndexMultipleResponse) => {
       //check the result of each index. some may have had errors
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
    }).catch((err: HttpErrorResponse) => { //error here means the entire batch failed. Likely the payload was too big
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

  openExternal(url: string) { //opens url in user's browser
    this.electronSvc.shell.openExternal(url);
  }

  backToSettings() { //when back button is clicked, cancel the ongoing parsing job
    if (this.parsing && !this.cancellationToken.isCancelled())
      this.cancellationToken.cancel();
      
    this.summaryResults = new ParseSummaryResults();
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
    this.indexes.push(newIndex);
    this.settings.index = newIndex.Name; //set the index to be used to the newly created one
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










