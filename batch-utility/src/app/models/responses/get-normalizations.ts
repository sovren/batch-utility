import { ResponseInfo } from "./base-response-info";
import { KeyValuePair } from "../key-value-pair";

export class GetNormalizationsResponse {
    Info: ResponseInfo;
    Value: KeyValuePair[];

    
    constructor() {
        this.Info = new ResponseInfo();
        this.Value = new Array<KeyValuePair>();
    }
}