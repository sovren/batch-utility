import { Component } from "@angular/core";
import { Router } from "@angular/router";
import { ElectronService } from "ngx-electron";


@Component({
    selector: 'app-root',
    styleUrls: [ './app.component.scss'],
    templateUrl: './app.component.html'
})
export class AppComponent { 
    year: number;
    constructor(private _router: Router, private electronSvc: ElectronService) {
        this.year = new Date().getFullYear();
    }
    
}
