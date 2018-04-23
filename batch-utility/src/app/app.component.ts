import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { ElectronService } from "ngx-electron";

@Component({
    selector: 'app-root',
    styleUrls: [ './app.component.scss'],
    templateUrl: './app.component.html'
})
export class AppComponent { 
    showHeader: boolean;
    max: boolean;
    window: Electron.BrowserWindow;

    constructor(private _router: Router, private electronSvc: ElectronService){
        this.window = this.electronSvc.remote.getCurrentWindow();
    }

    onMinimize(){
        this.window.minimize();
    }

    onRestore(){
        this.max = false;
        this.window.restore();
    }

    onMax(){
        this.max = true;
        this.window.maximize();
    }

    onExit(){
        this.window.close();
    }
    
}
