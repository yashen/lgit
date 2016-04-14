"use strict";
var child_process = require('child_process');
var commander = require('commander');
var path = require('path');
var fs = require('fs');
var os = require('os');
var clone = commander.command('clone <url>');
var rootPath = path.join(os.homedir(), '.lgit');
ensureDir(rootPath);
var namesRoot = path.join(rootPath, "names");
ensureDir(namesRoot);
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
clone.action(function (url) {
    var urlInfo = new GitUrlInfo(url);
    var hostPath = path.join(rootPath, urlInfo.host);
    ensureDir(hostPath);
    var parentPath = path.join(hostPath, urlInfo.path);
    ensureDir(parentPath);
    var folder = path.join(parentPath, urlInfo.name);
    if (!fs.existsSync(folder)) {
        syncExec("/usr/bin/git clone " + urlInfo.url + " " + urlInfo.name, parentPath);
    }
    else {
        console.log("The project has cloned");
    }
    var nameTarget = path.join(namesRoot, urlInfo.name);
    if (!fs.existsSync(nameTarget)) {
        fs.symlinkSync(folder, nameTarget, 'dir');
        console.log("Create link for " + urlInfo.name + " success");
    }
    else {
        console.log("The name " + urlInfo.name + " has existed");
    }
});
function syncExec(command, cwd) {
    if (cwd === void 0) { cwd = null; }
    var result = child_process.execSync(command, {
        encoding: 'utf-8',
        cwd: cwd
    });
    console.log(result);
}
var GitUrlInfo = (function () {
    function GitUrlInfo(url) {
        this.url = url;
        if (this.url.slice(0, 4) == "http") {
            this.parsehttp();
        }
        else {
            this.parsessh();
        }
    }
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
        this.host = parts.slice(0, -2).join("\\");
    };
    return GitUrlInfo;
}());
commander.parse(process.argv);
