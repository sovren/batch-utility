import { OutputFormat } from './../parse-settings';
import { BaseRequest } from './base-request-info';

export class ParseJobRequest extends BaseRequest {
    Configuration: Configuration;
}

export class Configuration {
    CountryCode: string;
    Language: string;
    KnownType: string;
    IncludeRecruitingTerms: boolean;
    IncludeSupplementalText: boolean;
    PreferShorterJobTitles: boolean;
}
