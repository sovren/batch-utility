const fs = (<any>window).require('fs');
const path = (<any>window).require('path');
const winston = (<any>window).require('winston');
import * as moment from 'moment';


export class AppLogger {
    private criticalLogger: any;
    private infoLogger: any;
    private mapLogger: any;
    private networkErrorLogger: any;
    private parseErrorLogger: any;
    private geocodeErrorLogger: any;
    private conversionErrorLogger: any;
    private indexErrorLogger: any;

    constructor(outputDirectory: string) {
        let logDirectory = path.join(outputDirectory, 'logs');
        if (!fs.existsSync(logDirectory)) {
            fs.mkdirSync(logDirectory);
        }

        const tsFormat = () => (new Date()).toLocaleTimeString();

        function formatter(args) {
            var date = moment().format("hh:mm:ss");
            var msg = date + ' - ' +
                args.level + ' - ' +
                args.message + ' - ' + JSON.stringify(args.meta);
            return msg;
        }

        this.criticalLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-critical_errors.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'info',
                    json: false
                })
            ]
        });

        this.infoLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-logs.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'info',
                    json: false
                })
            ]
        });

        this.mapLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-file_mappings.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'info',
                    json: false,
                    formatter: function(options) {
                        return options.message;
                    }
                })
            ]
        });

        this.networkErrorLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-network_error.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'error',
                    json: false
                })
            ]
        });

        this.parseErrorLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-parse_error.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'error',
                    json: false
                })
            ]
        });

        this.conversionErrorLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-conversion_error.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'error',
                    json: false
                })
            ]
        });

        this.geocodeErrorLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-geocode_error.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'error',
                    json: false
                })
            ]
        });

        this.indexErrorLogger = new (winston.Logger)({
            transports: [
                new (winston.transports.File)({
                    filename: `${logDirectory}/${moment().format("YYYY-MM-DD")}-index_error.log`,
                    timestamp: tsFormat,
                    maxsize: '10000000', //10MB
                    level: 'error',
                    json: false
                })
            ]
        });
    }

    log(message: string, data?: any) {
        this.infoLogger.info(message, data);
    }

    logMap(documentName, documentId) {
        this.mapLogger.info(`${documentName} = ${documentId}`);
    }

    logNetworkError(message: string, data?: any) {
        this.networkErrorLogger.error(message, data);
    }

    logParseError(message: string, data?: any) {
        this.parseErrorLogger.error(message, data);
    }

    logConversionError(message: string, data?: any) {
        this.conversionErrorLogger.error(message, data);
    }

    logGeocodeError(message: string, data?: any) {
        this.geocodeErrorLogger.error(message, data);
    }

    logIndexError(message: string, data?: any) {
        this.indexErrorLogger.error(message, data);
    }
}