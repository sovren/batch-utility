import { Injectable } from "@angular/core";
import { DocToParse } from "../models/doc-to-parse";

const fs = (<any>window).require('fs');
const path = (<any>window).require('path');

@Injectable()
export class FileSystem {

    constructor() { }
    async getFilesInDirectory(dir: string): Promise<DocToParse[]> {
        return new Promise<any[]>((resolve, reject) => {
            var walk = function (dir, done) {
                if (dir.indexOf('FAILED AND DO NOT RESUBMIT') >= 0) {//documents in this folder failed for reasons that should not allow resubmission per the Acceptable Use Policy
                    done(null, []);
                    return;
                }

                var results = [];
                fs.readdir(dir, function (err, list) {
                    if (err) return done(err);
                    var pending = list.length;
                    if (!pending) return done(null, results);
                    list.forEach(function (file) {
                        file = path.resolve(dir, file);
                        fs.stat(file, function (err, stat) {
                            if (stat && stat.isDirectory()) {
                                walk(file, function (err, res) {
                                    results = results.concat(res);
                                    if (!--pending) done(null, results);
                                });
                            } else {
                                if (stat.size > 0) {
                                    results.push(new DocToParse(file, stat.size, 1));
                                }
                                if (!--pending) done(null, results);
                            }
                        });
                    });
                });
            };

            walk(dir, function (err, res) {
                if (err) reject(err);
                else resolve(res);
            })
        })
    }

    ensureDirectoryExistence(filePath) {
        var dirname = path.dirname(filePath);
        if (fs.existsSync(dirname))
          return true;
        this.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname, {recursive: true});
    }

    makeDirIfNotExists(directory: string) {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
    }

    directoryExists(path: string) {
        return fs.existsSync(path);
    }

    moveFile(input:string, output:string) {
        fs.rename(input, output);
    }

}