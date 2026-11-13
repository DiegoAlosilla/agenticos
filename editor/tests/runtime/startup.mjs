import {contractMenu} from '../contract-menu.mjs';
import {cp, mkdir, readFile, writeFile, access} from 'node:fs/promises';
import {spawn, spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {root} from '../../scripts/bootstrap.mjs';

const runId = Date.now().toString();
const source = resolve(root, 'work', `source-${runId}`);
const clone = resolve(root, 'work', `clone-${runId}`);
await mkdir(source, {recursive:true});
// Reconstruct only versionable files. Do not copy runtime, dependencies or private files.
const deliverables = ['.gitignore','.gitattributes','.node-version','.npmrc','ADR-001-extension-contratos-drawio.md','AGENTS.md','README.md',
  'THIRD_PARTY_NOTICES.md','package.json','package-lock.json','tsconfig.json','playwright.config.mjs','config','src','scripts','tests','docs','licenses','examples','data'];
for (const path of deliverables) await cp(resolve(root,path),resolve(source,path),{recursive:true});
function git(args,cwd) {
  const result=spawnSync('git',args,{cwd,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
}
git(['init'],source);
git(['add','.'],source);
git(['-c','user.name=Prueba local ficticia','-c','user.email=prueba@example.invalid','commit','-m','Fixture local para verificar arranque'],source);
git(['clone','--no-hardlinks',source,clone],root);
await assert.rejects(access(resolve(clone,'node_modules')));
await assert.rejects(access(resolve(clone,'.runtime')));
const events=[];

function start(port,offline=false) {
  const options={cwd:clone,env:{...process.env,PORT:String(port),npm_config_update_notifier:'false',
    ...(offline?{NODE_OPTIONS:'--require ./tests/runtime/offline.cjs'}:{})}};
  const child=process.platform==='win32'
    ? spawn('cmd.exe',['/d','/s','/c','npm start'],options)
    : spawn('npm',['start'],options);
  let output='';
  child.stdout.on('data',data=>{output+=data; process.stdout.write(data);});
  child.stderr.on('data',data=>{output+=data; process.stderr.write(data);});
  const finished=new Promise(resolve=>child.on('close',code=>resolve(code)));
  return {child,finished,output:()=>output};
}
async function stop(running) {
  if (process.platform==='win32') spawnSync('taskkill',['/PID',String(running.child.pid),'/T','/F'],{stdio:'ignore'});
  else running.child.kill('SIGTERM');
  await running.finished;
}
async function ready(running,port) {
  const timeout=Date.now()+240000;
  while(Date.now()<timeout) {
    if(running.child.exitCode!==null) throw new Error(`Arranque terminó: ${running.output()}`);
    try { if((await fetch(`http://127.0.0.1:${port}/health`)).ok) return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  throw new Error(`No arrancó en 240 segundos: ${running.output()}`);
}
async function probe(port) {
  const browser=await chromium.launch();
  try {
    const context=await browser.newContext();
    const external=[];
    await context.route('**/*',route=>{
      if(new URL(route.request().url()).hostname==='127.0.0.1') return route.continue();
      external.push(route.request().url()); return route.abort('internetdisconnected');
    });
    const page=await context.newPage();
    // No query parameters: configuration must be controlled by the local deployment.
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.getByRole('tab',{name:'Contratos',exact:true}).waitFor();
    await contractMenu(page,'contractsDemo');
    await contractMenu(page,'contractsInspect');
    await page.getByRole('heading',{name:'GET /clientes/{clienteId}',exact:true}).waitFor();
    await page.locator('.swagger-ui .response[data-code="200"]').filter({hasText:'Cliente ficticio encontrado'}).waitFor();
    assert.deepEqual(external,[]);
    assert.equal((await fetch(`http://127.0.0.1:${port}/`,{method:'POST',body:'dato-ficticio'})).status,405);
  } finally { await browser.close(); }
}

let running;
try {
  console.log('Clon local limpio: npm start sin node_modules ni .runtime.');
  const initial=Date.now();
  running=start(8081);
  await ready(running,8081);
  await probe(8081);
  events.push({check:'clon limpio',passed:true,elapsedMs:Date.now()-initial});
  await stop(running); running=null;
  const pin=JSON.parse(await readFile(resolve(clone,'config/drawio-version.json'),'utf8'));
  const marker=await readFile(resolve(clone,`.runtime/drawio-${pin.version}/.verified`),'utf8');
  const second=Date.now();
  console.log('Segundo arranque: conexiones externas bloqueadas en Node y navegador.');
  running=start(8081,true);
  await ready(running,8081);
  await probe(8081);
  assert.equal(await readFile(resolve(clone,`.runtime/drawio-${pin.version}/.verified`),'utf8'),marker);
  assert.doesNotMatch(running.output(),/Descargando|Extrayendo|Preparando dependencias/);
  events.push({check:'reutilización sin acceso externo',passed:true,elapsedMs:Date.now()-second});
  const core=process.platform==='win32'
    ? spawnSync('cmd.exe',['/d','/s','/c','npm run test:unit'],{cwd:clone,encoding:'utf8',env:{...process.env,NODE_OPTIONS:'--require ./tests/runtime/offline.cjs',npm_config_update_notifier:'false'}})
    : spawnSync('npm',['run','test:unit'],{cwd:clone,encoding:'utf8',env:{...process.env,NODE_OPTIONS:'--require ./tests/runtime/offline.cjs',npm_config_update_notifier:'false'}});
  assert.equal(core.status,0,core.stdout+core.stderr);
  events.push({check:'núcleo de tres versiones en clon limpio sin acceso externo y schema fijado',passed:true});
  const conflict=start(8081,true);
  const conflictCode=await conflict.finished;
  assert.equal(conflictCode,1);
  assert.match(conflict.output(),/Puerto 8081 ocupado/);
  events.push({check:'puerto ocupado',passed:true});
  await stop(running); running=null;
  const invalid=start('invalido',true);
  assert.equal(await invalid.finished,1);
  assert.match(invalid.output(),/PORT debe ser un entero/);
  events.push({check:'puerto inválido',passed:true});
  pin.sha256='0'.repeat(64);
  await writeFile(resolve(clone,'config/drawio-version.json'),JSON.stringify(pin));
  const corrupt=start(8081,true);
  assert.equal(await corrupt.finished,1);
  assert.match(corrupt.output(),/no coincide con la huella fijada/);
  events.push({check:'huella incorrecta rechazada',passed:true});
  console.log('PRUEBAS DE ARRANQUE APROBADAS');
} finally {
  if(running) await stop(running);
  await writeFile(resolve(root,'work/startup-results.json'),JSON.stringify({clone,platform:process.platform,node:process.version,events},null,2));
}
