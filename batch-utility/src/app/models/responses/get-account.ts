import { ResponseInfo } from "./base-response-info";

export class GetAccountResponse {
    Info: ResponseInfo;
    Value: Account;
}

export class Account {
    CreditsRemaining: number;
    CreditsUsed: number;
    MaximumConcurrentRequests: number;
    ExpirationDate: string;
}