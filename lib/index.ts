import * as child_process from 'child_process';
import * as commander from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as util from './util';

let clone = commander.command('clone <url>');
let add = commander.command("add [path]");

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

commander.parse(process.argv);