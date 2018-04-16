export class ParseSettings {
    configurationString: string;
    countryCode: string;
    language: string;
    knownType: string;
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
    index: string;
    inputDirectory: string;
    outputDirectory: string;
    outputFormat: OutputFormat;

    saveSettings: boolean;

    constructor() {
        this.geoCodeProvider = GeoCodeProvider.None;
        this.outputFormat = OutputFormat.JSON;
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
export enum OutputFormat {
    JSON = 'application/json',
    XML = 'application/xml'
}