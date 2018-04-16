import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home/home.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { ResumesShellComponent } from './parse-shells/resumes-shell.component';
import { JobOrdersShellComponent } from './parse-shells/joborders-shell.component';

export const routes: Routes = [
    { path: '', redirectTo: 'SignIn', pathMatch: 'full' },
    { path: 'SignIn', component: SignInComponent },
    { path: 'Home', component: HomeComponent },
    { path: 'ParseResumes', component: ResumesShellComponent },
    { path: 'ParseJobOrders', component: JobOrdersShellComponent }
  ];
  

@NgModule({
imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})


export class AppRoutingModule {}