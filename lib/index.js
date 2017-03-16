"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander = require("commander");
const fs = require("fs");
const util = require("./util");
let clone = commander.command('clone <url>');
let add = commander.command("add [path]");
let open = commander.command("open <nameOrUrl>");
let link = commander.command("link <nameOrUrl> [linkname]");
let list = commander.command("list");
list.action(function () {
    var rootLength = util.ensoureRootPath().length;
    var list = util.getAllGitPath();
    list.forEach((item) => {
        console.log(item.substring(rootLength + 1));
    });
});
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
link.action(function (nameOrUrl, linkname) {
    let isUrl = util.GitUrlInfo.IsGitUrl(nameOrUrl);
    let targetDir;
    if (isUrl) {
        let urlInfo = new util.GitUrlInfo(nameOrUrl);
        targetDir = urlInfo.ensureTargetDir();
        linkname = linkname || urlInfo.name;
    }
    else {
        targetDir = util.find(nameOrUrl);
        linkname = linkname || nameOrUrl;
    }
    fs.symlinkSync(targetDir, linkname, 'dir');
});
clone.action(function (url) {
    util.clone(url)
        .then((result) => {
        console.log(`Success clone to ${result}`);
    })
        .catch(function (reason) {
        console.log(reason.message || reason);
    });
});
add.action(function (path) {
    util.isGit(path).then(() => {
        return util.getOriginUrl(path);
    })
        .then(function (url) {
        return util.add(url, path);
    })
        .then((target) => {
        console.log("add success");
        console.log(target);
    })
        .catch(function (reason) {
        console.log(reason.message || reason);
    });
});
open.action(function (nameOrUrl) {
    let isUrl = util.GitUrlInfo.IsGitUrl(nameOrUrl);
    let targetDir;
    if (isUrl) {
        let urlInfo = new util.GitUrlInfo(nameOrUrl);
        targetDir = urlInfo.ensureTargetDir();
    }
    else {
        let results = util.find(nameOrUrl);
        if (results.length == 1) {
            targetDir = results[0];
        }
        else if (results.length > 1) {
            console.log("find multi result");
            let rootLength = util.ensoureRootPath().length;
            results.forEach((item) => {
                console.log(item.substring(rootLength + 1));
            });
            return;
        }
    }
    if (targetDir) {
        util.openFolder(targetDir);
    }
    else {
        console.log(`Not found ${nameOrUrl}`);
    }
});
commander.parse(process.argv);
