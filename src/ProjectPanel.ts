import * as vscode from 'vscode';
import * as path from 'path';
import { createProject, getProjects } from './ProjectManager';

function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media'),
                            vscode.Uri.joinPath(extensionUri, 'dist/compiled')]
	};
}

/**
 * Manages projects webview panel
 */
class ProjectsPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: ProjectsPanel | undefined;

	public static readonly viewType = 'projects';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private readonly _context: vscode.ExtensionContext;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri, _context: vscode.ExtensionContext) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (ProjectsPanel.currentPanel) {
			ProjectsPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			ProjectsPanel.viewType,
			'Projects',
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		ProjectsPanel.currentPanel = new ProjectsPanel(panel, extensionUri, _context);
	}

    public static kill() {
        ProjectsPanel.currentPanel?.dispose();
        ProjectsPanel.currentPanel = undefined;
      }

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, _context: vscode.ExtensionContext) {
		ProjectsPanel.currentPanel = new ProjectsPanel(panel, extensionUri, _context);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, _context: vscode.ExtensionContext) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._context = _context;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async (data: {command: string; value: any})=> {
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
							this._panel?.webview.postMessage({
								command: 'giveFolder',
								value: folder[0].fsPath,
							});
							getProjects(folder[0].fsPath, (path) => {
								this._panel?.webview.postMessage({
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
							this._panel?.webview.postMessage({
								command: 'add-project',
								value: path,
							});
						});
					}
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		ProjectsPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		const webview = this._panel.webview;

		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'compiled/sidebar.js'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'compiled/sidebar.css'));

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		const userPath = process.env.USERPROFILE ?? 'C:\\Users\\Public';

		let defaultLocation: string = this._context.globalState.get('projcpp.default-location') ?? path.join(userPath, '/Downloads', '/');
		defaultLocation = defaultLocation.replace(/\\/g, '\\\\');
		console.log(defaultLocation);
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
					const separator = "${path.sep.replace(/\\/g, '\\\\')}"
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
export default ProjectsPanel;