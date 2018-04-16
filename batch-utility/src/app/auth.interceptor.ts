
// import { authProviders } from './app.routing';
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
