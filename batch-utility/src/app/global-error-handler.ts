import { ErrorHandler, Injectable, Injector} from '@angular/core';
import { AppLogger } from './utilities/logger';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private injector: Injector) { }

  handleError(error) {
     // alert(error);
     console.log(error);
     // IMPORTANT: Rethrow the error otherwise it gets swallowed
     throw error;
  }
  
}