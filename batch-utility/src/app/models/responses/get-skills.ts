import { ResponseInfo } from "./base-response-info";
import { KeyValuePair } from "../key-value-pair";

export class GetSkillsResponse {
    Info: ResponseInfo;
    Value: KeyValuePair[];

    constructor() {
        this.Info = new ResponseInfo();
        this.Value = new Array<KeyValuePair>();
    }
}