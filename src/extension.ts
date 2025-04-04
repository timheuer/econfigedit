import * as vscode from 'vscode';
import { EditorConfigEditorProvider } from './editorConfigEditorProvider';

export function activate(context: vscode.ExtensionContext) {
    // Register our custom editor provider
    const provider = new EditorConfigEditorProvider(context);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'econfigedit.editor',
            provider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
    );
}

export function deactivate() {}
