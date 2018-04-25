import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})

export class HomeComponent {
  constructor(private router: Router) { }

  parseResumes() {
    this.router.navigate(['./ParseResumes']);
  }

  parseJobOrders() {
    this.router.navigate(['./ParseJobOrders']);
  }

}