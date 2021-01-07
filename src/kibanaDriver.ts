import * as vscode from 'vscode';
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
    root = "https://localhost:5601";

    constructor(){
        this.root = "https://localhost:5601";
        const meta = {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
            'Authorization': 'Basic ZWxhc3RpYzpwYXNzd29yZA=='
        };
        this.headers = new Headers(meta);
    }

    async getPipelineList(): Promise<File[]> {
      
        const response = await fetch(this.root+'/api/logstash/pipelines', {
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
    
    async getPipelineCode(id:string): Promise<string> {
        
        // const response = await fetch('https://localhost:5601/api/logstash/pipeline'+this.fromConf(id), {
        const response = await fetch(this.root+'/api/logstash/pipeline/'+id, {
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
    
    async getPipelineStats(id:string): Promise<Entry> {
        // Get Global stats of pipeline   
        const response = await fetch(this.root+'/api/logstash/pipelines', {
            method: 'GET',
            headers: this.headers,
            agent: this.httpsAgent,
        });
        
        var pipelineManager = new Directory(id);
        var entry:File = new File("unknown");
        if (response.ok) {   
            const jsonObj = JSON.parse(await response.text());            
            jsonObj["pipelines"].forEach((pipe:any) => {
                var pipeline = new File(pipe["id"]);
                pipelineManager.entries.set(pipe["id"], pipeline);

                if((pipe["id"]) === id) {
                    entry = new File(pipe["id"]);
                    entry.mtime = Date.parse(pipe["last_modified"]);
                }
            });      
        } 

        if(id === "") {
            return pipelineManager;
        } else {
            // get the pipeline data        
            // const resp = await fetch('https://localhost:5601/api/logstash/pipeline'+this.fromConf(id), {
            const resp = await fetch(this.root+'/api/logstash/pipeline/'+id, {
                method: 'GET',
                headers: this.headers,
                agent: this.httpsAgent,
            });

            var content:string = "";
            if (resp.ok) {
                const jsonObj = JSON.parse(await resp.text());
                content = jsonObj["pipeline"];
            }
            entry.data = Buffer.from(content);

            return entry;
        }        
    }

    async savePipeline(id:string, content:string): Promise<void> {        
        try {
            //Format content
            var payload = JSON.stringify({pipeline: content});

            // const response = await fetch('https://localhost:5601/api/logstash/pipeline'+this.fromConf(id), {
            const response = await fetch(this.root+'/api/logstash/pipeline/'+id, {
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

    async deletePipeline(id:string): Promise<void> {
        try {
            // const response = await fetch('https://localhost:5601/api/logstash/pipeline'+this.fromConf(id), {
            const response = await fetch(this.root+'/api/logstash/pipeline/'+id, {
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

    // toConf(id:string): string{
    //     return id+".conf";
    // }

    // fromConf(id:string): string{
    //     return id.replace('.conf', '');
    // }
}