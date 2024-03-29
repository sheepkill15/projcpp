import * as vscode from 'vscode';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import * as helper from './helper';

class CodeRunner {

    private lastRunCommand: string | null = null;

    private pathAdded: boolean = false;

    initialized: boolean = false;

    private outputChannel: vscode.OutputChannel;

    constructor(outpuCh: vscode.OutputChannel) {
        this.outputChannel = outpuCh;
        this.init();
    }
    async init() {
        if (this.pathAdded) {
            this.outputChannel.clear();
            this.outputChannel.appendLine('Please restart VSCode to finish setting up.');
            this.outputChannel.show();
            return;
        }
        const savedCommand: string | undefined = vscode.workspace.getConfiguration().get('conf.projcpp.compileCommand');
        if (savedCommand) {
            if (await helper.checkIfCommand(savedCommand)) {
                this.finishInit();
                return;
            }
        }
        const modifiedCommand: string = await helper.findCompiler(this.outputChannel);
        if (helper.isWin && (modifiedCommand.includes(path.sep)) && !process.env.PATH?.includes(modifiedCommand)) {
            const winDirName = path.dirname(modifiedCommand);
            await helper.addToPath(winDirName);
            vscode.window.showInformationMessage('Added compiler to path. Please restart VSCode for this to work (only needed one time)');
            this.pathAdded = true;
            return;
        }
        await vscode.workspace.getConfiguration().update('conf.projcpp.compileCommand', modifiedCommand, vscode.ConfigurationTarget.Global);

        this.finishInit();
    }

    async finishInit(): Promise<void> {
        const compileCommand: string | undefined = await vscode.workspace.getConfiguration().get("conf.projcpp.compileCommand");
        if (!compileCommand) { return; }


        this.initialized = true;
        if (this.lastRunCommand) {
            this.run(this.lastRunCommand);
        }
    }

    async run(fileUri: string): Promise<void> {
        if (!this.initialized) {
            this.lastRunCommand = fileUri;
            return;
        } else { this.lastRunCommand = null; }
        const compileCommand: string | undefined = await vscode.workspace.getConfiguration().get("conf.projcpp.compileCommand") ?? '';
        if (!await helper.checkIfCommand(compileCommand)) {
            await vscode.workspace.getConfiguration().update("conf.projcpp.compileCommand", undefined, vscode.ConfigurationTarget.Global);
            this.initialized = false;
            this.lastRunCommand = fileUri;
            this.init();
            return;
        }
        await vscode.workspace.saveAll();

        const dir = path.dirname(fileUri);

        if (dir === '.') {
            this.outputChannel.clear();
            this.outputChannel.appendLine(`Seems like one of these was focused.\nPlease click inside your file.`);
            this.outputChannel.show(true);
            return;
        }

        if (!fs.existsSync(path.join(dir, 'bin'))) {
            fs.mkdirSync(path.join(dir, 'bin'));
        }

        const type = (() => {
            if(fileUri.endsWith('.c')) {
                return 'c';
            }
            return 'cpp';
        })();

        const compiled: string = await helper.compile(compileCommand, dir, type);
        this.outputChannel.clear();
        if (compiled !== '') {
            this.outputChannel.appendLine('Error while compiling:');
            this.outputChannel.appendLine(compiled);
            this.outputChannel.show();
            return;
        }
        const externTerm = vscode.workspace.getConfiguration().get("conf.projcpp.externTerm") ?? false;
        if (!externTerm) {
            this.runInternal(dir);
        }
        else {
            this.runExternal(dir);
        }
    }

    async runInternal(dir: string) {
        const term = vscode.window.activeTerminal ?? vscode.window.createTerminal();
        let shell: string | undefined;
        if (term.name === '') {
            if (!helper.isWin) {
                shell = 'bash';
            }
            else {
                shell = vscode.workspace.getConfiguration().get('terminal.integrated.shell.windows');
                if (!shell) {
                    if (fs.existsSync('C:\\Windows\\System32\\WindowsPowerShell')) {
                        shell = 'powershell';
                    }
                    else { shell = 'cmd'; }
                }
            }
        }

        const pwrshll = term.name.includes('powershell') || (term.name === '' && shell?.includes('powershell'));
        const cmd = term.name.includes('cmd') || (term.name === '' && shell?.includes('cmd'));
        term.sendText(`cd "${(pwrshll || cmd) ? dir : dir.replace(/\\/g, '/')}"`, true);
        const mainExe = `bin${((pwrshll || cmd) ? '\\' : '/')}${helper.isWin ? 'main.exe' : 'main'}`;
        term.sendText(((pwrshll || cmd) ? '.\\' : './') + mainExe, true);
        term.show();
    }

    async runExternal(dir: string) {
        const mainExe = path.join('bin', helper.isWin ? 'main.exe' : 'main');
        if(helper.isWin) {
            exec(`start "ProjCpp" cmd.exe /K "cd /d "${dir}" & ${mainExe} & echo. & echo Program exited with return code %errorlevel% & pause & exit"`, { cwd: dir });
        } else {
            exec(`alacritty -e bash -c "cd '${dir}' && ./${mainExe} && echo '' && echo 'Program exited with return code $#.' && read && exit"`);
        }
    }
}
export default CodeRunner;