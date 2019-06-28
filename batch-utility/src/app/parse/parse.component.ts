/****************************************************************************************************************************
 * This is a sample application designed by Sovren to comply with the Terms of Service (http://resumeparsing.com/TOS.htm)
 * and the Acceptable Use Policy (http://resumeparsing.com/AcceptableUse.htm).
 * 
 * The goal of this application is to maximize accuracy and throughput while staying within the requirements linked above.
 * Please read all comment blocks carefully to understand the process!!
 ****************************************************************************************************************************/

import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronService } from 'ngx-electron';
import { DocumentType, GeoCodeProvider, ParseSettings } from '../models/parse-settings';
import { Account } from '../models/responses/get-account';
import { Index } from '../models/responses/get-indexes';
import { JobParserConnection, ResumeParserConnection } from '../resources/parser-connection';
import { CancelationToken, ResourcePool } from '../resources/resource-pool';
import { FileSystem } from '../utilities/filesystem';
import { AppLogger } from '../utilities/logger';
import { StorageHelper } from '../utilities/storage';
import { AccountUser } from './../models/account-user';
import { KnownType, OutputFormat } from './../models/parse-settings';
import { ParseSummaryResults } from './../models/parse-summary-results';
import { IndexRequest } from './../models/requests/multiple-index';
import { IndexMultipleResponse } from './../models/responses/multiple-index';
import { ParseResponse } from './../models/responses/parse';
import { IConnection } from './../resources/connection-interface';
import { RestService } from './../services/rest.service';
import { DocToParse } from '../models/doc-to-parse';


const path = (<any>window).require('path');
const readlines = (<any>window).require('n-readlines');


@Component({
  selector: 'parse',
  templateUrl: './parse.component.html',
  styleUrls: ['./parse.component.scss']
})


export class ParseComponent implements OnInit {
  @Input() documentType: DocumentType;

  /****************************************************************************************************************************
   * We declare all our component scoped variables here. Descriptions of each variable and its use are in comments below 
   ****************************************************************************************************************************/
  loggedInAccount: AccountUser; //accountId and service key. used to filter indexes
  account: Account = new Account(); //contains MaximumConcurrentRequests and CreditsRemaining
  settings: ParseSettings = new ParseSettings(); //settings to be sent to api with each parse request


  aimEnabled: boolean = false;  //this is true if your account has AIM enabled. Used to calculate credits and show indexes dropdown
  errorMessage: string; //used to hold any error message to be displayed on the screen

  appLogger: AppLogger; //handles logging and directory setup


  //display variables
  configuring: boolean = false;
  loading: boolean = false; //a value of true will show a loading icon when counting files in the source directory
  parsing: boolean = false; //a value of true will make the parsing progress bar visible
  //submitted: boolean = false; //a value of true will show the summary page
  currentStep: number = 1;

  //index variables
  showIndexModal: boolean = false; //a value of true will show the modal to create new index
  indexToSave: string; //name of index to create
  indexSaving: boolean = false; //a value of true will show a loading icon while saving the index

  //dropdowns
  geoCodeProviders = GeoCodeProvider; //enum that handles values in geocoding dropdown
  knownTypes = KnownType; //enum that handles values in known types dropdown
  outputFormats = OutputFormat; //enum that handles values for output checkboxes
  normalizations: string[] = new Array<string>(); //holds lists of all users normalization lists
  skills: string[] = new Array<string>(); //holds lists of all users skills lists
  indexes: Index[] = new Array<Index>(); //holds lists of all users indexes

  //parsing summary page and results
  filesToParse: DocToParse[] = new Array<DocToParse>(); //all files to be parsed
  totalFiles: number = 0; //count of documents to be parsed. shown on summary page
  pool: ResourcePool; //handles async requests and pooling
  costPerParse: number = 1; //default cost for resume parsing
  cancellationToken: CancelationToken = new CancelationToken(); //cancels parsing
  summaryResults: ParseSummaryResults = new ParseSummaryResults(); //successes, errors, num parsed, etc.
  showParseResultsModal: boolean = false;


