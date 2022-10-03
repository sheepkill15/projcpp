import * as vscode from 'vscode';

import { exec } from 'child_process';
import { promisify } from 'util';
import {platform} from 'os';
import * as fs from 'fs';
import * as https from 'https';
import * as sevenBin from '7zip-bin';
import { extractFull } from 'node-7z';
import * as path from 'path';

const execPromisified = promisify(exec);

export const isWin = platform().indexOf('win') > -1;
const where = isWin ? 'where' : 'whereis'; 

export const checkIfCommand = async (command: string): Promise<boolean> => {
    try {
        const { stdout, stderr } = await execPromisified(`${where} ${command}`);
        if (stderr.length > 0) { console.error(stderr); }
    } catch (e) {
        return false;
    }
    return true;
};

export const findCompiler = async (outputChannel: vscode.OutputChannel): Promise<string> => {
    let modifiedCommand: string = '';
    if (await checkIfCommand('g++')) {
        modifiedCommand = 'g++';
        vscode.window.showInformationMessage('Found g++!');
    }
    else if (await checkIfCommand('gcc')) {
        modifiedCommand = 'gcc';
        vscode.window.showInformationMessage('Found gcc!');
    }
    else if (fs.existsSync('C:\\Program Files (x86)\\CodeBlocks\\MinGW')) {
        modifiedCommand = 'C:\\Program Files (x86)\\CodeBlocks\\MinGW\\bin\\g++.exe';
        vscode.window.showInformationMessage('Found 32bit CodeBlocks with MinGW!');
    }
    else if (fs.existsSync('C:\\Program Files\\CodeBlocks\\MinGW')) {
        modifiedCommand = 'C:\\Program Files\\CodeBlocks\\MinGW\\bin\\g++.exe';
        vscode.window.showInformationMessage('Found CodeBlocks with MinGW!');
    }
    else {

        const response = await vscode.window.showInformationMessage(
            'C++ compiler could not be found. Do you have it installed or wish to download it?'
            , 'Choose installed executable', 'Download');
        if (response === 'Choose installed executable') {
            const path = await vscode.window.showOpenDialog(
                {
                    canSelectFolders: false,
                    title: 'C++ compiler executable',
                    canSelectMany: false,
                    canSelectFiles: true,
                });
            if (path) { modifiedCommand = path[0].fsPath; }
            else { return modifiedCommand; }
        }
        else if (response === 'Download') {
            const file = fs.createWriteStream(process.env.USERPROFILE + '/Downloads/mingw.7z');
            vscode.window.showInformationMessage('Downloading...');
            let receivedBytes = 0;
            let totalBytes = 0;
            outputChannel.clear();
            outputChannel.show();
            outputChannel.appendLine('Download progress:');
            const request = await new Promise<boolean>((resolve) => {
                https.get('https://deac-ams.dl.sourceforge.net/project/mingw-w64/Toolchains%20targetting%20Win64/Personal%20Builds/mingw-builds/8.1.0/threads-posix/seh/x86_64-8.1.0-release-posix-seh-rt_v6-rev0.7z',
                    (response) => {
                        totalBytes = parseInt(response.headers['content-length'] ?? '1');
                        response.pipe(file);
                        response.on('end', () => resolve(true));
                        response.on('error', () => resolve(false));
                        response.on('data', (chunk) => {
                            receivedBytes += chunk.length;
                            outputChannel.appendLine(`${((receivedBytes * 100) / totalBytes).toFixed(2)} %`);
                        });
                    });
            });
            if (!request) {
                vscode.window.showInformationMessage('Failed to download compiler!');
            }

            const ready = await vscode.window.showInformationMessage('C++ compiler downloaded. Do you want to extract it?', 'Choose extract location', 'No');
            if (!ready || ready === 'No') { return modifiedCommand; }

            const installPath = await vscode.window.showOpenDialog(
                {
                    canSelectFolders: true,
                    title: 'C++ compiler extract location',
                    canSelectMany: false,
                    canSelectFiles: false,
                });
            if (!installPath) { return modifiedCommand; }
            const pathTo7zip = sevenBin.path7za;
            vscode.window.showInformationMessage('Extracting...');
            outputChannel.clear();
            outputChannel.show();
            outputChannel.appendLine('Extract progress:');
            await new Promise<void>((resolve) => {
                const myStream = extractFull(file.path.toString(), installPath[0].fsPath, {
                    $bin: pathTo7zip,
                    $progress: true,
                });
                myStream.on('end', resolve);
                myStream.on('error', (err) => {
                    console.log(err);
                    resolve();
                });
                myStream.on('progress', (progress) => {
                    outputChannel.appendLine(`${progress.percent} %`);
                });
            });

            file.close();
            modifiedCommand = vscode.Uri.joinPath(installPath[0], 'mingw64/bin/g++.exe').fsPath;
        }
        else {
            return modifiedCommand;
        }
    }
    return modifiedCommand;
};

export const addToPath = async (dir: string) => {
    await execPromisified(`for /f "skip=2 tokens=3*" %a in ('reg query HKCU\\Environment /v PATH') do @if [%b]==[] ( @setx PATH "${dir};%~a" ) else ( @setx PATH "${dir};%~a %~b" )`, {shell: 'C:\\Windows\\System32\\cmd.exe'});
};

export const compile = async (compileCommand: string, dir: string, type: 'c' | 'cpp'): Promise<string> => {
    try {
        const { stdout, stderr } = await execPromisified(`${compileCommand} *.${type} -o ${path.join('bin', isWin ? 'main.exe' : 'main')}`, { cwd: dir });
        if (stderr.length > 0) {
            return stderr;
        }
    } catch (e) {
        return e.stderr;
    }
    return '';
};