/****************************************************************************************************************************
 * This is a sample application designed by Sovren to comply with the Terms of Service (http://resumeparsing.com/TOS.htm)
 * and the Acceptable Use Policy (http://resumeparsing.com/AcceptableUse.htm).
 * 
 * The goal of this application is to maximize accuracy and throughput while staying within the requirements linked above.
 * Please read all comment blocks carefully to understand the process!!
 ****************************************************************************************************************************/

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RestService } from '../services/rest.service';
import { ElectronService } from 'ngx-electron';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent {

  constructor(private restSvc: RestService, public electronSvc: ElectronService, private router: Router) { }


  parseResumes() {
    this.router.navigate(['./ParseResumes']);
  }

  parseJobOrders() {
    this.router.navigate(['./ParseJobOrders']);
  }

  // This function will open a url in the user's browser
  openExternal(url: string) {
    this.electronSvc.shell.openExternal(url);
  }

}