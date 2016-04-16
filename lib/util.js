"use strict";
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var os = require('os');
var util;
(function (util) {
    function ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    util.ensureDir = ensureDir;
    function ensoureRootPath() {
        var rootPath = path.join(os.homedir(), '.lgit');
        util.ensureDir(rootPath);
        return rootPath;
    }
    function find(name) {
        var rootPath = ensoureRootPath();
        var parentFolder = path.join(rootPath, "byNames");
        ensureDir(parentFolder);
        var nameFolder = path.join(parentFolder, name);
        if (fs.existsSync(nameFolder)) {
            return nameFolder;
        }
    }
    util.find = find;
    var GitUrlInfo = (function () {
        function GitUrlInfo(url) {
            this.url = url;
            this.rootPath = ensoureRootPath();
            var test = GitUrlInfo.httpPattern.test(this.url) || GitUrlInfo.sshPatten.test(this.url);
            if (test) {
                this.host = RegExp.$2;
                var path_1 = RegExp.$3;
                var parts = path_1.split("/");
                this.name = parts[parts.length - 1];
                this.path = parts.slice(0, -1).join("_");
            }
            else {
                throw new Error(url + " not be parsed");
            }
        }
        GitUrlInfo.IsGitUrl = function (url) {
            return GitUrlInfo.httpPattern.test(url) || GitUrlInfo.sshPatten.test(url);
        };
        GitUrlInfo.prototype.ensureParentDir = function () {
            var hostPath = path.join(this.rootPath, this.host);
            util.ensureDir(hostPath);
            var parentPath = path.join(hostPath, this.path);
            util.ensureDir(parentPath);
            return parentPath;
        };
        GitUrlInfo.prototype.ensureTargetDir = function () {
            var hostPath = path.join(this.rootPath, this.host);
            var parentPath = path.join(hostPath, this.path);
            var target = path.join(parentPath, this.name);
            if (!fs.existsSync(target)) {
                throw new Error(target + " not existed");
            }
            return target;
        };
        GitUrlInfo.httpPattern = /^(http|https):\/\/([^/]+)\/(.+)\.git$/i;
        GitUrlInfo.sshPatten = /^([^@]+)@([^:]+):(.+)\.git$/i;
        return GitUrlInfo;
    }());
    util.GitUrlInfo = GitUrlInfo;
    function isGit(path) {
        var options;
        if (path) {
            options = { cwd: path };
        }
        var result = child_process.spawnSync('git', ['status'], options);
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
            .then(function (stdout) {
            for (var _i = 0, _a = stdout.split("\n"); _i < _a.length; _i++) {
                var item = _a[_i];
                if (item.slice(0, 6) == "origin") {
                    var parts = item.split("\t");
                    return Promise.resolve(parts[1].split(" ")[0]);
                }
            }
            return Promise.reject("Not find origin url");
        });
    }
    util.getOriginUrl = getOriginUrl;
    function __createLinkByName(info) {
        var parentFolder = path.join(info.rootPath, "byNames");
        ensureDir(parentFolder);
        var nameFolder = path.join(parentFolder, info.name);
        if (fs.existsSync(nameFolder)) {
            return;
        }
        fs.symlinkSync(info.ensureTargetDir(), nameFolder, 'dir');
        console.log("create link " + nameFolder);
    }
    function add(url, localPath) {
        var urlInfo = new GitUrlInfo(url);
        var parentPath = urlInfo.ensureParentDir();
        var targetPath = path.join(parentPath, urlInfo.name);
        if (fs.existsSync(targetPath)) {
            return Promise.reject("folder [" + targetPath + "] has existed");
        }
        localPath = path.resolve(localPath);
        var args = ['clone', localPath, urlInfo.name];
        var result = child_process.spawnSync("git", args, {
            encoding: 'utf-8',
            cwd: parentPath
        });
        if (result.status > 0) {
            return Promise.reject(result.error.message);
        }
        var serUrlArgs = ['remote', 'set-url', 'origin', url];
        var setUrlResult = child_process.spawnSync('git', serUrlArgs, {
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
        var urlInfo = new GitUrlInfo(url);
        var parentPath = urlInfo.ensureParentDir();
        var targetPath = path.join(parentPath, urlInfo.name);
        if (fs.existsSync(targetPath)) {
            return Promise.reject("folder [" + targetPath + "] has existed");
        }
        var args = ['clone', url, urlInfo.name];
        var result = child_process.spawnSync("git", args, {
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
        var result = child_process.spawnSync(command, args, {
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
        var term = process.env.COLORTERM || process.env.TERM;
        child_process.spawn(term, [], {
            cwd: cwd,
            detached: true
        });
        process.exit(0);
    }
    util.openTerm = openTerm;
})(util || (util = {}));
module.exports = util;
