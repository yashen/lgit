import * as child_process from 'child_process';
import * as commander from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from './util';

let clone = commander.command('clone <url>');
let add = commander.command("add [path]");
let open = commander.command("open <name>");
let link = commander.command("link <name> [linkname]");

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

link.action(function(nameOrUrl, linkname) {
    let isUrl = util.GitUrlInfo.IsGitUrl(nameOrUrl);
    let targetDir;
    if (isUrl) {
        let urlInfo = new util.GitUrlInfo(nameOrUrl);
        targetDir = urlInfo.ensureTargetDir();
        linkname = linkname || urlInfo.name;
    } else {
        targetDir = util.find(nameOrUrl);
        linkname = linkname || nameOrUrl;
    }
    fs.symlinkSync(targetDir,linkname,'dir');
});

clone.action(function(url: string) {
    util.clone(url)
        .then(
        (result) => {
            console.log(`Success clone to ${result}`);
        }
        )
        .catch(function(reason) {
            console.log(reason.message || reason);
        });

});

add.action(function(path) {
    util.isGit(path).then(
        () => {
            return util.getOriginUrl(path);
        }
    )
        .then(
        function(url) {
            return util.add(url, path);
        }
        )
        .then(
        (target) => {
            console.log("add success");
            console.log(target);
        }
        )
        .catch(function(reason) {
            console.log(reason.message || reason);
        });
});

open.action(function(nameOrUrl) {
    let isUrl = util.GitUrlInfo.IsGitUrl(nameOrUrl);
    let targetDir;
    if (isUrl) {
        let urlInfo = new util.GitUrlInfo(nameOrUrl);
        targetDir = urlInfo.ensureTargetDir();
    } else {
        targetDir = util.find(nameOrUrl);
    }
    if (targetDir) {
        util.openTerm(targetDir);
    } else {
        console.log(`Not found ${nameOrUrl}`);
    }

});


commander.parse(process.argv);