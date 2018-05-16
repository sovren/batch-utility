

import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgxElectronModule } from 'ngx-electron';
import { ClarityModule } from '@clr/angular';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { KeysPipe } from './pipes/keys.pipe';
import { MinutesSecondsPipe } from './pipes/minutes-seconds.pipe';

import { FileSystem } from './utilities/filesystem';
import { StorageHelper } from './utilities/storage';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { SignInComponent } from './sign-in/sign-in.component';
import { ResumesShellComponent } from './parse-shells/resumes-shell.component';
import { JobOrdersShellComponent } from './parse-shells/joborders-shell.component';
import { ParseComponent } from './parse/parse.component';

import { AppRoutingModule } from './app.routing';
import { RestService } from './services/rest.service';
import { AuthInterceptor } from './auth.interceptor';
import { DirectorySelectionComponent } from './directory-selection/directory-selection.component';



@NgModule({
  declarations: [
    AppComponent,
    KeysPipe,
    MinutesSecondsPipe,
    SignInComponent,
    HomeComponent,
    DirectorySelectionComponent,
    ResumesShellComponent,
    JobOrdersShellComponent,
    ParseComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ClarityModule.forRoot(),
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    NgxElectronModule
  ],
  exports: [
    KeysPipe,
    MinutesSecondsPipe
  ],
  providers: [
    RestService,
    FileSystem,
    StorageHelper,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