  docsToIndex: IndexRequest[] = new Array<IndexRequest>();
  maxParseAttempts: number = 2;
  currentlyIndexing: boolean = false;

  constructor(private router: Router, private storageSvc: StorageHelper, private fileSystem: FileSystem,
    private restSvc: RestService, public electronSvc: ElectronService, private zone: NgZone) {  }

  async ngOnInit() {
    this.configuring = true;
    this.loggedInAccount = this.storageSvc.getLocalLoginInfo();

    /****************************************************************************************************************************
     * The /skills endpoint returns us a list of all skills.
     * Because the parser automatically detects language and looks for a corresponding skills list in that language,
     * we only show the unique name values
     ****************************************************************************************************************************/
    this.skills = (await this.restSvc.getSkills()).Value.map(skill => skill.Name);
    this.skills = this.skills.filter((value, index, self) => { return self.indexOf(value) === index });


    /****************************************************************************************************************************
     * The /normalizations endpoint returns us a list of all normalizations.
     * Because the parser automatically detects language and looks for a corresponding skills list in that language,
     * we only show the unique name values
     ****************************************************************************************************************************/
    this.normalizations = (await this.restSvc.getNormalizations()).Value.map(normalization => normalization.Name);
    this.normalizations = this.normalizations.filter((value, index, self) => { return self.indexOf(value) === index });

    /****************************************************************************************************************************
     * We can check if AIM is enabled by calling the /index endpoint
     * If this call fails, then AIM is not enabled
     ****************************************************************************************************************************/
    try {
      await this.getIndexes();
      this.aimEnabled = true;
    }
    catch (ex) {
      this.aimEnabled = false;
    }

    /****************************************************************************************************************************
     * We call the /Account endpoint here to get the MaximumConcurrentRequests. 
     * This allows us to process as many documents as possible in order to maximize speed
     * 
     * ResourcePool is a custom class that enables us to control the number of threads active at any given time
     ****************************************************************************************************************************/
    this.account = (await this.restSvc.getAccount()).Value;
    if (this.documentType == DocumentType.Resumes)
      this.pool = new ResourcePool(this.restSvc, this.account.MaximumConcurrentRequests, ResumeParserConnection);
    else if (this.documentType == DocumentType.JobOrders)
      this.pool = new ResourcePool(this.restSvc, this.account.MaximumConcurrentRequests, JobParserConnection);


    /****************************************************************************************************************************
     * Job order parsing always costs 2 credits. 
     * Resume parsing costs 1 credit for non-AIM accounts, otherwise it costs 2 credits.
     * 
     * Note: Changing this here won't affect the cost of the parsing transactions. It is for display purposes only
     ****************************************************************************************************************************/
    if (this.documentType == DocumentType.Resumes && !this.aimEnabled)
      this.costPerParse = 1;
    else
      this.costPerParse = 2;


    this.configuring = false;
  }

  async getIndexes() {
    let indexes = await this.restSvc.getIndexes();
    /****************************************************************************************************************************
    * The /index endpoint will return all indexes for an account, including public indexes.
    * We filter out the public indexes and those not for the type we are parsing so they can't be used.
    ****************************************************************************************************************************/
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
    return false;
  }

  async onInputDirectorySelected() {
    if (this.loading)
      return;

    this.errorMessage = null;

    if (!this.fileSystem.directoryExists(this.settings.inputDirectory)) {
      this.errorMessage = 'This path does not exist'
      return;
    }

    this.account = (await this.restSvc.getAccount()).Value;
    this.loading = true;
    this.filesToParse = new Array<any>();
    this.summaryResults = new ParseSummaryResults(); 

    /****************************************************************************************************************************
     * This method will iterate through all files in the directory and each of it's subdirectories
     * We store the result in the filesToParse array to be used later
     ****************************************************************************************************************************/
    this.fileSystem.getFilesInDirectory(this.settings.inputDirectory).then(async (fileList) => {
      await this.removeAlreadyParsedFilesFromList(this.settings.outputDirectory, fileList);

      this.filesToParse = fileList;
      this.loading = false;

      this.totalFiles = fileList.length;
      if ((this.totalFiles * this.costPerParse) > this.account.CreditsRemaining) {
        this.errorMessage = `Sorry, your account does not have enough credits to parse ${this.totalFiles.toLocaleString()} documents`;
      } else if (this.totalFiles == 0) {
        this.errorMessage = `There are no documents to parse in the selected input directory`;
      } else {
        this.currentStep = 2;
      }
    });

  }

