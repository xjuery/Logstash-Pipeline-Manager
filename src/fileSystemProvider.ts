import * as path from 'path';
import { TextDecoder, TextEncoder } from 'text-encoding';
import * as vscode from 'vscode';
import { KibanaDriver, Entry, File, Directory } from './kibanaDriver';

export class LPM implements vscode.FileSystemProvider {

    root = new Directory('');
    driver = new KibanaDriver();
    enc = new TextEncoder();


    // --- manage file metadata

    async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
        // console.log("STATS: "+uri.toString());
        // console.log("STATS: "+uri.authority);
        // console.log("STATS: "+uri.fragment);
        // console.log("STATS: "+uri.fsPath);
        // console.log("STATS: "+uri.path);
        // console.log("STATS: "+uri.query);
        // console.log("STATS: "+uri.scheme);
        // const basename = path.posix.basename(uri.path);
        var entry = await this.driver.getPipelineStats(uri);
        return entry;
    }

    async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
        // console.log("READ DIR: "+uri.toString());
        try {
            const result:[string, vscode.FileType][] = [];
            const pipelines:File[] = await this.driver.getPipelineList(uri);
            pipelines.forEach((pipe:File) => {
                result.push([pipe.name, vscode.FileType.File]);
            });    
            return result;
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
            throw vscode.FileSystemError.Unavailable('Failed to fetch');
        }       
    }

    // --- manage file contents

    async readFile(uri: vscode.Uri): Promise<Uint8Array> {   
        // const basename = path.posix.basename(uri.path);
        const data:string = await this.driver.getPipelineCode(uri);
        return Buffer.from(data);    
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean }): void {
        // const basename = path.posix.basename(uri.path);
        var dec = new TextDecoder();
        this.driver.savePipeline(uri, dec.decode(content));

        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
    }

    // --- manage files/folders

    async rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): Promise<void> {
        // var content = this.readFile(oldUri);  
        // await this.writeFile(newUri, await content, { create: true, overwrite: true })
        // this.delete(oldUri);

        // this._fireSoon(
        //     { type: vscode.FileChangeType.Deleted, uri: oldUri },
        //     { type: vscode.FileChangeType.Created, uri: newUri }
        // );
        throw vscode.FileSystemError.NoPermissions('Operation not permitted in Kibana: please create a new pipeline and delete the old one.');
    }

    delete(uri: vscode.Uri): void {
        // const basename = path.posix.basename(uri.path);
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        this.driver.deletePipeline(uri);
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    createDirectory(uri: vscode.Uri): void {
        
        throw vscode.FileSystemError.NoPermissions('Operation not permitted in Kibana: directory concept does not exist.');
    }

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }
}
