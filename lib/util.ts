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

    export function ensoureRootPath():string {
        let rootPath = path.join(os.homedir(), '.lgit');
        util.ensureDir(rootPath);
        return rootPath;
    }


    function walkSync(parent: string, list: string[]) {
        if (fs.existsSync(path.join(parent, '.git'))) {
            list.push(parent);
            return;
        }

        var dirList = fs.readdirSync(parent);
        dirList.forEach(function(item) {
            var subPath = path.join(parent, item);
            let stat = fs.lstatSync(subPath);
            if (stat.isDirectory() && !stat.isSymbolicLink()) {
                walkSync(subPath, list);
            }
        });
    }


    export function getAllGitPath(): string[] {
        let root = ensoureRootPath();
        var list = [];
        walkSync(root, list);
        return list;
    }



    export function find(name: string): string {
        let rootPath = ensoureRootPath();
        let parentFolder = path.join(rootPath, "byNames");
        ensureDir(parentFolder);
        let nameFolder = path.join(parentFolder, name);
        if (fs.existsSync(nameFolder)) {
            return nameFolder;
        }
    }


    export class GitUrlInfo {
        static httpPattern = /^(http|https):\/\/([^/]+)\/(.+)\.git$/i;
        static sshPatten = /^([^@]+)@([^:]+):(.+)\.git$/i;

        static IsGitUrl(url: string) {
            return GitUrlInfo.httpPattern.test(url) || GitUrlInfo.sshPatten.test(url);
        }

        host: string;
        path: string;
        name: string;
        url: string;
        rootPath: string;

        constructor(url: string) {
            this.url = url;
            this.rootPath = ensoureRootPath();

            let test = GitUrlInfo.httpPattern.test(this.url) || GitUrlInfo.sshPatten.test(this.url);

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
            return Promise.reject<boolean>("Not a git folder");
        }
    }

    export function getOriginUrl(path: string): Promise<string> {
        return exec('git', ['remote', '-v'], path)
            .then(
            (stdout) => {
                for (let item of stdout.split("\n")) {
                    if (item.slice(0, 6) == "origin") {
                        let parts = item.split("\t");
                        return Promise.resolve(parts[1].split(" ")[0]);
                    }
                }
                return Promise.reject<string>("Not find origin url");
            }
            );
    }

    function __createLinkByName(info: GitUrlInfo) {
        let parentFolder = path.join(info.rootPath, "byNames");
        ensureDir(parentFolder);
        let nameFolder = path.join(parentFolder, info.name);
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
            return Promise.reject<string>(`folder [${targetPath}] has existed`);
        }

        localPath = path.resolve(localPath);
        let args = ['clone', localPath, urlInfo.name];
        let result = child_process.spawnSync("git", args, {
            encoding: 'utf-8',
            cwd: parentPath
        });
        if (result.status > 0) {
            return Promise.reject<string>(result.error.message);
        }

        let serUrlArgs = ['remote', 'set-url', 'origin', url];
        let setUrlResult = child_process.spawnSync('git', serUrlArgs, {
            encoding: 'utf-8',
            cwd: targetPath
        });

        if (setUrlResult.status > 0) {
            return Promise.reject<string>(setUrlResult.error.message);
        }

        __createLinkByName(urlInfo);

        return Promise.resolve(targetPath);
    }

    export function clone(url: string): Promise<string> {
        let urlInfo = new GitUrlInfo(url);
        let parentPath = urlInfo.ensureParentDir();
        let targetPath = path.join(parentPath, urlInfo.name);

        if (fs.existsSync(targetPath)) {
            return Promise.reject<string>(`folder [${targetPath}] has existed`);
        }
        let args = ['clone', url, urlInfo.name];
        let result = child_process.spawnSync("git", args, {
            encoding: 'utf-8',
            cwd: parentPath
        });
        if (result.status > 0) {
            return Promise.reject<string>(result.error.message);
        }
        __createLinkByName(urlInfo);
        return Promise.resolve(targetPath);
    }

    export function exec(command: string, args: string[], cwd: string): Promise<string> {
        let result = child_process.spawnSync(command, args, {
            encoding: 'utf-8',
            cwd: cwd
        });

        if (result.status > 0) {
            return Promise.reject<string>(result);
        }
        return Promise.resolve(<string><any>result.stdout);
    }

    export function openTerm(cwd: string) {
        let term = process.env.COLORTERM || process.env.TERM;
        child_process.spawn(term, [], {
            cwd: cwd,
            detached: true
        });
        process.exit(0);
    }


}

export = util;