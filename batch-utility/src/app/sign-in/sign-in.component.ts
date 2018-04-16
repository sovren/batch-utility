import { AccountUser } from './../models/account-user';
import { RestService } from './../services/rest.service';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageHelper } from '../utilities/storage';




@Component({
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss']
})



export class SignInComponent {
  account: AccountUser = new AccountUser();
  errorMessage: string;

  constructor(private storage: StorageHelper, private router: Router, private restSvc: RestService) { 
    this.account = this.storage.getLoginInfo();
  }

  async submitForm(){
    this.errorMessage = null;

    try {
      let accountResponse = await this.restSvc.loginAccount(this.account);
      this.router.navigate(['./Home']);
    }
    catch (error) {
      if (error.status == 401) {
        this.errorMessage = "The combination of AccountId and ServiceKey were invalid.";
      }
      else {
        this.errorMessage = "An unexpected error occurred.";
      }
    }
  }
}


