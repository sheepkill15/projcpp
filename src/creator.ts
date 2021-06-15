import * as vscode from 'vscode';
import {snakeCase} from 'snake-case';
import * as fs from 'fs';
import * as path_module from 'path';

const openCreateWindow = async () => {
    const result: string | undefined = await vscode.window.showQuickPick(['class', 'struct'], 
    {canPickMany: false, placeHolder: 'Choose an item'});
    if(!result) {return;}

    const name: string | undefined = await vscode.window.showInputBox(
        {prompt: `Name of the ${result}`});
    if(!name) {return;}

    const generate: string | undefined = await vscode.window.showQuickPick(['.cpp / .h', '.h', '.cpp'], 
    {placeHolder: 'What files to create'});
    if(!generate) {return;}

    const fileName = snakeCase(name);
    const className = snakeCase(name, {transform: (part) => part});
    const define = snakeCase(name, {transform: (part => part.toUpperCase())});
    const dir = path_module.dirname(vscode.window.activeTextEditor?.document.fileName ?? '');
    if(dir === '.') {
        return;
    }
    const path = path_module.join(dir, fileName);

    if(generate.includes('.h')) {
        const headerFile = `#ifndef ${define}_H
#define ${define}_H

${result} ${className}
{
public:
    ${className}();     //constructor
    ~${className}();    //destructor
};

#endif`;

        fs.appendFile(path + '.h', headerFile, () => console.log('Success!'));
    }
    if(generate.includes('.cpp')) {
        const implFile = `#include "${fileName}.h"

${className}::${className}()
{

}

${className}::~${className}()
{

}`;

        fs.appendFile(path + '.cpp', implFile, () => console.log('Success!'));
    }
    vscode.window.showInformationMessage(`Created ${result} ${className}!`);
};

export default openCreateWindow;