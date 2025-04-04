import * as vscode from 'vscode';
import { parseEditorConfig, stringifyEditorConfig, EditorConfigSection } from './parser';
import { getNonce } from './util';
import { getWebviewContent } from './webview';

export class EditorConfigEditorProvider implements vscode.CustomTextEditorProvider {
    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'media'),
                vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', '@vscode/codicons', 'dist')
            ]
        };

        const nonce = getNonce();
        webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, this.context.extensionUri, nonce);

        function updateWebview() {
            const content = document.getText();
            webviewPanel.webview.postMessage({
                type: 'update',
                content,
                parsed: parseEditorConfig(content)
            });
        }

        // Initial content update
        updateWebview();

        // Update webview when the document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'update':
                        await this.updateTextDocument(document, message.content);
                        break;
                    case 'confirm':
                        const choice = await vscode.window.showWarningMessage(
                            message.message,
                            { modal: true },
                            'Yes',
                            'No'
                        );
                        webviewPanel.webview.postMessage({
                            type: 'confirmResponse',
                            confirmed: choice === 'Yes'
                        });
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Make sure we clean up when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    private async updateTextDocument(document: vscode.TextDocument, content: string) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            content
        );
        await vscode.workspace.applyEdit(edit);
    }
}