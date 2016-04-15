import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

module util {
    export function ensureDir(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    export class GitUrlInfo {
        host: string;
        path: string;
        name: string;
        url: string;
        ssh: boolean;
        rootPath: string;

        constructor(url: string, rootPath: string) {
            this.url = url;
            this.rootPath = rootPath;

            if (this.url.slice(0, 4) == "http") {
                this.parsehttp();
            }
            else {
                this.parsessh();
            }
        }


        ensureParentDir() {
            let hostPath = path.join(this.rootPath, this.host);
            util.ensureDir(hostPath);
            let parentPath = path.join(hostPath, this.path);
            util.ensureDir(parentPath);
            return parentPath;
        }

        parsessh() {
            this.ssh = true;
            let parts = this.url.split(":");
            this.host = parts[0];
            var rightParts = parts[1].split("/");
            let name = rightParts[rightParts.length - 1];
            if (name.slice(-4) == ".git") {
                name = name.slice(0, -4);
            }
            this.name = name;
            this.path = rightParts.slice(0, -1).join("/");
        }

        parsehttp() {
            let parts = this.url.split("/");
            let name = parts[parts.length - 1];
            if (name.slice(-4) == ".git") {
                name = name.slice(0, -4);
            }
            this.name = name;
            this.path = parts[parts.length - 2];
            this.host = parts.slice(0, -2).join("|");
        }
    }


    export function isGit(path: string): Promise<boolean> {
        let options;
        if (path) {
            options = { cwd: path };
        }

        let result = child_process.spawnSync('git', ['status'], options);
        if (result.status == 0) {
            return Promise.resolve(true);
        } else {
            return Promise.reject("Not a git folder");
        }
    }

    export function syncExec(command: string, cwd = null, quiet = false): string {
        var result = child_process.execSync(command, {
            encoding: 'utf-8',
            cwd: cwd
        });
        if (!quiet) {
            console.log(result);
        }
        return result;
    }

    export function getOriginUrl(path: string): Promise<string> {
        let result = child_process.spawnSync('git', ['remote', '-v'], {
            encoding: 'utf-8',
            cwd: path
        });
        for (let item of result.stdout.split("\n")) {
            if (item.slice(0, 6) == "origin") {
                var parts = item.split("\t");
                return Promise.resolve(parts[1].split(" ")[0]);
            }
        }
        return Promise.reject("Not find origin url");
    }

    export function clone(url: string, localPath: string,rootPath:string) {
        let urlInfo = new GitUrlInfo(url,rootPath);
        let parentPath = urlInfo.ensureParentDir();
        let targetPath = path.join(parentPath,urlInfo.name);
        
        if(fs.existsSync(targetPath)){
            return Promise.reject(`folder [${targetPath}] has exited`);
        }

        localPath = path.resolve(localPath);        
        let args = ['clone',localPath,urlInfo.name];
        let result = child_process.spawnSync("git",args,{
           encoding:'utf-8',
           cwd:parentPath
        });
        if(result.status > 0){
            return Promise.reject(result.error.message);
        }
        
        let serUrlArgs = ['remote','set-url','origin',url];
        let setUrlResult = child_process.spawnSync('git',serUrlArgs,{
           encoding:'utf-8',
           cwd:targetPath 
        });
        
        if(setUrlResult.status>0){ 
            return Promise.reject(setUrlResult.error.message);    
        }
        
        return Promise.resolve(targetPath);
    }


}

export = util;