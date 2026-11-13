import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {unzipSync} from 'fflate';
import {build} from 'esbuild';
// Read the published local tag without checkout, downloads or modification of
// its sources. All extracted files and the bundle stay in the ignored work dir.
export async function buildBaseline(){
  const workspace=resolve('.'),base=resolve('work/baseline-v1');
  const entries=unzipSync(execFileSync('git',['archive','--format=zip','v1.0.0','src','examples','config'],{maxBuffer:20*1024*1024}));
  for(const [name,bytes]of Object.entries(entries)){
    if(name.endsWith('/'))continue;const target=resolve(base,name);
    if(!target.startsWith(base+sep))throw new Error('Ruta fuera del directorio temporal de la versión base.');
    await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
  }
  await build({entryPoints:[resolve(base,'src/plugin.ts')],outfile:resolve(base,'contracts-v1.js'),bundle:true,format:'iife',target:'es2022',nodePaths:[resolve('node_modules')],plugins:[{name:'raw',setup(builder){
    builder.onResolve({filter:/\?raw$/},args=>({path:args.path.includes('node_modules/')?resolve(workspace,'node_modules',args.path.split('node_modules/')[1].slice(0,-4)):resolve(args.resolveDir,args.path.slice(0,-4)),namespace:'raw'}));
    builder.onLoad({filter:/.*/,namespace:'raw'},async args=>({contents:await readFile(args.path,'utf8'),loader:'text'}));
  }}]});
}
