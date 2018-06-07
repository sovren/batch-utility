import { RestService } from './../services/rest.service';
import { ParseSettings } from "../models/parse-settings";

export interface IConnectionContructor {
  new(restSvc: RestService): IConnection
}

export interface IConnection {
    parse(settings: ParseSettings, file: string, documentId: string);
}

