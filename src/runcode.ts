import * as vscode from 'vscode';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import * as sevenBin from '7zip-bin';
import { extractFull } from 'node-7z';
const execPromisified = promisify(exec);
class CodeRunner {

    private compileCommand: string | undefined;

    private lastRunCommand: string | null = null;

    private isWin: boolean;

    initialized: boolean = false;

    constructor() {
        this.isWin = os.platform().indexOf('win') > -1;
        this.init();
    }
    async init() {

        const where = this.isWin ? 'where' : 'whereis';
        const savedCommand: string | undefined = vscode.workspace.getConfiguration().get('conf.projcpp.compileCommand');
        if (savedCommand) {
            if (fs.existsSync(savedCommand) || await CodeRunner.checkIfCommand(where + ' ' + savedCommand)) {

                this.compileCommand = savedCommand;
                this.finishInit();
                return;
            }
        }
        if (await CodeRunner.checkIfCommand(where + ' g++')) {
            this.compileCommand = 'g++';
            vscode.window.showInformationMessage('Found g++!');
        }
        else if (await CodeRunner.checkIfCommand(where + ' gcc')) {
            this.compileCommand = 'gcc';
            vscode.window.showInformationMessage('Found gcc!');
        }
        else if (fs.existsSync('C:\\Program Files (x86)\\CodeBlocks\\MinGW')) {
            this.compileCommand = 'C:\\Program Files (x86)\\CodeBlocks\\MinGW\\bin\\g++.exe';
            vscode.window.showInformationMessage('Found 32bit CodeBlocks with MinGW!');
        }
        else if (fs.existsSync('C:\\Program Files\\CodeBlocks\\MinGW')) {
            this.compileCommand = 'C:\\Program Files\\CodeBlocks\\MinGW\\bin\\g++.exe';
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
                if (path) { this.compileCommand = path[0].fsPath; }
                else { return; }
            }
            else if (response === 'Download') {
                const file = fs.createWriteStream(process.env.USERPROFILE + '/Downloads/mingw.7z');
                vscode.window.showInformationMessage('Downloading...');
                const request = await new Promise<boolean>((resolve) => {
                    https.get('https://deac-ams.dl.sourceforge.net/project/mingw-w64/Toolchains%20targetting%20Win64/Personal%20Builds/mingw-builds/8.1.0/threads-posix/seh/x86_64-8.1.0-release-posix-seh-rt_v6-rev0.7z',
                        (response) => {
                            response.pipe(file);
                            response.on('end', () => resolve(true));
                            response.on('error', () => resolve(false));
                        });
                });
                if (!request) {
                    vscode.window.showInformationMessage('Failed to download compiler!');
                }

                const ready = await vscode.window.showInformationMessage('C++ compiler downloaded. Do you want to extract it?', 'Choose extract location', 'No');
                if (!ready || ready === 'No') { return; }

                const installPath = await vscode.window.showOpenDialog(
                    {
                        canSelectFolders: true,
                        title: 'C++ compiler extract location',
                        canSelectMany: false,
                        canSelectFiles: false,
                    });
                if (!installPath) { return; }
                const pathTo7zip = sevenBin.path7za;
                vscode.window.showInformationMessage('Extracting...');
                await new Promise<void>((resolve) => {
                    const myStream = extractFull(file.path.toString(), installPath[0].fsPath, {
                        $bin: pathTo7zip
                    });
                    myStream.on('end', resolve);
                    myStream.on('error', (err) => {
                        console.log(err);
                        resolve();
                    });
                });

                file.close();
                vscode.window.showInformationMessage('Extracted! Everything\'s ready to go!');
                this.compileCommand = installPath[0].fsPath + '/mingw64/bin/g++.exe';
            }
            else {
                return;
            }
        }
        this.finishInit();
    }

    async finishInit(): Promise<void> {
        if (!this.compileCommand) { return; }
        await vscode.workspace.getConfiguration().update('conf.projcpp.compileCommand', this.compileCommand, vscode.ConfigurationTarget.Global);
        const winDirName = CodeRunner.getDir(this.compileCommand).replace(/\//g, '\\');
        if (this.isWin && (this.compileCommand.includes('/') || this.compileCommand.includes('\\')) && !process.env.PATH?.includes(winDirName)) {

            const term = vscode.window.createTerminal({shellPath: 'C:\\Windows\\System32\\cmd.exe'});
            term.sendText(`for /f "skip=2 tokens=3*" %a in ('reg query HKCU\\Environment /v PATH') do @if [%b]==[] ( @setx PATH "${winDirName};%~a" ) else ( @setx PATH "${winDirName};%~a %~b" )`, true);
            term.sendText('exit', true);
            vscode.window.showInformationMessage('Added compiler to path. Please restart VSCode for this to work (only needed one time)');
        }
        this.initialized = true;
        if (this.lastRunCommand) {
            this.run(this.lastRunCommand);
        }
    }

    static async checkIfCommand(command: string): Promise<boolean> {
        try {
            const { stdout, stderr } = await execPromisified(command);
            if (stderr.length > 0) { console.error(stderr); return false; }
        } catch (e) {
            return false;
        }
        return true;
    }

    static getDir(file: string): string {
        file = file.replace(/\\/g, '/');
        return file.substring(0, file.lastIndexOf("/") + 1);
    }

    async run(fileUri: string): Promise<void> {

        if (this.compileCommand && (this.compileCommand.includes('/') || this.compileCommand.includes('\\')) && (!fs.existsSync(this.compileCommand) && !await CodeRunner.checkIfCommand(this.compileCommand))) {
            this.compileCommand = undefined;
            this.initialized = false;
            this.init();
            return;
        }
        if (!this.initialized) {
            this.lastRunCommand = fileUri;
            return;
        } else { this.lastRunCommand = null; }

        const term = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
        console.log('Terminal created!');
        const dir = CodeRunner.getDir(fileUri);
        console.log(dir);
        let shell: string | undefined = vscode.workspace.getConfiguration().get('terminal.integrated.shell.windows');
        console.log(shell);
        if (!shell) {
            if(fs.existsSync('C:\\Windows\\System32\\WindowsPowerShell')) {
                shell = 'powershell';
            }
            else {shell = 'cmd';}
        }
        const pwrshll = shell?.includes('powershell');
        const cmd = shell?.includes('cmd');
        //term.sendText(`cd "${dir}"`, true);
        if (!fs.existsSync(dir + 'bin')) {
            term.sendText(`mkdir "${dir}bin"`, true);
        }
        term.sendText(`${pwrshll ? '&' : ''} "${this.compileCommand}" *.cpp -o bin/main.exe`, true);
        term.sendText((this.isWin && (pwrshll || cmd) ? '.\\' : './') + 'bin' + (this.isWin && (pwrshll || cmd) ? '\\' : '/') + 'main.exe', true);
        term.show();
    }
}
export default CodeRunner;