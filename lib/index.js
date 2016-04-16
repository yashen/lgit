"use strict";
var commander = require('commander');
var fs = require('fs');
var util = require('./util');
var clone = commander.command('clone <url>');
var add = commander.command("add [path]");
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
clone.action(function (url) {
    util.clone(url)
        .then(function (result) {
        console.log("Success clone to " + result);
    })
        .catch(function (reason) {
        console.log(reason.message || reason);
    });
});
add.action(function (path) {
    util.isGit(path).then(function () {
        return util.getOriginUrl(path);
    })
        .then(function (url) {
        return util.add(url, path);
    })
        .then(function (target) {
        console.log("add success");
        console.log(target);
    })
        .catch(function (reason) {
        console.log(reason.message || reason);
    });
});
commander.parse(process.argv);
