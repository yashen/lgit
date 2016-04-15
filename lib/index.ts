import * as child_process from 'child_process';
import * as commander from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from './util';

let clone = commander.command('clone <url>');
let add = commander.command("add [path]");

let rootPath = path.join(os.homedir(), '.lgit');
ensureDir(rootPath);
let namesRoot = path.join(rootPath, "names");
ensureDir(namesRoot);

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

clone.action(function(url: string) {
    let urlInfo = new util.GitUrlInfo(url,rootPath);
    let hostPath = path.join(rootPath, urlInfo.host);
    ensureDir(hostPath);

    let parentPath = path.join(hostPath, urlInfo.path);
    ensureDir(parentPath)
    var folder = path.join(parentPath, urlInfo.name);
    if (!fs.existsSync(folder)) {
        util.syncExec(`/usr/bin/git clone ${urlInfo.url} ${urlInfo.name}`, parentPath);
    } else {
        console.log("The project has cloned");
    }

    var nameTarget = path.join(namesRoot, urlInfo.name);
    if (!fs.existsSync(nameTarget)) {
        fs.symlinkSync(folder, nameTarget, 'dir');
        console.log(`Create link for ${urlInfo.name} success`);
    } else {
        console.log(`The name ${urlInfo.name} has existed`);
    }

});

add.action(function(path) {
    util.isGit(path).then(
        ()=>{
           return util.getOriginUrl(path); 
        }
    )
    .then(
        function(url){
            return util.clone(url,path,rootPath)
        }
    )
    .then(
        (target)=>{
            console.log("clone success");
            console.log(target);
        }
    )
    .catch(function(reason){
       console.log(reason); 
    });
    
    



});

commander.parse(process.argv);