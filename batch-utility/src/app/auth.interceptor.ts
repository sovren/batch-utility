/****************************************************************************************************************************
 * This is a sample application designed by Sovren to comply with the Terms of Service (http://resumeparsing.com/TOS.htm)
 * and the Acceptable Use Policy (http://resumeparsing.com/AcceptableUse.htm).
 * 
 * The goal of this application is to maximize accuracy and throughput while staying within the requirements linked above.
 * Please read all comment blocks carefully to understand the process!!
 ****************************************************************************************************************************/

import { Injectable } from '@angular/core';
import {
    HttpRequest,
    HttpHandler,
    HttpEvent,
    HttpInterceptor,
    HttpErrorResponse,
    HttpResponse,
    HttpHeaders
} from '@angular/common/http';
import { Headers, RequestOptions } from '@angular/http';
import { ErrorObserver } from 'rxjs/Observer';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/catch';
import 'rxjs/Observable';
import 'rxjs/add/observable/throw';
import { StorageHelper } from './utilities/storage';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

    constructor(private storage: StorageHelper) { }

    getAuthHeaders(headers: HttpHeaders) {
        let account = this.storage.getLocalLoginInfo();
        
        /****************************************************************************************************************************
         * Our REST API handles authentication via the Sovren-AccountId and Sovren-ServiceKey headers. 
         * These keys were generated during account creation and send to the contacts listed on the account. 
         * If authentication fails we return a 401 Unathorized HTTP Status Code.
         ****************************************************************************************************************************/

        return headers
        .append('Sovren-AccountId', account.accountId)
        .append('Sovren-ServiceKey', account.serviceKey);
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

        const authReq = req.clone({
            headers: this.getAuthHeaders(req.headers)
        });
        return next.handle(authReq).do((event: HttpResponse<any>) => {
            return event;
        }).catch(response => { 
            if (response instanceof HttpErrorResponse && response.status === 401) 
                return Observable.throw(response);
            else
                return Observable.throw(response);
            });
        
    }
}
