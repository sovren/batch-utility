import { ResponseInfo } from "./base-response-info";

export class GetIndexesResponse {
    Info: ResponseInfo;
    Value: Index[];
}

export class Index {
    OwnerId: string;
    Name: string;
    IndexType: string;
}

