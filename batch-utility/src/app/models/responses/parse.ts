import {ResponseInfo} from './base-response-info'; 

export class ParseResponse {
    Info: ResponseInfo;
    Value: ParseResponseValue;
}

export class ParseResponseValue {
    CandidateImage: string;
    CandidateImageExtension: string;
    FileType: string;
    Text: string;
    TextCode: string;
    Html: string;
    HtmlCode: string;
    Rtf: string;
    RtfCode: string;
    CreditsRemaining: number;
    FileExtension: string;
    Pdf: string;
    PdfCode: string;
    ParsedDocument: string;
    GeocodeResponse: ResponseInfo;
    IndexingResponse: ResponseInfo;
}