import * as vscode from 'vscode';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as https from 'https';
import * as sevenBin from '7zip-bin';
import { extractFull } from 'node-7z';
import * as path from 'path';
const execPromisified = promisify(exec);
class CodeRunner {

    private lastRunCommand: string | null = null;

    private isWin: boolean;

    private pathAdded: boolean = false;

    initialized: boolean = false;

    constructor() {
        this.isWin = os.platform().indexOf('win') > -1;
        this.init();
    }
    async init() {

        const where = this.isWin ? 'where' : 'whereis';
        const savedCommand: string | undefined = vscode.workspace.getConfiguration().get('conf.projcpp.compileCommand');
        let modifiedCommand: string = '';
        if (savedCommand) {
            if (fs.existsSync(savedCommand) || await CodeRunner.checkIfCommand(where + ' ' + savedCommand)) {
                this.finishInit();
                return;
            }
        }
        if (await CodeRunner.checkIfCommand(where + ' g++')) {
            modifiedCommand = 'g++';
            vscode.window.showInformationMessage('Found g++!');
        }
        else if (await CodeRunner.checkIfCommand(where + ' gcc')) {
            modifiedCommand = 'gcc';
            vscode.window.showInformationMessage('Found gcc!');
        }
        else if (fs.existsSync('C:\\Program Files (x86)\\CodeBlocks\\MinGW')) {
            modifiedCommand = '"C:\\Program Files (x86)\\CodeBlocks\\MinGW\\bin\\g++.exe"';
            vscode.window.showInformationMessage('Found 32bit CodeBlocks with MinGW!');
        }
        else if (fs.existsSync('C:\\Program Files\\CodeBlocks\\MinGW')) {
            modifiedCommand = '"C:\\Program Files\\CodeBlocks\\MinGW\\bin\\g++.exe"';
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
                if (path) { modifiedCommand = `"${path[0].fsPath}"`; }
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
                modifiedCommand = '"' + vscode.Uri.joinPath(installPath[0], 'mingw64/bin/g++.exe').fsPath + '"';
            }
            else {
                return;
            }
        }
        await vscode.workspace.getConfiguration().update("conf.projcpp.compileCommand", modifiedCommand, vscode.ConfigurationTarget.Global);
        this.finishInit();
    }

    async finishInit(): Promise<void> {
        const compileCommand: string | undefined = await vscode.workspace.getConfiguration().get("conf.projcpp.compileCommand");
        if(!compileCommand) {return;}
        const winDirName = path.dirname(compileCommand);
        if (!this.pathAdded && this.isWin && (compileCommand.includes(path.sep)) && !process.env.PATH?.includes(winDirName)) {

            const term = vscode.window.createTerminal({shellPath: 'C:\\Windows\\System32\\cmd.exe'});
            term.sendText(`for /f "skip=2 tokens=3*" %a in ('reg query HKCU\\Environment /v PATH') do @if [%b]==[] ( @setx PATH "${winDirName};%~a" ) else ( @setx PATH "${winDirName};%~a %~b" )`, true);
            term.sendText('exit', true);
            vscode.window.showInformationMessage('Added compiler to path. Please restart VSCode for this to work (only needed one time)');
            this.pathAdded = true;
        }

        this.initialized = true;
        if (this.lastRunCommand) {
            this.run(this.lastRunCommand);
        }
    }

    static async checkIfCommand(command: string): Promise<boolean> {
        try {
            const { stdout, stderr } = await execPromisified(command);
            if (stderr.length > 0) { console.error(stderr); }
        } catch (e) {
            return false;
        }
        return true;
    }

    async run(fileUri: string): Promise<void> {
        if (!this.initialized) {
            this.lastRunCommand = fileUri;
            return;
        } else { this.lastRunCommand = null; }
        
        const compileCommand: string | undefined = await vscode.workspace.getConfiguration().get("conf.projcpp.compileCommand");
        if (!compileCommand || (compileCommand && (compileCommand.includes(path.sep)) && (!fs.existsSync(compileCommand) && !await CodeRunner.checkIfCommand(compileCommand)))) {
            await vscode.workspace.getConfiguration().update("conf.projcpp.compileCommand", undefined, vscode.ConfigurationTarget.Global);
            this.initialized = false;
            this.lastRunCommand = fileUri;
            this.init();
            return;
        }

        await vscode.workspace.saveAll();
        const dir = path.dirname(fileUri);
        let shell: string | undefined = vscode.workspace.getConfiguration().get('terminal.integrated.shell.windows');
        if (!shell) {
            if(fs.existsSync('C:\\Windows\\System32\\WindowsPowerShell')) {
                shell = 'powershell';
            }
            else {shell = 'cmd';}
        }

        const externTerm = vscode.workspace.getConfiguration().get("conf.projcpp.externTerm") ?? false;
        
        if (!fs.existsSync(path.join(dir, 'bin'))) {
            fs.mkdirSync(path.join(dir, 'bin'));
        }
        if(!externTerm) {
            this.runInternal(compileCommand ?? '', fileUri, shell, dir);
        }
        else {
            this.runExternal(compileCommand ?? '', fileUri, shell, dir);
        }
    }

    async runInternal(compileCommand: string, fileUri: string, shell: string, dir: string) {

        const term = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
        const pwrshll = shell?.includes('powershell');
        const cmd = shell?.includes('cmd');
        //term.sendText(`cd "${dir}"`, true);
        const mainExe = `bin${(this.isWin && (pwrshll || cmd) ? '\\' : '/')}${this.isWin ? 'main.exe' : 'main.a'}`;
        term.sendText(`${this.isWin && pwrshll ? '&' : ''} ${compileCommand} *.cpp -o ${mainExe}`, true);
        term.sendText((this.isWin && (pwrshll || cmd) ? '.\\' : './') + mainExe, true);
        term.show();
    }

    async runExternal(compileCommand: string, fileUri: string, shell: string, dir: string) {
        const pwrshll = shell?.includes('powershell');
        const cmd = shell?.includes('cmd');
        const mainExe = path.join('bin', this.isWin ? 'main.exe' : 'main.a');
        exec(`start "ProjCpp" cmd.exe /K "cd /d ${dir} & ${compileCommand} *.cpp -o ${mainExe} & ${mainExe} & echo. & echo Program exited with return code %errorlevel% & pause & exit"`, {cwd: dir});
    }
}
export default CodeRunner;