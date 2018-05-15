# Sovren Batch Parser Utility

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.7.0 and [Electron](https://github.com/electron/electron)   version 1.8.4

## About
This is a sample application designed by Sovren to comply with the Terms of Service (http://resumeparsing.com/TOS.htm)
and the Acceptable Use Policy (http://resumeparsing.com/AcceptableUse.htm).

The goal of this application is to maximize accuracy and throughput while complying with the requirements linked above.
Please read all block comments carefully to understand the process!!


## Development server

Run `npm run electron-build` to build and run the application.  

To view live changes in the application while developing, you can edit the `main.js` file. In the `createWindow()` method, update the url in `win.loadURL` to be `http://localhost:4200`. You may also need to change the `app.on('ready',` method to include a timeout so the app has time to start - `app.on('ready', ()=>{setTimeout(createWindow, 10000)})`
Next run `npm run start` to concurrently serve the angular app and run it inside electron.


## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag or `npm run build` for a production build.

## Packaging

This project uses [electron-builder](https://www.electron.build) to build and package the application for distribution. The application can be packaged for Windows, Mac, or Linux using one of the following scripts
- `npm run package-win`
- `npm run package-mac`
- `npm run package-linux`

Notes: Mac packages must be created from a device running macOS. Windows and Linux (`.AppImage`) packages can be created from both Windows and Linux devices. To generate a Linux `.deb` package, you must change the build target and run the script on a Linux device. For more information, visit [Multi-Platform Builds](https://www.electron.build/multi-platform-build)


## Further help

For additional help, please reach out to Sovren Support at <support@sovren.com>
