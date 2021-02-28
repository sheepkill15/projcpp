// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ProjectsPanel from './ProjectPanel';
import CodeRunner from './runcode';
import { SidebarProvider } from './SidebarProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const runner = new CodeRunner();

	const sidebarProvider = new SidebarProvider(context);

	// const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
	// item.text = 'Add project';
	// item.command = 'projcpp.addProject';
	// item.tooltip = 'Add currently opened folder as project';
	// item.show();

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'projcpp-sidebar',
			sidebarProvider,
		)
	);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('projcpp.runCode', () => {
		// The code you place here will be executed every time your command is executed
		if (vscode.window.activeTextEditor) { 
			runner.run(vscode.window.activeTextEditor?.document.fileName); 
		}
	});
	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('projcpp.projects', () => {
		ProjectsPanel.createOrShow(context.extensionUri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('projcpp.refresh', async () => {
		// ProjectsPanel.kill();
		// ProjectsPanel.createOrShow(context.extensionUri);
		await vscode.commands.executeCommand('workbench.action.closeSidebar');
		await vscode.commands.executeCommand('workbench.view.extension.projcpp-sidebar-view');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('projcpp.addProject', () => {
		const {workspaceFolders} = vscode.workspace;
		if(!workspaceFolders) {
			vscode.window.showInformationMessage('No open folder!');
			return;
		}
		sidebarProvider.getView()?.webview.postMessage({
			command: 'add-project',
			value: workspaceFolders[0].uri.fsPath,
		});
	}));
}

// this method is called when your extension is deactivated
export function deactivate() { }
