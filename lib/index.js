"use strict";
var commander = require('commander');
var path = require('path');
var fs = require('fs');
var os = require('os');
var util = require('./util');
var clone = commander.command('clone <url>');
var add = commander.command("add [path]");
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
    var urlInfo = new util.GitUrlInfo(url, rootPath);
    var hostPath = path.join(rootPath, urlInfo.host);
    ensureDir(hostPath);
    var parentPath = path.join(hostPath, urlInfo.path);
    ensureDir(parentPath);
    var folder = path.join(parentPath, urlInfo.name);
    if (!fs.existsSync(folder)) {
        util.syncExec("/usr/bin/git clone " + urlInfo.url + " " + urlInfo.name, parentPath);
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
add.action(function (path) {
    util.isGit(path).then(function () {
        return util.getOriginUrl(path);
    })
        .then(function (url) {
        return util.clone(url, path, rootPath);
    })
        .then(function (target) {
        console.log("clone success");
        console.log(target);
    })
        .catch(function (reason) {
        console.log(reason);
    });
});
commander.parse(process.argv);
