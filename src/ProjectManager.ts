import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path_module from 'path';

const sampleFile = `#include <iostream>

using namespace std;

int main()
{
    cout << "Hello world!" << endl;

    return 0;
}
`;

export const createProject = (project: { name: string; path: string; }) => {
    if (!fs.existsSync(project.path)) {
        fs.mkdirSync(project.path, { recursive: true });
        fs.appendFileSync(path_module.join(project.path, 'main.cpp'), sampleFile);
    }
    else {
        fs.mkdirSync(project.path, { recursive: true });
    }
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.path));
    // .then(
    //     () => vscode.workspace.openTextDocument(vscode.Uri.file(project.path + '/main.cpp')).then((doc) => vscode.window.showTextDocument(doc))
    // );

};

export const getProjects = (path: string, callback: (path: string) => void, skip: boolean = true) => {
    fs.readdir(path, { withFileTypes: true }, (err, files) => {
        if (err) { throw err; }
        if (files.some(x => x.isFile())) {
            callback(path);
            if (!skip) {
                return;
            }
        }
        for (let i = 0; i < files.length; i++) {

            if (files[i].isDirectory()) {
                const fullPath = path_module.join(path, files[i].name);
                getProjects(fullPath, callback, false);
            }
        }
    });
};