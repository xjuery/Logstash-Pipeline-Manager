import * as vscode from 'vscode';
import * as path from 'path';
import {Headers}  from 'node-fetch';
import fetch from 'node-fetch';
import { TextDecoder, TextEncoder } from 'text-encoding';

export class File implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    data?: Uint8Array;

    constructor(name: string) {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
    }
}

export class Directory implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    entries: Map<string, File | Directory>;

    constructor(name: string) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}

export type Entry = File | Directory;

export class KibanaDriver {
    headers = new Headers();
    httpsAgent = new (require('https')).Agent({rejectUnauthorized: false,});

    constructor(){
        const meta = {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true'
        };
        this.headers = new Headers(meta);
    }

    async getPipelineList(uri: vscode.Uri): Promise<File[]> {      
        const response = await fetch("https://"+uri.authority+'/api/logstash/pipelines', {
            method: 'GET',
            headers: this.headers,
            agent: this.httpsAgent,
        });

        var result: File[] = [];

        if (response.ok) {     
            const jsonObj = JSON.parse(await response.text());
            jsonObj["pipelines"].forEach((pipe:any) => {
                var entry:File = new File(pipe["id"]);
                result.push(entry);
            });      
        } 

        return result;
    }
    
    async getPipelineCode(uri: vscode.Uri): Promise<string> {        
        const basename = path.posix.basename(uri.path);
        const response = await fetch("https://"+uri.authority+'/api/logstash/pipeline/'+basename, {
            method: 'GET',
            headers: this.headers,
            agent: this.httpsAgent,
        });

        var result:string = "";
        if (response.ok) {
            const jsonObj = JSON.parse(await response.text());
            result = jsonObj["pipeline"];
        }

        return result;
    }
    
    async getPipelineStats(uri: vscode.Uri): Promise<Entry> {
        try {
            if(uri.path === "/") {
                // Get Global stats of pipeline   
                const response = await fetch("https://"+uri.authority+'/api/logstash/pipelines', {
                    method: 'GET',
                    headers: this.headers,
                    agent: this.httpsAgent,
                });
                
                var pipelineManager = new Directory(uri.path);
                if (response.ok) {   
                    const jsonObj = JSON.parse(await response.text());            
                    jsonObj["pipelines"].forEach((pipe:any) => {
                        var pipeline = new File(uri.toString()+pipe["id"]);
                        pipelineManager.entries.set(pipe["id"], pipeline);
                    });      
                } 
                return pipelineManager;
            } else {
                    const basename = path.posix.basename(uri.path);
                    const resp = await fetch("https://"+uri.authority+'/api/logstash/pipeline/'+basename, {
                        method: 'GET',
                        headers: this.headers,
                        agent: this.httpsAgent,
                    });

                    var entry:File = new File("unknown");
                    var content:string = "";
                    if (resp.ok) {
                        const jsonObj = JSON.parse(await resp.text());
                        content = jsonObj["pipeline"];
                    }
                    entry.data = Buffer.from(content);

                    return entry;
            }
        
        } catch (err) {
            console.log(err.message);
            vscode.window.showErrorMessage(err.message);
        }

        return new File("unknown");
    }

    async savePipeline(uri: vscode.Uri, content:string): Promise<void> {        
        try {
            //Format content
            var payload = JSON.stringify({pipeline: content});
            const basename = path.posix.basename(uri.path);

            const response = await fetch("https://"+uri.authority+'/api/logstash/pipeline/'+basename, {
                method: 'PUT',
                headers: this.headers,
                agent: this.httpsAgent,
                body: payload
            });
            if(!(await response).ok) {
                vscode.window.showErrorMessage(await response.text());
            }
        } catch (err) {
            console.log(err.message);
            vscode.window.showErrorMessage(err.message);
        }
    }

    async deletePipeline(uri: vscode.Uri): Promise<void> {
        try {
                const basename = path.posix.basename(uri.path);
                const response = await fetch("https://"+uri.authority+'/api/logstash/pipeline/'+basename, {
                method: 'DELETE',
                headers: this.headers,
                agent: this.httpsAgent
            });
            if(!(await response).ok) {
                vscode.window.showErrorMessage(await response.text());
            }
        } catch (err) {
            console.log(err.message);
            vscode.window.showErrorMessage(err.message);
        }
    }
}