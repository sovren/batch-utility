import { RestService } from "../services/rest.service";
import { IConnection, IConnectionContructor } from "./connection-interface";

export class ResourcePool {
    private pool: IConnection[] = new Array<IConnection>();
    public poolSize: number = 10;
  
    constructor(restSvc: RestService, poolSize: number, connectionType: IConnectionContructor) {
    this.poolSize = Math.min(10,poolSize); //max of 10
      for (let i = 0; i < poolSize; i++) {
        this.pool.push(new connectionType(restSvc));
      }
    }
  
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