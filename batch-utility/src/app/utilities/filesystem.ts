import { Injectable } from "@angular/core";

const fs = (<any>window).require('fs');
const path = (<any>window).require('path');

@Injectable()
export class FileSystem {

    constructor() { }
    async getFilesInDirectory(dir: string): Promise<string[]> {
        return new Promise<any[]>((resolve, reject) => {
            var walk = function (dir, done) {
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
                                results.push(file);
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

    getAllSubDirectories(directory: string){
        let dirs = fs.readdirSync(directory).filter(f => fs.statSync(path.join(directory, f)).isDirectory())
    }

    ensureDirectoryExistence(filePath) {
        var dirname = path.dirname(filePath);
        if (fs.existsSync(dirname))
          return true;
        this.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    makeDirIfNotExists(directory: string) {
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
        }
    }

    directoryExists(path: string) {
        return fs.existsSync(path);
    }

}