  async removeAlreadyParsedFilesFromList(outputDirectory: string, fileList: DocToParse[]): Promise<void> {
    // Check if the output directory has been used for a previous parse.
    // If so, exclude all the documents that have already been parsed
    const logPath = path.join(outputDirectory, 'logs');


    if (!this.fileSystem.directoryExists(logPath)) {
      return;
    }
    
    const allLogs = await this.fileSystem.getFilesInDirectory(logPath);
    const successLogs = allLogs.filter(l => l.docName.indexOf('-logs') >= 0);

    for (let i = 0; i < successLogs.length; i++) {
      const liner = new readlines(successLogs[i].docName);
      let nextLine;
      while (nextLine = liner.next()) {
        const line = nextLine.toString();
        if (line.indexOf(') parsed successfully') >= 0) {
            const lineSplitBySpaces = line.split(': ')[1].split(' ');
            lineSplitBySpaces.splice(-3); // remove last 3 values - they don't contain the filename
            const fileName = lineSplitBySpaces.join(' '); // rejoin remaining values.
            const index = fileList.findIndex(f => f.docName.indexOf(`${this.settings.inputDirectory}\\${fileName}`) >= 0);
            if (index >= 0) {
              fileList.splice(index, 1);
            }
        }
      }
    }
  }

  async checkOutputDirectory() {
    this.errorMessage = null;

    if (!this.fileSystem.directoryExists(this.settings.outputDirectory)) {
      this.errorMessage = 'The output path does not exist'
      return;
    }

    if (this.settings.outputDirectory == this.settings.inputDirectory) {
      this.errorMessage = 'Please select an output path that is different from the input path'
      return;
    }

    this.currentStep = 8;
  }


  async onStartParsing() {
    this.parsing = true;
    this.cancellationToken = new CancelationToken(); //reset cancellation token
    this.showParseResultsModal = false;
    let result = await this.parseDocuments(this.filesToParse.slice(0), this.cancellationToken);
    this.parsing = false;
    document.body.style.cursor = 'default';
  }

