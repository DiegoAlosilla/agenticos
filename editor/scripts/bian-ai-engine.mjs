import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createHash} from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),folder=resolve(root,'.runtime/bian-ai'),config=JSON.parse(await readFile(resolve(root,'config/bian-ai.json'),'utf8'));
const executable=resolve(folder,'engine/ollama.exe'),archive=resolve(folder,'ollama-windows-amd64.zip'),base='http://127.0.0.1:11434';
const env={...process.env,OLLAMA_NO_CLOUD:'1',OLLAMA_DEBUG:'false',OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_MODELS:resolve(folder,'models'),OLLAMA_KEEP_ALIVE:'2m'};
async function hash(path){const digest=createHash('sha256');for await(const chunk of createReadStream(path))digest.update(chunk);return digest.digest('hex');}
async function verify(){const expected=(await readFile(resolve(folder,'engine.sha256'),'utf8')).trim();if(await hash(executable)!==expected)throw Error('Motor local alterado; repite npm run ai:prepare.');}
async function available(){try{return (await fetch(base+'/api/tags',{signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}}
function start(){const child=spawn(executable,['serve'],{cwd:folder,env,windowsHide:true,stdio:['ignore','ignore','pipe']});let error='';child.stderr.on('data',chunk=>{error=(error+chunk).slice(-2000);});child.on('error',()=>{});return {child,error:()=>error};}
async function waitEngine(process){for(let i=0;i<80;i++){if(await available())return;if(process.child.exitCode!==null)throw Error('No arrancó Ollama: '+process.error());await new Promise(r=>setTimeout(r,250));}throw Error('Tiempo de arranque de Ollama agotado.');}
async function verifyModels(){const tags=await (await fetch(base+'/api/tags')).json();for(const pin of [config.chat,config.embedding])if(tags.models?.find(m=>m.name===pin.name)?.digest!==pin.digest)throw Error('No coincide el digest fijado de '+pin.name);}
let owned;
try{
  if(process.platform!=='win32'||process.arch!=='x64')throw Error('La preparación automatizada está limitada a Windows x64. Consulta docs/ia-local.md para otro motor local.');
  if(process.argv.includes('--prepare')){
    await mkdir(folder,{recursive:true});
    let valid=false;try{valid=await hash(archive)===config.engine.sha256;}catch{}
    if(!valid){console.log('Descargando motor Ollama fijado (preparación explícita)...');const response=await fetch(config.engine.windowsArchive,{signal:AbortSignal.timeout(600_000)});if(!response.ok)throw Error('No se pudo descargar Ollama.');await pipeline(Readable.fromWeb(response.body),createWriteStream(archive));if(await hash(archive)!==config.engine.sha256)throw Error('SHA-256 incorrecto del motor.');}
    await mkdir(resolve(folder,'engine'),{recursive:true});
    const extracted=spawnSync('tar.exe',['-xf',archive,'-C',resolve(folder,'engine')],{windowsHide:true,stdio:'inherit'});if(extracted.status!==0)throw Error('No se pudo extraer el motor.');
    await writeFile(resolve(folder,'engine.sha256'),await hash(executable)+'\n');await verify();
    if(await available())throw Error('El puerto 11434 ya está ocupado. Detén ese Ollama y repite para preparar el motor aislado del proyecto.');
    owned=start();await waitEngine(owned);
    for(const pin of [config.embedding,config.chat]){
      console.log('Preparando modelo '+pin.name+' (descarga local explícita)...');
      const response=await fetch(base+'/api/pull',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:pin.name,stream:false}),signal:AbortSignal.timeout(900_000)}),result=await response.json();if(!response.ok||result.error)throw Error('Falló la descarga del modelo '+pin.name);
    }
    await verifyModels();console.log('Motor y modelos fijados preparados. Ejecuta npm run ai:serve y npm start en terminales separadas.');
  }else{
    await verify();if(await available())throw Error('El puerto 11434 ya está ocupado; no se reemplaza el motor existente.');
    owned=start();await waitEngine(owned);await verifyModels();
    console.log(`IA local lista: Ollama ${config.engine.version}, nube deshabilitada, solo 127.0.0.1:11434. Detener: Ctrl+C.`);
    const stop=()=>owned?.child.kill();process.on('SIGINT',stop);process.on('SIGTERM',stop);const code=await new Promise(r=>owned.child.once('exit',r));if(code!==null&&code!==0)throw Error('El motor local terminó inesperadamente.');
  }
}catch(error){console.error('IA local: '+error.message);process.exitCode=1;}
finally{owned?.child.kill();}
