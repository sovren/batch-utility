
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
                let fileName = path.basename(filePath);
                handleParseResponse(response, settings, fileName)
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
                let fileName = path.basename(filePath);
                handleParseResponse(response, settings, fileName)
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
        
        let fileName = filePath.substring(0, filePath.lastIndexOf('.')).split('\\').pop().split('/').pop();
        request.IndexingOptions.DocumentId = fileName.replace(/[^0-9a-zA-Z_]/g, '');
    }
    return request;
}

function getBase64(file: string): string {
    var bitmap = fs.readFileSync(file);
    return new Buffer(bitmap).toString('base64');
}

function handleParseResponse(response: ParseResponse, settings: ParseSettings, fileName: string){
    if (settings.outputFormat == OutputFormat.XML)
        fs.writeFileSync(`${path.join(settings.outputDirectory, 'xml')}/${fileName}.xml`, response.Value.ParsedDocument, 'utf8');
    else
        fs.writeFileSync(`${path.join(settings.outputDirectory, 'json')}/${fileName}.json`, response.Value.ParsedDocument, 'utf8');

    if (settings.outputHtml && response.Value.Html)
        fs.writeFileSync(`${path.join(settings.outputDirectory, 'html')}/${fileName}.html`, response.Value.Html, 'utf8');
    if (settings.outputPdf && response.Value.Pdf)
        fs.writeFileSync(`${path.join(settings.outputDirectory, 'pdf')}/${fileName}.pdf`, response.Value.Pdf, 'utf8');
    if (settings.outputRtf && response.Value.Rtf)
        fs.writeFileSync(`${path.join(settings.outputDirectory, 'rtf')}/${fileName}.rtf`, response.Value.Rtf, 'utf8');
}


