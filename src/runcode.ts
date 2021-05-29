import * as vscode from 'vscode';
import * as os from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

import * as helper from './helper';

const execPromisified = promisify(exec);
class CodeRunner {

    private lastRunCommand: string | null = null;

    private isWin: boolean;

    private pathAdded: boolean = false;

    initialized: boolean = false;

    private outputChannel: vscode.OutputChannel;

    constructor(outpuCh: vscode.OutputChannel) {
        this.isWin = os.platform().indexOf('win') > -1;
        this.outputChannel = outpuCh;
        this.init();
    }
    async init() {

        const where = this.isWin ? 'where' : 'whereis';
        const savedCommand: string | undefined = vscode.workspace.getConfiguration().get('conf.projcpp.compileCommand');
        const modifiedCommand: string = await helper.findCompiler();
        if (savedCommand) {
            if (fs.existsSync(savedCommand.replace(/\"/g, '')) || await helper.checkIfCommand(where + ' ' + savedCommand)) {
                this.finishInit();
                return;
            }
        }
        
        await vscode.workspace.getConfiguration().update("conf.projcpp.compileCommand", modifiedCommand, vscode.ConfigurationTarget.Global);
        this.finishInit();
    }

    async finishInit(): Promise<void> {
        const compileCommand: string | undefined = await vscode.workspace.getConfiguration().get("conf.projcpp.compileCommand");
        if (!compileCommand) { return; }
        const winDirName = path.dirname(compileCommand.replace(/\"/g, ''));
        if (!this.pathAdded && this.isWin && (compileCommand.includes(path.sep)) && !process.env.PATH?.includes(winDirName)) {

            await helper.addToPath(winDirName);
            vscode.window.showInformationMessage('Added compiler to path. Please restart VSCode for this to work (only needed one time)');
            this.pathAdded = true;
        }

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
        {
            const compileCommand: string | undefined = await vscode.workspace.getConfiguration().get("conf.projcpp.compileCommand") ?? '';
            if (helper.validateCompileCommand(compileCommand)) {
                await vscode.workspace.getConfiguration().update("conf.projcpp.compileCommand", undefined, vscode.ConfigurationTarget.Global);
                this.initialized = false;
                this.lastRunCommand = fileUri;
                this.init();
                return;
            }
            if (!compileCommand.endsWith('"') && fs.existsSync(compileCommand)) {
                await vscode.workspace.getConfiguration().update("conf.projcpp.compileCommand", (compileCommand.startsWith('"') ? '' : '"') + compileCommand + (compileCommand.endsWith('"') ? '' : '"'), vscode.ConfigurationTarget.Global);
            }
        }
        const compileCommand: string = await vscode.workspace.getConfiguration().get("conf.projcpp.compileCommand") ?? '';

        await vscode.workspace.saveAll();
        if(path.extname(fileUri) === '') {
            this.outputChannel.clear();
            this.outputChannel.appendLine(`Seems like one of these was focused.\nPlease click inside your file.`);
            this.outputChannel.show(true);
            return;
        }

        const dir = path.dirname(fileUri);
        
        if (!fs.existsSync(path.join(dir, 'bin'))) {
            fs.mkdirSync(path.join(dir, 'bin'));
        }

        const compiled: string = await helper.compile(compileCommand, dir);
        if(compiled !== '') {
            this.outputChannel.clear();
            this.outputChannel.appendLine('Error while compiling:');
            this.outputChannel.appendLine(compiled);
        }
        else {
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
        if(term.name === '') {
            shell = vscode.workspace.getConfiguration().get('terminal.integrated.shell.windows');
            if (!shell) {
                if (fs.existsSync('C:\\Windows\\System32\\WindowsPowerShell')) {
                    shell = 'powershell';
                }
            else { shell = 'cmd'; }
            }
        }
        
        const pwrshll = term.name.includes('powershell') || (term.name === '' && shell?.includes('powershell'));
        const cmd = term.name.includes('cmd') || (term.name === '' && shell?.includes('cmd'));
        term.sendText(`cd "${(pwrshll || cmd) ? dir : dir.replace(/\\/g, '/')}"`, true);
        const mainExe = `bin${((pwrshll || cmd) ? '\\' : '/')}${this.isWin ? 'main.exe' : 'main.a'}`;
        term.sendText(((pwrshll || cmd) ? '.\\' : './') + mainExe, true);
        term.show();
    }

    async runExternal(dir: string) {
        const mainExe = path.join('bin', this.isWin ? 'main.exe' : 'main.a');
        exec(`start "ProjCpp" cmd.exe /K "cd /d "${dir}" & ${mainExe} & echo. & echo Program exited with return code %errorlevel% & pause & exit"`, { cwd: dir });
    }
}
export default CodeRunner;