  async parseDocuments(documents: DocToParse[], token: CancelationToken): Promise<void> {
    this.initializeOutputDirectories(); //create all required output folders 
    this.appLogger = new AppLogger(this.settings.outputDirectory);
    let conn: IConnection;
    this.docsToIndex = new Array<IndexRequest>();

    //start a timer to track the elapsed time and calculate docs/sec
    let startTime = Date.now();
    let startingSeconds = this.summaryResults.elapsedSeconds;
    let interval = window.setInterval(() => {
      let delta = Date.now() - startTime;
      this.summaryResults.elapsedSeconds = startingSeconds + Math.floor(delta / 1000)
    }, 1000);

    const results = [];

    /****************************************************************************************************************************
     * The number of threads is based on your account's MaximumConcurrentRequests.
     * 
     * Per the Acceptable Use Policy (https://docs.sovren.com/Policies/AcceptableUse), once you have submitted 
     * the Maximum Allowable Number of Concurrent Batch Transactions to the Service ("the current transactions"), 
     * an additional Batch Transaction, whether from the same process or any other batch process submitting with your credentials, 
     * may be submitted only when, and as, the Service has returned the results of its processing of one of the submitted transactions.
     * 
     * We handle this using the getConnection() method on our ResourcePool. 
     * It will wait until a thread is available before continuing with any parsing.
     * 
     * We have also implemented a cancellation token here to allow the user to stop parsing early if desired.
     ****************************************************************************************************************************/
    while (!token.isCancelled() && documents.length > 0 && (conn = await this.pool.getConnection()) && conn) {
      let documentToParse = documents.shift();
      let document = documentToParse.docName;

      /* We get filename from the full path so we can use it in our logs. Windows and Linux use different slashes so we have consider both */
      let documentFileName = document.replace(this.settings.inputDirectory.replace(/\//g, '/'), '').replace(/^\\/g, '').replace(/^\//g, '');
      /****************************************************************************************************************************
       * When indexing, the documentID MUST only contain letters, numbers, underscores, and dashes. And it must be unique.
       * We just use a GUID
      ****************************************************************************************************************************/
      let documentId = Guid.newGuid();
      //we save all files with a guid to make sure they are unique. a mapping file is created to map the source to the output
      this.appLogger.logMap(documentFileName, documentId);
      let result = conn.parse(this.settings, document, documentId).then(async (response: ParseResponse) => {
        if (this.account.CreditsRemaining > response.Value.CreditsRemaining) //async causes this to jump around slightly. just show the lowest value for display purposes
          this.account.CreditsRemaining = response.Value.CreditsRemaining;

        this.summaryResults.numParsedSuccessfully++;
        this.summaryResults.numParsed++;
        this.summaryResults.percentComplete = Math.floor((this.summaryResults.numParsed * 100) / this.totalFiles); //round down so the progress bar doesn't finish early

        /****************************************************************************************************************************
         * We MUST query for MaximumConcurrentRequests every 1,000 requests per the Acceptable Use Policy (https://docs.sovren.com/Policies/AcceptableUse).
         * 
         * Note: Calling GetAccountInfo this often is ONLY acceptable in conjunction with Batch Transactions like in this application.
         ****************************************************************************************************************************/
        if (this.summaryResults.numParsed % 1000 == 0) {
          this.account = (await this.restSvc.getAccount()).Value;
          this.pool.poolSize = this.account.MaximumConcurrentRequests;
        }

        /****************************************************************************************************************************
         * We can release the thread as soon as the parsing is finished. Then we continue additional processing and logging.
         * This allows us start another parsing transaction as soon as possible to maximize speed.
         ****************************************************************************************************************************/
        this.pool.release(conn);
        this.appLogger.log(`${documentFileName} (${documentId}) parsed successfully`);

        if (this.settings.index) {
          /****************************************************************************************************************************
           * When indexing, the documentID MUST only contain letters, numbers, underscores, and dashes.
           * We strip out any other characters here and replace them with an underscore.
           ****************************************************************************************************************************/
          this.docsToIndex.push(new IndexRequest(documentId, response.Value.ParsedDocument));

          /****************************************************************************************************************************
           * We index documents in batches of 50. Bigger batches will sometimes cause the payload to be too big and return a 404 error
           * Only let one index request be occuring at a time
           ****************************************************************************************************************************/
          if (this.docsToIndex.length > 50 && !this.currentlyIndexing) {
            this.indexDocuments(this.docsToIndex.splice(0, 50));
          }
        }


        /****************************************************************************************************************************
         * If the parsed document came back succesfully, there might still be other errors, 
         * such as with geocoding or document conversion. We log those errors, but continue processing anyway
         * 
         * If you want to stop the parsing when an error occurs, you can use this.cancellationToken.cancel()
         ****************************************************************************************************************************/
        if (response.Value.GeocodeResponse && response.Value.GeocodeResponse.Code != 'Success' && response.Value.GeocodeResponse.Code != 'InsufficientData') {
          this.summaryResults.numGeocodingErrors++;
          this.appLogger.logGeocodeError(`${documentFileName} (${documentId})`, response.Value.GeocodeResponse);
        }
        if (response.Value.HtmlCode && response.Value.HtmlCode != 'ovIsProbablyValid') {
          this.summaryResults.numConversionErrors++;
          this.appLogger.logConversionError(`${documentFileName} (${documentId}) failed to convert to html`, response.Value.HtmlCode);
        }
        if (response.Value.PdfCode && response.Value.PdfCode != 'ovIsProbablyValid') {
          this.summaryResults.numConversionErrors++;
          this.appLogger.logConversionError(`${documentFileName} (${documentId}) failed to convert to pdf`, response.Value.PdfCode);
        }
        if (response.Value.RtfCode && response.Value.RtfCode != 'ovIsProbablyValid') {
          this.summaryResults.numConversionErrors++;
          this.appLogger.logConversionError(`${documentFileName} (${documentId}) failed to convert to rtf`, response.Value.RtfCode);
        }

      }).catch((err: HttpErrorResponse) => {
        /****************************************************************************************************************************
         * An error here means the whole parse failed and there was a more critical error.
         * No file will be saved to the output directory.
         * 
         * We continue processing anyway, if you want to stop the parsing when an error occurs, you can use this.cancellationToken.cancel()
         ****************************************************************************************************************************/
        this.summaryResults.numParsed++;
        this.summaryResults.numParseErrors++;
        this.summaryResults.percentComplete = Math.floor((this.summaryResults.numParsed * 100) / this.totalFiles); //round down so the progress bar doesn't finish early

        if (err.error && err.error.Info) {
          this.appLogger.logParseError(`${documentFileName} (${documentId})`, err.error.Info);
          /****************************************************************************************************************************
           * Per the Acceptable Use Policy (https://docs.sovren.com/Policies/AcceptableUse), YOU MAY NOT re-submit a document to the service if
           * (1) A prior processed transaction of that document contained a return code from the Service indicating that the document was corrupt 
           * or of an unsupported type or (2) the document text field in the response was empty
           * 
           * The error messages we check for here will cover these scenarios.
           * If one of them occurs, we move the file to a 'FAILED AND DO NOT RESUBMIT' directory in the source directory.
           * Future parses will ignore any files in this directory.
           * 
           * If a document returns one of these errors and you believe it shouldn't, please reach out to Sovren Support at support@sovren.com
           ****************************************************************************************************************************/
          if (err.error.Info.Code === "ConversionException") {
            this.moveToDoNotProcessDirectory(document, documentFileName);
          }

        }
        else if (err.error) {
          /****************************************************************************************************************************
           * We get an error of type ProgressEvent if there is a network error
           ****************************************************************************************************************************/
          if (err.error instanceof ProgressEvent) {
            if (documentToParse.size >= 6000000) {
              this.appLogger.logParseError(`${documentFileName} (${documentId})`, 'Parse failed. Document cannot be larger than 6MB');
            } else {

              
              if (documentToParse.attemps < this.maxParseAttempts) {
                // dont count this document and try it again
                this.summaryResults.numParsed--;
                this.summaryResults.numParseErrors--;
                documents.push(new DocToParse(documentToParse.docName, documentToParse.size, documentToParse.attemps + 1));
              } else {
                this.appLogger.logNetworkError(`${documentFileName} (${documentId})`, 'Parse failed. Could not connect to the server. Your network connection may be down.');
              }
            }

          } else {
            this.appLogger.logParseError(`${documentFileName} (${documentId})`, err.error);
          }
        } else {
          this.appLogger.logParseError(`${documentFileName} (${documentId})`, err.message);
        }

        /****************************************************************************************************************************
         * Per the Acceptable Use Policy (https://docs.sovren.com/Policies/AcceptableUse), YOU MAY NOT re-submit a document to the service if
         * (3) the transaction returned an exception which included this phrase: " System.Net.WebException: The underlying connection was closed"
         * 
         * If this error occurs, we move the file to a 'FAILED AND DO NOT RESUBMIT' directory in the source directory.
         * Future parses will ignore any files in this directory.
         ****************************************************************************************************************************/
        if (err.message.indexOf('The underlying connection was closed') >= 0)
          this.moveToDoNotProcessDirectory(document, documentFileName);

        this.pool.release(conn);
      });
      results.push(result);
    }

    document.body.style.cursor = 'wait';
    //wait for the last few connections to finish
    await Promise.all(results);

    //index remaining documents
    while (this.docsToIndex.length > 0) { 
        let indexDocuments = this.docsToIndex.splice(0, 50);
        await this.indexDocuments(indexDocuments); 
    } 

    //stop the timer
    window.clearInterval(interval);

    // If transaction was cancelled, set files to parse to only remaining docs so it can be restarted
    if (this.cancellationToken.isCancelled()) { 
        this.filesToParse = documents.slice(0);
    } else { //parsing finished
        this.showParseResultsModal = true;
    }
  }

  moveToDoNotProcessDirectory(fullPath: string, fileName: string) {
    var doNotProcessDirectory = path.join(this.settings.inputDirectory, 'FAILED AND DO NOT RESUBMIT');
    this.fileSystem.ensureDirectoryExistence(path.join(doNotProcessDirectory, fileName));
    this.fileSystem.moveFile(fullPath, path.join(doNotProcessDirectory, fileName));
  }

  async indexDocuments(requests: IndexRequest[]) {
    return new Promise<ParseResponse>((resolve, reject) => {
      this.currentlyIndexing = true;
      this.restSvc.indexDocuments(requests, this.settings.index).then((response: IndexMultipleResponse) => {
        /****************************************************************************************************************************
         * We check the result of each index transaction. Some may have had errors that we want to log
         ****************************************************************************************************************************/
        for (var i = 0; i < response.Value.length; i++) {
          if (response.Value[i].Code != 'Success') {
            this.summaryResults.numIndexingErrors++;
            this.appLogger.logIndexError(`${response.Value[i].DocumentId}`, response.Value[i]);
          }
          else {
            this.summaryResults.numIndexed++;
            this.appLogger.log(`${response.Value[i].DocumentId} indexed successfully`);
          }
        }
        this.currentlyIndexing = false;
        resolve();
      }).catch((err: HttpErrorResponse) => {
        /****************************************************************************************************************************
         * An error here means the entire batch failed. Likely the payload was too big
         ****************************************************************************************************************************/
        this.summaryResults.numIndexingErrors = this.summaryResults.numIndexingErrors + requests.length;
        if (err.error && err.error.Info) {
          this.appLogger.logIndexError('Bulk Index Failed', err.error.Info)
        }
        else if (err.error) {
          if (err.error instanceof ProgressEvent)
            this.appLogger.logParseError('Bulk Index Failed. Request size is too big');
          else
            this.appLogger.logIndexError('Bulk Index Failed', err.error)
        }
        else {
          this.appLogger.logIndexError('Bulk Index Failed', err.message)
        }
        this.currentlyIndexing = false;
        reject(err);
      });
    });
  }

  // This function will open a url in the user's browser
  openExternal(url: string) {
    this.electronSvc.shell.openExternal(url);
  }

  // This function runs when the back button is clicked. 
  // It will cancel the ongoing parsing job
  backToSettings() {
    this.currentStep = 7;
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
    this.settings.index = newIndex.Name; //Set the index in the dropdown to use to the newly created one
    this.indexSaving = false;
    this.showIndexModal = false;
  }


  /****************************************************************************************************************************
   * Logs, xml, json, and each type of conversion are saved to different folders
   ****************************************************************************************************************************/
  initializeOutputDirectories() {
    this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'logs'));

    /****************************************************************************************************************************
     * Parsed resumes return a ScrubbedParsedDocument that has all PII stripped out. We save it to a different folder
     ****************************************************************************************************************************/
    if (this.documentType == DocumentType.Resumes)
      this.fileSystem.makeDirIfNotExists(path.join(this.settings.outputDirectory, 'scrubbed'));

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

class Guid {
  static newGuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
      });
  }
}










