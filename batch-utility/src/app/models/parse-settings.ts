export class ParseSettings {
    configurationString: string;
    countryCode: string;
    language: string;
    knownType: KnownType;
    includeRecruitingTerms: boolean;
    includeSupplementalText: boolean;
    preferShorterJobTitles: boolean;
    outputHtml: boolean;
    outputRtf: boolean;
    outputPdf: boolean;
    geoCodeProvider: GeoCodeProvider;
    geoCodeKey: string;
    normalizations: string;
    skills: string[];
    excludeBuiltinSkills: boolean;
    index: string;
    inputDirectory: string;
    outputDirectory: string;
    keepFolderStructure: boolean;
    outputFormat: OutputFormat;

    saveSettings: boolean;

    constructor() {
        this.geoCodeProvider = GeoCodeProvider.None;
        this.outputFormat = OutputFormat.JSON;
        this.excludeBuiltinSkills = false;
    }

}


export enum DocumentType {
    Resumes,
    JobOrders,
}
export enum GeoCodeProvider {
    None,
    Google,
    Bing
}
export enum KnownType {
    Indeed,
    Stride,
    JOB_SUBMISSION_REPLY_TO_CANDIDATE
}
export enum OutputFormat {
    JSON = 'application/json',
    XML = 'application/xml'
}