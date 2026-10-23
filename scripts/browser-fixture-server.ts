import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {basename} from 'node:path';

/** Node owns Playwright and HTTP; Bun remains the project's browser bundler. */
export async function browserFixtureServer(entrypoint:string){
 mkdirSync('.cache/browser-fixtures',{recursive:true});
 const output=`.cache/browser-fixtures/${basename(entrypoint,'.ts')}.js`;
 execFileSync('bun',['build',entrypoint,'--target','browser','--outfile',output],{windowsHide:true,stdio:'pipe',timeout:60000});
 const bundle=readFileSync(output,'utf8');
 const server=createServer((request,response)=>{
  const script=new URL(request.url??'/', 'http://localhost').pathname==='/fixture.js';
  response.setHeader('Content-Type',script?'application/javascript':'text/html');
  response.end(script?bundle:'<html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>');
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {port:(server.address() as {port:number}).port,stop:()=>new Promise<void>((resolve,reject)=>{server.close(e=>e?reject(e):resolve());server.closeAllConnections();})};
}
