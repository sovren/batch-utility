export class DocToParse {
    docName: string;
    size: number;
    attemps: number;


    constructor(name: string, size: number, numAttempts: number) {
      this.docName = name;
      this.size = size;
      this.attemps = numAttempts;
    }

  }

