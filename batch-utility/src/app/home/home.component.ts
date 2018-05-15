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

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent implements OnInit {

  aimEnabled: boolean;
  loading: boolean = true;

  constructor(private restSvc: RestService, private router: Router) { }

  async ngOnInit() {
    /****************************************************************************************************************************
     * We can check if AIM is enabled by calling the /index endpoint
     * If this call fails, then AIM is not enabled
     ****************************************************************************************************************************/
    try {
      await this.restSvc.getIndexes();
      this.aimEnabled = true;
    }
    catch {
      this.aimEnabled = false;
    }
    this.loading = false;
  }

  parseResumes() {
    this.router.navigate(['./ParseResumes']);
  }

  parseJobOrders() {
    this.router.navigate(['./ParseJobOrders']);
  }

}