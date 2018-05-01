export class IndexRequest {
    DocumentId: string;
    ParsedDocument: string;

    constructor(documentId: string, parsedDocument: string){
        this.DocumentId = documentId;
        this.ParsedDocument = parsedDocument;
    }
}