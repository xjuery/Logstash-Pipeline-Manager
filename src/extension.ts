// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { LPM } from './fileSystemProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "lpm" is now actived!');

	const lpm = new LPM();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('lpm', lpm, { isCaseSensitive: true }));
    let initialized = false;

	// context.subscriptions.push(vscode.commands.registerCommand('lpm.reset', _ => {
    //     for (const [name] of lpm.readDirectory(vscode.Uri.parse('lpm:/'))) {
    //         lpm.delete(vscode.Uri.parse(`lpm:/${name}`));
    //     }
    //     initialized = false;
    // }));

    // context.subscriptions.push(vscode.commands.registerCommand('lpm.addFile', _ => {
    //     if (initialized) {
    //         lpm.writeFile(vscode.Uri.parse(`lpm:/file.txt`), Buffer.from('input {\n}\n\nfilter {\n}\n\noutput {\n}\n'), { create: true, overwrite: true });
    //     }
    // }));

    // context.subscriptions.push(vscode.commands.registerCommand('lpm.deleteFile', _ => {
    //     if (initialized) {
    //         lpm.delete(vscode.Uri.parse('lpm:/file.txt'));
    //     }
    // }));

    context.subscriptions.push(vscode.commands.registerCommand('lpm.init', _ => {
        if (initialized) {
            return;
        }
        initialized = true;

        // most common files types
        lpm.writeFile(vscode.Uri.parse(`lpm:/file.conf`), Buffer.from('foo'), { create: true, overwrite: true });
        lpm.writeFile(vscode.Uri.parse(`lpm:/file.html`), Buffer.from('<html><body><h1 class="hd">Hello LPM</h1></body></html>'), { create: true, overwrite: true });
        
    }));

    context.subscriptions.push(vscode.commands.registerCommand('lpm.workspaceInit', _ => {
        vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse('lpm:/'), name: "Logstash Pipeline Manager" });
    }));

	//context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
