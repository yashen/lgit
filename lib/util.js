"use strict";
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
var util;
(function (util) {
    function ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    util.ensureDir = ensureDir;
    function ensoureRootPath() {
        let rootPath = path.join(os.homedir(), '.lgit');
        util.ensureDir(rootPath);
        return rootPath;
    }
    util.ensoureRootPath = ensoureRootPath;
    function walkSync(parent, list) {
        if (fs.existsSync(path.join(parent, '.git'))) {
            list.push(parent);
            return;
        }
        var dirList = fs.readdirSync(parent);
        dirList.forEach(function (item) {
            var subPath = path.join(parent, item);
            let stat = fs.lstatSync(subPath);
            if (stat.isDirectory() && !stat.isSymbolicLink()) {
                walkSync(subPath, list);
            }
        });
    }
    function getAllGitPath() {
        let root = ensoureRootPath();
        var list = [];
        walkSync(root, list);
        return list;
    }
    util.getAllGitPath = getAllGitPath;
    function find(name) {
        let rootPath = ensoureRootPath();
        let parentFolder = path.join(rootPath, "byNames");
        ensureDir(parentFolder);
        let nameFolder = path.join(parentFolder, name);
        if (fs.existsSync(nameFolder)) {
            return nameFolder;
        }
    }
    util.find = find;
    class GitUrlInfo {
        constructor(url) {
            this.url = url;
            this.rootPath = ensoureRootPath();
            let test = GitUrlInfo.httpPattern.test(this.url) || GitUrlInfo.sshPatten.test(this.url);
            if (test) {
                this.host = RegExp.$2;
                let path = RegExp.$3;
                let parts = path.split("/");
                this.name = parts[parts.length - 1];
                this.path = parts.slice(0, -1).join("_");
            }
            else {
                throw new Error(`${url} not be parsed`);
            }
        }
        static IsGitUrl(url) {
            return GitUrlInfo.httpPattern.test(url) || GitUrlInfo.sshPatten.test(url);
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
    GitUrlInfo.httpPattern = /^(http|https):\/\/([^/]+)\/(.+)\.git$/i;
    GitUrlInfo.sshPatten = /^([^@]+)@([^:]+):(.+)\.git$/i;
    util.GitUrlInfo = GitUrlInfo;
    function isGit(path) {
        let options;
        if (path) {
            options = { cwd: path };
        }
        let result = child_process.spawnSync('git', ['status'], options);
        if (result.status == 0) {
            return Promise.resolve(true);
        }
        else {
            return Promise.reject("Not a git folder");
        }
    }
    util.isGit = isGit;
    function getOriginUrl(path) {
        return exec('git', ['remote', '-v'], path)
            .then((stdout) => {
            for (let item of stdout.split("\n")) {
                if (item.slice(0, 6) == "origin") {
                    let parts = item.split("\t");
                    return Promise.resolve(parts[1].split(" ")[0]);
                }
            }
            return Promise.reject("Not find origin url");
        });
    }
    util.getOriginUrl = getOriginUrl;
    function __createLinkByName(info) {
        let parentFolder = path.join(info.rootPath, "byNames");
        ensureDir(parentFolder);
        let nameFolder = path.join(parentFolder, info.name);
        if (fs.existsSync(nameFolder)) {
            return;
        }
        fs.symlinkSync(info.ensureTargetDir(), nameFolder, 'dir');
        console.log(`create link ${nameFolder}`);
    }
    function add(url, localPath) {
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
    util.add = add;
    function clone(url) {
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
    util.clone = clone;
    function exec(command, args, cwd) {
        let result = child_process.spawnSync(command, args, {
            encoding: 'utf-8',
            cwd: cwd
        });
        if (result.status > 0) {
            return Promise.reject(result);
        }
        return Promise.resolve(result.stdout);
    }
    util.exec = exec;
    function openTerm(cwd) {
        let term = process.env.COLORTERM || process.env.TERM;
        child_process.spawn(term, [], {
            cwd: cwd,
            detached: true
        });
        process.exit(0);
    }
    util.openTerm = openTerm;
})(util || (util = {}));
module.exports = util;
