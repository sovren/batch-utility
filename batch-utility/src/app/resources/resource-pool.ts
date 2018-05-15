/****************************************************************************************************************************
 * This is a sample application designed by Sovren to comply with the Terms of Service (http://resumeparsing.com/TOS.htm)
 * and the Acceptable Use Policy (http://resumeparsing.com/AcceptableUse.htm).
 * 
 * The goal of this application is to maximize accuracy and throughput while complying with the requirements linked above.
 * Please read all block comments carefully to understand the process!!
 ****************************************************************************************************************************/

import { RestService } from "../services/rest.service";
import { IConnection, IConnectionContructor } from "./connection-interface";

export class ResourcePool {
    private pool: IConnection[] = new Array<IConnection>();
    public poolSize: number = 10;
  
    constructor(restSvc: RestService, poolSize: number, connectionType: IConnectionContructor) {
    this.poolSize = poolSize;
      for (let i = 0; i < poolSize; i++) {
        this.pool.push(new connectionType(restSvc));
      }
    }
  
    /****************************************************************************************************************************
     * We continue to check for an available request. The set timeout allows us to do this asynchronously without blocking the UI
     ****************************************************************************************************************************/
    getConnection(): Promise<IConnection> {
      return new Promise((resolve, reject) => {
        var interval = window.setInterval(() => {
          if (this.pool.length > 0) {
            window.clearInterval(interval);
            resolve(this.pool.pop());
          }
        }, 0);
      });
    }
  
  
    /****************************************************************************************************************************
     * Only release a new thread if the number of available threads is below our MaximumConcurrentRequests threshold
     ****************************************************************************************************************************/
    release(connection: any): void {
      if (this.pool.length < this.poolSize)
        this.pool.push(connection);
    }
  }

  
export class CancelationToken {
    private isCanceled = false;
  
    isCancelled = () => this.isCanceled;
  
    cancel = () => this.isCanceled = true;
  }