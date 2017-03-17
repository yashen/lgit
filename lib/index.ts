import * as child_process from 'child_process';
import * as commander from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from './util';

let clone = commander.command('clone <url>');
let add = commander.command("add [path]");
let open = commander.command("open <nameOrUrl>");
let list = commander.command("list");

list.action(function(){
    var rootLength = util.ensoureRootPath().length;
    var list = util.getAllGitPath();
    list.forEach((item)=>{
        console.log(item.substring(rootLength+1));
    });
});

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

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
        let results = util.find(nameOrUrl) ;

        if(results.length == 1){
            targetDir = results[0]
        }
        else if(results.length >1){
            console.log("find multi result")

            let rootLength = util.ensoureRootPath().length;

            results.forEach((item)=>{
                console.log(item.substring(rootLength+1));
            });

            return;
        }
    }
    if (targetDir) {
        util.openFolder(targetDir);
    } else {
        console.log(`Not found ${nameOrUrl}`);
    }

});


commander.parse(process.argv);