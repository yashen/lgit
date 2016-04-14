import * as child_process from 'child_process';

import * as commander from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

let clone = commander.command('clone <url>');

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
    let urlInfo = new GitUrlInfo(url);
    let hostPath = path.join(rootPath, urlInfo.host);
    ensureDir(hostPath);

    let parentPath = path.join(hostPath, urlInfo.path);
    ensureDir(parentPath)
    var folder = path.join(parentPath, urlInfo.name);
    if (!fs.existsSync(folder)) {
        syncExec(`/usr/bin/git clone ${urlInfo.url} ${urlInfo.name}`, parentPath);
    }else{
        console.log("The project has cloned");
    }

    var nameTarget = path.join(namesRoot, urlInfo.name);
    if (!fs.existsSync(nameTarget)) {
        fs.symlinkSync(folder, nameTarget,'dir');
        console.log(`Create link for ${urlInfo.name} success`);
    }else{
        console.log(`The name ${urlInfo.name} has existed`);
    }

});


function syncExec(command: string, cwd = null): void {
    var result = child_process.execSync(command, {
        encoding: 'utf-8',
        cwd: cwd
    });
    console.log(result);
}

class GitUrlInfo {
    host: string;
    path: string;
    name: string;
    url: string;
    ssh: boolean;

    constructor(url: string) {
        this.url = url;

        if (this.url.slice(0, 4) == "http") {
            this.parsehttp();
        }
        else {
            this.parsessh();
        }
    }

    parsessh() {
        this.ssh = true;
        let parts = this.url.split(":");
        this.host = parts[0];
        var rightParts = parts[1].split("/");
        let name = rightParts[rightParts.length - 1];
        if (name.slice(-4) == ".git") {
            name = name.slice(0, -4);
        }
        this.name = name;
        this.path = rightParts.slice(0, -1).join("/");
    }

    parsehttp() {
        let parts = this.url.split("/");
        let name = parts[parts.length - 1];
        if (name.slice(-4) == ".git") {
            name = name.slice(0, -4);
        }
        this.name = name;
        this.path = parts[parts.length - 2];
        this.host = parts.slice(0, -2).join("\\");
    }
}

commander.parse(process.argv);