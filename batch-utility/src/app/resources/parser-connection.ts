/****************************************************************************************************************************
 * This is a sample application designed by Sovren to comply with the Terms of Service (http://resumeparsing.com/TOS.htm)
 * and the Acceptable Use Policy (http://resumeparsing.com/AcceptableUse.htm).
 * 
 * The goal of this application is to maximize accuracy and throughput while staying within the requirements linked above.
 * Please read all comment blocks carefully to understand the process!!
 ****************************************************************************************************************************/

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

    /****************************************************************************************************************************
     * The Revision Date tells our software the last time the resume was updated. 
     * THIS IS EXTREMELY IMPORTANT WHEN PARSING OLDER RESUMES SO THAT WE DON'T OVERVALUE THEIR EXPERIENCE. 
     * Any "Current" or "Today" date will be assigned the Revision Date. 
     * If a resume is 3 years old, that means all Jobs and Skills will have 3 extra years of (false) work found if the Revision Date is not set.
     * 
     * We strongly recommend using the files Last Modified date as the Revision Date like done here.
     ****************************************************************************************************************************/
    let stats = fs.statSync(filePath);
    request.RevisionDate = moment(stats.mtime).format("YYYY-MM-DD");

    /****************************************************************************************************************************
     * If using a custom skills list, the builtin list is optional. You can choose to include it also by adding it to the array
     * ex. ["builtin", "mycustomlist"]
     ****************************************************************************************************************************/
    if (settings.skills) {
        request.SkillsData = settings.skills;
        if (settings.includeBuiltinSkills && request.SkillsData.indexOf('builtin') == -1)
            request.SkillsData.push('builtin')
    }

    if (settings.normalizations)
        request.NormalizerData = settings.normalizations;
        
    /****************************************************************************************************************************
     * Per the Acceptable Use Policy (https://docs.sovren.com/Policies/AcceptableUse) do not index documents during bulk parsing.
     * 
     * This means DO NOT include anything in the request.IndexingOptions property
     ****************************************************************************************************************************/

    return request;
}

function getBase64(file: string): string {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
}

function handleParseResponse(response: ParseResponse, settings: ParseSettings, fullInputPath: string){

    //get full path to save the parsed document
    //this will strip the input directory from the original file path, but keep the subfolders
    let fileName = fullInputPath.replace(settings.inputDirectory.replace(/\//g,'/'),'');

    
    if (settings.outputFormat == OutputFormat.XML)
        writeFile('xml', response.Value.ParsedDocument);
    else
        writeFile('json', response.Value.ParsedDocument);

    if (response.Value.ScrubbedParsedDocument)
        writeFile('scrubbed', response.Value.ScrubbedParsedDocument, 'json');

    if (settings.outputHtml && response.Value.Html)
        writeFile('html', response.Value.Html);
        
    if (settings.outputPdf && response.Value.Pdf)
        writeFile('pdf', response.Value.Pdf);

    if (settings.outputRtf && response.Value.Rtf)
        writeFile('rtf', response.Value.Rtf);

    function writeFile(folder: string, document: string, fileType:string = null){
        if (fileType == null)
            fileType = folder;
        let fullOutputPath = `${path.join(settings.outputDirectory, folder)}/${fileName}.${fileType}`;
        ensureDirectoryExistence(fullOutputPath);
        
        if (fileType == 'pdf') //pdfs are returned as base64
            fs.writeFileSync(fullOutputPath, document, 'base64');
        else
            fs.writeFileSync(fullOutputPath, document, 'utf8');
    }
}


// This function creates a directory if it doesn't already exist
function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
      return true;
    }
    ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
  }


