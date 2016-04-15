"use strict";
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var util;
(function (util) {
    function ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
    }
    util.ensureDir = ensureDir;
    var GitUrlInfo = (function () {
        function GitUrlInfo(url, rootPath) {
            this.url = url;
            this.rootPath = rootPath;
            if (this.url.slice(0, 4) == "http") {
                this.parsehttp();
            }
            else {
                this.parsessh();
            }
        }
        GitUrlInfo.prototype.ensureParentDir = function () {
            var hostPath = path.join(this.rootPath, this.host);
            util.ensureDir(hostPath);
            var parentPath = path.join(hostPath, this.path);
            util.ensureDir(parentPath);
            return parentPath;
        };
        GitUrlInfo.prototype.parsessh = function () {
            this.ssh = true;
            var parts = this.url.split(":");
            this.host = parts[0];
            var rightParts = parts[1].split("/");
            var name = rightParts[rightParts.length - 1];
            if (name.slice(-4) == ".git") {
                name = name.slice(0, -4);
            }
            this.name = name;
            this.path = rightParts.slice(0, -1).join("/");
        };
        GitUrlInfo.prototype.parsehttp = function () {
            var parts = this.url.split("/");
            var name = parts[parts.length - 1];
            if (name.slice(-4) == ".git") {
                name = name.slice(0, -4);
            }
            this.name = name;
            this.path = parts[parts.length - 2];
            this.host = parts.slice(0, -2).join("|");
        };
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
    function syncExec(command, cwd, quiet) {
        if (cwd === void 0) { cwd = null; }
        if (quiet === void 0) { quiet = false; }
        var result = child_process.execSync(command, {
            encoding: 'utf-8',
            cwd: cwd
        });
        if (!quiet) {
            console.log(result);
        }
        return result;
    }
    util.syncExec = syncExec;
    function getOriginUrl(path) {
        var result = child_process.spawnSync('git', ['remote', '-v'], {
            encoding: 'utf-8',
            cwd: path
        });
        for (var _i = 0, _a = result.stdout.split("\n"); _i < _a.length; _i++) {
            var item = _a[_i];
            if (item.slice(0, 6) == "origin") {
                var parts = item.split("\t");
                return Promise.resolve(parts[1].split(" ")[0]);
            }
        }
        return Promise.reject("Not find origin url");
    }
    util.getOriginUrl = getOriginUrl;
    function clone(url, localPath, rootPath) {
        var urlInfo = new GitUrlInfo(url, rootPath);
        var parentPath = urlInfo.ensureParentDir();
        var targetPath = path.join(parentPath, urlInfo.name);
        if (fs.existsSync(targetPath)) {
            return Promise.reject("folder [" + targetPath + "] has exited");
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
        return Promise.resolve(targetPath);
    }
    util.clone = clone;
})(util || (util = {}));
module.exports = util;
