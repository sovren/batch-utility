
import { IConnection } from './connection-interface';
import { RestService } from "../services/rest.service";
import { ParseSettings, GeoCodeProvider, OutputFormat } from "../models/parse-settings";
import { ParseResponse } from "../models/responses/parse";
import { ParseResumeRequest } from "../models/requests/parse-resume";
import * as moment from 'moment';
import { ParseJobRequest, Configuration } from '../models/requests/parse-job';
import { BaseRequest, GeocodeOptions, IndexingOptions } from '../models/requests/base-request-info';

const fs = (<any>window).require('fs');
const path = (<any>window).require('path');



export class ResumeParserConnection implements IConnection {
    constructor(private restSvc: RestService) {
    }

    async parse(settings: ParseSettings, filePath: string): Promise<ParseResponse> {
        return new Promise<ParseResponse>((resolve, reject) => {
            let request = setupCommonFields(settings, filePath);
            
            let resumeParseRequest = request as ParseResumeRequest;
            if (settings.configurationString)
                resumeParseRequest.Configuration = settings.configurationString;

            this.restSvc.parseResume(resumeParseRequest).then((response: ParseResponse) => {
                handleParseResponse(response, settings, filePath)
                resolve(response);
            }).catch((e) => {
                console.log(e);
                reject(e);
            });
        });

    }

}



export class JobParserConnection implements IConnection {
    constructor(private restSvc: RestService) {
    }

    async parse(settings: ParseSettings, filePath: string): Promise<ParseResponse> {
        return new Promise<ParseResponse>((resolve, reject) => {
            let request = setupCommonFields(settings, filePath);

            let jobParseRequest = request as ParseJobRequest;
            if (settings.countryCode || settings.language || settings.knownType || settings.includeRecruitingTerms || settings.includeSupplementalText || settings.preferShorterJobTitles) {
                jobParseRequest.Configuration = new Configuration();
                jobParseRequest.Configuration.CountryCode = settings.countryCode;
                jobParseRequest.Configuration.Language = settings.language;
                jobParseRequest.Configuration.IncludeRecruitingTerms = settings.includeRecruitingTerms;
                jobParseRequest.Configuration.IncludeSupplementalText = settings.includeSupplementalText;
                jobParseRequest.Configuration.PreferShorterJobTitles = settings.preferShorterJobTitles;
            }

            this.restSvc.parseJob(jobParseRequest).then((response: ParseResponse) => {
                handleParseResponse(response, settings, filePath)
                resolve(response);
            }).catch((e) => {
                reject(e);
            });
        });

    }

}

function setupCommonFields(settings: ParseSettings, filePath: string): BaseRequest {
    
    let request = new BaseRequest();

    request.DocumentAsBase64String = getBase64(filePath);
    request.OutputFormat = settings.outputFormat;
    if (settings.geoCodeProvider != null && settings.geoCodeProvider != GeoCodeProvider.None) {
        request.GeocodeOptions = new GeocodeOptions();
        request.GeocodeOptions.IncludeGeocoding = true;
        request.GeocodeOptions.Provider = GeoCodeProvider[settings.geoCodeProvider];
        if (settings.geoCodeKey)
            request.GeocodeOptions.ProviderKey = settings.geoCodeKey;
    }
    if (settings.outputHtml)
        request.OutputHtml = settings.outputHtml;
    if (settings.outputPdf)
        request.OutputPdf = settings.outputPdf;
    if (settings.outputRtf)
        request.OutputRtf = settings.outputRtf;
    let stats = fs.statSync(filePath);
    request.RevisionDate = moment(stats.mtime).format("YYYY-MM-DD");
    if (settings.skills)
        request.SkillsData = settings.skills;
    if (settings.normalizations)
        request.NormalizerData = settings.normalizations;
    if (settings.index) {
        request.IndexingOptions = new IndexingOptions();
        request.IndexingOptions.IndexId = settings.index;

        //make sure we get the right file name
        let fileName = getStrippedFileName(filePath, settings.inputDirectory);
        request.IndexingOptions.DocumentId = fileName;
    }
    return request;
}

function getStrippedFileName(filePath: string, inputDirectory: string) : string {
    return filePath.replace(inputDirectory.replace(/\//g,'/'),'').replace(/^\\/g, '').replace(/^\//g, '').replace(/[^0-9a-zA-Z_-]/g, '_')
}


function getBase64(file: string): string {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
}

function handleParseResponse(response: ParseResponse, settings: ParseSettings, fullInputPath: string){
    //let fileName = '';
    //if (settings.keepFolderStructure){
        let fileName = fullInputPath.replace(settings.inputDirectory.replace(/\//g,'/'),'');

    //}
    //else
        //fileName = getStrippedFileName(fullInputPath, settings.inputDirectory);
    
    if (settings.outputFormat == OutputFormat.XML) {
        writeFile('xml', response.Value.ParsedDocument);
    }
    else {
        writeFile('json', response.Value.ParsedDocument);
    }

    if (settings.outputHtml && response.Value.Html) {
        writeFile('html', response.Value.Html);
    }
    if (settings.outputPdf && response.Value.Pdf) {
        writeFile('pdf', response.Value.Pdf);
    }
    if (settings.outputRtf && response.Value.Rtf) {
        writeFile('rtf', response.Value.Rtf);
    }

    function writeFile(fileType: string, document: string){
        let fullOutputPath = `${path.join(settings.outputDirectory, fileType)}/${fileName}.${fileType}`;
        //if (settings.keepFolderStructure)
            ensureDirectoryExistence(fullOutputPath);
        
        if (fileType == 'pdf')
            fs.writeFileSync(fullOutputPath, document, 'base64');
        else
            fs.writeFileSync(fullOutputPath, document, 'utf8');
    }
}



function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }


