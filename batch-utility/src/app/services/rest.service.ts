/****************************************************************************************************************************
 * This is a sample application designed by Sovren to comply with the Terms of Service (http://resumeparsing.com/TOS.htm)
 * and the Acceptable Use Policy (http://resumeparsing.com/AcceptableUse.htm).
 * 
 * The goal of this application is to maximize accuracy and throughput while staying within the requirements linked above.
 * Please read all comment blocks carefully to understand the process!!
 ****************************************************************************************************************************/

import { OutputFormat, DocumentType } from './../models/parse-settings';
import { Injectable, Output } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/toPromise';

import { AccountUser } from './../models/account-user';
import { GetNormalizationsResponse } from '../models/responses/get-normalizations';
import { GetSkillsResponse } from '../models/responses/get-skills';
import { GetAccountResponse } from '../models/responses/get-account';
import { GetIndexesResponse } from '../models/responses/get-indexes';
import { ParseResponse } from '../models/responses/parse';
import { ParseResumeRequest } from '../models/requests/parse-resume';
import { ParseJobRequest } from '../models/requests/parse-job';
import { StorageHelper } from '../utilities/storage';
import { IndexRequest } from '../models/requests/multiple-index';
import { IndexMultipleResponse } from '../models/responses/multiple-index';

@Injectable()
export class RestService {
    constructor(private http: HttpClient, private storage: StorageHelper) { }

    async loginAccount(accountUser: AccountUser): Promise<GetAccountResponse> {
        if (accountUser.rememberMe) //store credentials on local machine if remember me is enabled
            this.storage.setLoginInfo(accountUser);
        else
            this.storage.setLoginInfo(new AccountUser());
        this.storage.setLocalLoginInfo(accountUser);
        let url = this.baseUrlPlus('account');
        try {
            let accountResponse = await this.http.get<GetAccountResponse>(url).first().toPromise();
            return accountResponse;
        }
        /****************************************************************************************************************************
         * The Sovren SaaS system is in two data centers. We check the US one first.
         * If the credentials are invalid, we check the EU endpoint.
         ****************************************************************************************************************************/
        catch(e) { 
            url = url.replace('rest.resumeparsing','eu-rest.resumeparsing');
            let accountResponse = await this.http.get<GetAccountResponse>(url).first().toPromise();
            accountUser.euRegion = true; //if that worked they are in eu
            this.storage.setLocalLoginInfo(accountUser);
        }
    }

    async getAccount(): Promise<GetAccountResponse> {
        let url = this.baseUrlPlus('account');
        let accountResponse = await this.http.get<GetAccountResponse>(url).first().toPromise();
        return accountResponse;
    }

    async getSkills(): Promise<GetSkillsResponse> {
        let url = this.baseUrlPlus('skills');
        try {
            let skillsResponse = await this.http.get<GetSkillsResponse>(url).first().toPromise();
            return skillsResponse;
        }
        catch (e) {
            return new GetSkillsResponse();
        }
    }

    async getNormalizations(): Promise<GetNormalizationsResponse> {
        let url = this.baseUrlPlus('normalizations');
        try {
            let normalizationsResponse = await this.http.get<GetNormalizationsResponse>(url).first().toPromise();
            return normalizationsResponse;
        }
        catch (e) {
            return new GetNormalizationsResponse();
        }
    }

    async getIndexes(): Promise<GetIndexesResponse> {
        let url = this.baseUrlPlus('index');
        let indexesResponse = await this.http.get<GetIndexesResponse>(url).first().toPromise();
        return indexesResponse;
    }

    async saveIndex(indexName: string, indexType: string){
        let url = this.baseUrlPlus('index', indexName);
        let body = { 'IndexType' : indexType}
        return await this.http.post(url, body).first().toPromise();
    }

    async parseResume(request: ParseResumeRequest): Promise<ParseResponse> {
        let url = this.baseUrlPlus('parser', 'resume');
        
        if (request.OutputFormat == OutputFormat.JSON) {
            return await this.http.post<ParseResponse>(url, request).first().toPromise(); 
        }
        else {
            /****************************************************************************************************************************
             * Our REST API accepts and returns content in JSON or XML. 
             * The Content-Type header is required, and indicates your request's content type. 
             * Our API supports JSON (application/json) and XML (application/xml). 
             * The Accept header controls what data format the response will be returned in. 
             * Our API defaults to JSON (application/json) but also supports XML (application/xml).
             * 
             * If we wish to return the parsed document in XML format we need to do a couple extra steps
             * Because angular won't allow us to accept an XML response cleanly, we get it back as text,
             * then convert it to XML, and then parse the result into our model
             ****************************************************************************************************************************/
            let headers = new HttpHeaders({ 'Accept': request.OutputFormat });
            let options = { headers: headers, responseType: 'text' as 'text' };
            let response = await this.http.post(url, request, options).first().toPromise(); 
            let xml = this.parseXML(response); 
            let jsonResponse = JsonXmlHelper.XmlToJson(xml);
            let result = JSON.parse(JSON.stringify(jsonResponse.ResponseModelOfParsedResumeResponseModel)) as ParseResponse;
            result.Value.ParsedDocument = xml.getElementsByTagName('ParsedDocument')[0].textContent;
            return result;
        }
    }

    async parseJob(request: ParseJobRequest): Promise<ParseResponse> {
        let url = this.baseUrlPlus('parser', 'joborder');

        if (request.OutputFormat == OutputFormat.JSON) {
            return await this.http.post<ParseResponse>(url, request).first().toPromise(); 
        }
        else {
            /****************************************************************************************************************************
             * Our REST API accepts and returns content in JSON or XML. 
             * The Content-Type header is required, and indicates your request's content type. 
             * Our API supports JSON (application/json) and XML (application/xml). 
             * The Accept header controls what data format the response will be returned in. 
             * Our API defaults to JSON (application/json) but also supports XML (application/xml).
             * 
             * If we wish to return the parsed document in XML format we need to do a couple extra steps
             * Because angular won't allow us to accept an XML response cleanly, we get it back as text,
             * then convert it to XML, and then parse the result into our model
             ****************************************************************************************************************************/
            let headers = new HttpHeaders({ 'Accept': request.OutputFormat });
            let options = { headers: headers, responseType: 'text' as 'text' };
            let response = await this.http.post(url, request, options).first().toPromise(); 
            let xml = this.parseXML(response); 
            let jsonResponse = JsonXmlHelper.XmlToJson(xml);
            let result = JSON.parse(JSON.stringify(jsonResponse.ResponseModelOfParsedJobOrderResponseModel)) as ParseResponse;
            result.Value.ParsedDocument = xml.getElementsByTagName('ParsedDocument')[0].textContent;
            return result;
        }
    }

    async indexDocuments(request: IndexRequest[], indexName: string): Promise<IndexMultipleResponse>{
        let url = this.baseUrlPlus('index', indexName, 'documents');
        return await this.http.post<IndexMultipleResponse>(url, request).first().toPromise(); 
    }

    private parseXML(val) {
        let parser = new DOMParser();
        return parser.parseFromString(val, "text/xml");
    }

    baseUrlPlus(...paths: string[]) {
        let accountUser = this.storage.getLocalLoginInfo();
        const fullPath = paths.join('/');
        if (accountUser.euRegion)
            return `https://eu-rest.resumeparsing.com/v8/${fullPath}`;

        return `https://rest.resumeparsing.com/v8/${fullPath}`;
    }

}