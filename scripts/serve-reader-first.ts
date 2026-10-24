import {resolve} from 'node:path';
const build=await Bun.build({entrypoints:['scripts/reader-first-browser-fixture.ts'],target:'browser'});
if(!build.success)throw new Error(String(build.logs));
const bundle=await build.outputs[0]!.text();
const html='<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lumiglyphics · working reader UI</title></head><body style="margin:0"><script type="module" src="/fixture.js"></script></body></html>';
const server=Bun.serve({hostname:'0.0.0.0',port:Number(process.env.PORT??4175),fetch(request){
 const path=new URL(request.url).pathname;
 if(path==='/fixture.js')return new Response(bundle,{headers:{'Content-Type':'application/javascript'}});
 if(path==='/sample-art.jpg')return new Response(Bun.file(resolve('docs/design-concepts/reader-first/assets/observatory.jpg')));
 return new Response(html,{headers:{'Content-Type':'text/html'}});
}});
console.log(`Working extension UI fixture on port ${server.port}. Sample host/content; no live generation.`);
