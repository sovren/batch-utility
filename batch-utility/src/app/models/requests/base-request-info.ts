export class BaseRequest {
    DocumentAsBase64String: string;
    GeocodeOptions: GeocodeOptions;
    IndexingOptions: IndexingOptions
    OutputHtml: boolean;
    OutputRtf: boolean;
    OutputCandidateImage: boolean;
    OutputPdf: boolean;
    RevisionDate: string;
    SkillsData: string[];
    NormalizerData: string;
    OutputFormat: string;
}


export class GeocodeOptions {
    IncludeGeocoding: boolean;
    Provider: string;
    ProviderKey: string;
}

export class IndexingOptions {
    IndexId: string;
    DocumentId: string;
}