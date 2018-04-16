import { Injectable } from "@angular/core";
import { AccountUser } from "../models/account-user";
import { ParseSettings } from "../models/parse-settings";
import { Account } from '../models/responses/get-account';


 const fs = (<any>window).require('fs');
 const Store = (<any>window).require('electron-store');

const store = new Store({
    name: 'user-settings',
});

@Injectable()
export class StorageHelper {

    private storage = localStorage;
    
    private readonly accountKey = 'account';
    private readonly accountUserKey = 'accountuser';
    private readonly bulkResumeParseSettingsKey = 'bulkResumeParseSettings';
    private readonly bulkJobOrderParseSettingsKey = 'bulkJobOrderParseSettings';

    getLoginInfo(): AccountUser {
        let accountUserString = store.get(this.accountUserKey);
        if (accountUserString != undefined)
            return JSON.parse(accountUserString) as AccountUser;
        else
            return new AccountUser();
    }

    setLoginInfo(accountUser: AccountUser){
        store.set(this.accountUserKey, JSON.stringify(accountUser));
    }

    getLocalLoginInfo(): AccountUser {
        const accountUserString = this.storage.getItem(this.accountUserKey);
        if (accountUserString == null) {
            return null;
        }
        try {
            return JSON.parse(accountUserString) as AccountUser;
        } catch (error) {
            return null;
        }
    }

    setLocalLoginInfo(accountUser: AccountUser): void {
        this.storage.setItem(this.accountUserKey, JSON.stringify(accountUser));
    }

    getBulkResumeParseSettings() : ParseSettings{
        let parseSettingsString = store.get(this.bulkResumeParseSettingsKey);
        if (parseSettingsString != undefined)
            return JSON.parse(parseSettingsString) as ParseSettings;
        else
            return new ParseSettings();
    }

    setBulkResumeParseSettings(settings: ParseSettings){
        store.set(this.bulkResumeParseSettingsKey, JSON.stringify(settings));
    }

    getBulkJobOrderParseSettings() : ParseSettings{
        let parseSettingsString = store.get(this.bulkJobOrderParseSettingsKey);
        if (parseSettingsString != undefined)
            return JSON.parse(parseSettingsString) as ParseSettings;
        else
            return new ParseSettings();
    }

    setBulkJobOrderParseSettings(settings: ParseSettings){
        store.set(this.bulkJobOrderParseSettingsKey, JSON.stringify(settings));
    }
}