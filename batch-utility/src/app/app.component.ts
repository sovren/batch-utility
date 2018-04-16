import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { ElectronService } from "ngx-electron";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})
export class AppComponent { 
    showHeader: boolean;
    max: boolean;
    constructor(private _router: Router, private electronSvc: ElectronService){
        if (this._router.url.indexOf('signin') > 0)
            this.showHeader = true;
    }

    onMinimize(){

        console.log('exit')
    }

    onRestore(){
        this.max = false;
        console.log('exit')
    }

    onMax(){
        this.max = true;
        console.log('exit')
    }

    onExit(){
        console.log('exit')
    }
    
}
