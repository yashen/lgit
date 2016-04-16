import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

module util {
    export function ensureDir(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }

    function ensoureRootPath() {
        let rootPath = path.join(os.homedir(), '.lgit');
        util.ensureDir(rootPath);
        return rootPath;
    }


    export class GitUrlInfo {
        static httpPattern = /^(http|https):\/\/([^/]+)\/([\w/.]+)\.git$/i;
        static sshPatten = /^([^@]+)@([^:]+):([\w/.]+)\.git$/i;

        host: string;
        path: string;
        name: string;
        url: string;
        ssh: boolean;
        rootPath: string;

        constructor(url: string) {
            this.url = url;
            this.rootPath = ensoureRootPath();

            var test = GitUrlInfo.httpPattern.test(this.url) || GitUrlInfo.sshPatten.test(this.url);

            if (test) {
                this.host = RegExp.$2;
                let path = RegExp.$3;
                let parts = path.split("/");
                this.name = parts[parts.length - 1];
                this.path = parts.slice(0, -1).join("_");
            } else {
                throw new Error(`${url} not be parsed`);
            }
        }

        ensureParentDir() {
            let hostPath = path.join(this.rootPath, this.host);
            util.ensureDir(hostPath);
            let parentPath = path.join(hostPath, this.path);
            util.ensureDir(parentPath);
            return parentPath;
        }

        ensureTargetDir() {
            let hostPath = path.join(this.rootPath, this.host);
            let parentPath = path.join(hostPath, this.path);
            let target = path.join(parentPath, this.name);

            if (!fs.existsSync(target)) {
                throw new Error(`${target} not existed`);
            }
            return target;
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

    function __createLinkByName(info: GitUrlInfo) {
        var parentFolder = path.join(info.rootPath, "byNames");
        ensureDir(parentFolder);
        var nameFolder = path.join(parentFolder, info.name);
        if (fs.existsSync(nameFolder)) {
            return;
        }
        fs.symlinkSync(info.ensureTargetDir(), nameFolder, 'dir');
        console.log(`create link ${nameFolder}`);
    }

    export function add(url: string, localPath: string): Promise<string> {
        let urlInfo = new GitUrlInfo(url);
        let parentPath = urlInfo.ensureParentDir();
        let targetPath = path.join(parentPath, urlInfo.name);

        if (fs.existsSync(targetPath)) {
            return Promise.reject(`folder [${targetPath}] has existed`);
        }

        localPath = path.resolve(localPath);
        let args = ['clone', localPath, urlInfo.name];
        let result = child_process.spawnSync("git", args, {
            encoding: 'utf-8',
            cwd: parentPath
        });
        if (result.status > 0) {
            return Promise.reject(result.error.message);
        }

        let serUrlArgs = ['remote', 'set-url', 'origin', url];
        let setUrlResult = child_process.spawnSync('git', serUrlArgs, {
            encoding: 'utf-8',
            cwd: targetPath
        });

        if (setUrlResult.status > 0) {
            return Promise.reject(setUrlResult.error.message);
        }

        __createLinkByName(urlInfo);

        return Promise.resolve(targetPath);
    }
    
    export function clone(url:string):Promise<string>{
        let urlInfo = new GitUrlInfo(url);
        let parentPath = urlInfo.ensureParentDir();
        let targetPath = path.join(parentPath, urlInfo.name);

        if (fs.existsSync(targetPath)) {
            return Promise.reject(`folder [${targetPath}] has existed`);
        }
        let args = ['clone', url, urlInfo.name];
        let result = child_process.spawnSync("git", args, {
            encoding: 'utf-8',
            cwd: parentPath
        });
        if (result.status > 0) {
            return Promise.reject(result.error.message);
        }
        __createLinkByName(urlInfo);
        return Promise.resolve(targetPath);        
    }

    export function exec(command: string, args: string[], cwd: string): Promise<string> {
        var result = child_process.spawnSync(command, args, {
            encoding: 'utf-8',
            cwd: cwd
        });

        if (result.status > 0) {
            return Promise.reject(result);
        }
        return Promise.resolve(result.stdout);
    }


}

export = util;