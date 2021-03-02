import * as vscode from 'vscode';
import * as fs from 'fs';

const sampleFile = `#include <iostream>
using namespace std;

int main()
{
    cout << "Hello world" << endl;

    return 0;
}
`;

export const createProject = (project: {name: string; path: string;}) => {
    if(!fs.existsSync(project.path)) {
        fs.mkdirSync(project.path, {recursive: true});
        fs.appendFileSync(project.path + '/main.cpp', sampleFile);
    }
    else {
        fs.mkdirSync(project.path, {recursive: true});
    }
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.path));
    // .then(
    //     () => vscode.workspace.openTextDocument(vscode.Uri.file(project.path + '/main.cpp')).then((doc) => vscode.window.showTextDocument(doc))
    // );
    
};

export const getProjects = (path: string, callback: (path:string) => void, skip: boolean = true) => {
    fs.readdir(path, (err, files) => {
        if(err) {throw err;}
        if(files.some(x => x.includes('.'))) {
            callback(path);
            if(!skip) {
                return;
            }
        }
        for(let i = 0; i < files.length; i++) {
            const fullPath = vscode.Uri.joinPath(vscode.Uri.file(path), files[i]).fsPath;
            fs.lstat(fullPath, (err, stats) => {
                if(err) {
                    throw err;
                }
                if(stats.isDirectory()) {
                    getProjects(fullPath, callback, false);
                }
            });
        }
    });
};