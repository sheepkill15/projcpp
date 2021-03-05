import * as vscode from 'vscode';
import * as path from 'path';
import { createProject, getProjects } from './ProjectManager';

export class SidebarProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'projcpp.SidebarView';

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _context: vscode.ExtensionContext,
	) { }

	public getView = (): vscode.WebviewView | undefined => {
		return this._view;
	};

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._context.extensionUri,
				vscode.Uri.joinPath(this._context.extensionUri, "dist/compiled"),
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(async (data: {command: string; value: any})=> {
            switch(data.command) {
                case 'onInfo': {
                    if(!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case 'onError': {
                    if(!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
				case 'askFolder': {
					const folder = await vscode.window.showOpenDialog({canSelectFolders: true, canSelectFiles: false, canSelectMany: false});
					if(folder) {
						this._view?.webview.postMessage({
							command: 'giveFolder',
							value: folder[0].fsPath,
						});
						getProjects(folder[0].fsPath, (path) => {
							this._view?.webview.postMessage({
								command: 'add-project',
								value: path,
							});
						});
						this._context.globalState.update('projcpp.default-location', path.join(folder[0].fsPath, '/'));
					}
					break;
				}
				case 'create-project': {
					if(!data.value) {
						return;
					}
					createProject(data.value);
					break;
				}
				case 'init': {
					if(!data.value) {
						return;
					}
					getProjects(data.value, (path) => {
						this._view?.webview.postMessage({
							command: 'add-project',
							value: path,
						});
					});
				}
            }
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'compiled/sidebar.js'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'dist', 'compiled/sidebar.css'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'vscode.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		const userPath = process.env.USERPROFILE ?? 'C:\\Users\\Public';

		let defaultLocation: string = this._context.globalState.get('projcpp.default-location') ?? userPath + '\\Downloads\\';
		defaultLocation = defaultLocation.replace(/\\/g, '\\\\');

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				<script nonce=${nonce}>
                    const tsvscode = acquireVsCodeApi();
					const savedDefaultLocation = "${defaultLocation}";
                </script>
			</head>
			<body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}