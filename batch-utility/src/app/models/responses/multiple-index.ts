import { ResponseInfo } from "./base-response-info";

export class IndexMultipleResponse {
    Info: ResponseInfo;
    Value: IndexResponse[];
}

export class IndexResponse {
    DocumentId: string;
    Code: string;
    SubCode: string;
    Message: string
}