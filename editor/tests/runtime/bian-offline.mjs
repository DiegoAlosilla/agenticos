// Focused start-after-bootstrap check with external networking disabled in Node and Chromium.
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const port=8082,url=`http://127.0.0.1:${port}`,external=[],errors=[];
const supportMode=process.argv.includes('--support');
let log='',server,browser;
const start=performance.now();
try{
  try{await fetch(`${url}/health`,{signal:AbortSignal.timeout(1000)});throw Error(`Puerto ${port} ocupado; no se inició un servidor de prueba.`);}catch(error){if(!/fetch failed|aborted|timeout/i.test(error.message))throw error;}
  server=spawn(process.execPath,['--require',resolve('tests/runtime/offline.cjs'),'scripts/start.mjs'],{cwd:process.cwd(),env:{...process.env,PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',data=>{log+=data;});server.stderr.on('data',data=>{log+=data;});
  for(let i=0;i<150;i++){
    if(server.exitCode!==null)throw Error(`Servidor terminó ${server.exitCode}: ${log}`);
    try{if((await fetch(`${url}/health`)).ok)break;}catch{}
    if(i===149)throw Error(`Servidor no arrancó: ${log}`);
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  const startupMs=Math.round(performance.now()-start);
  browser=await chromium.launch();const context=await browser.newContext();
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/?lang=es&ui=kennedy&mode=device');
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();await page.getByRole('button',{name:'Consultar BIAN',exact:true}).click();
  await page.getByRole('textbox',{name:'Propósito del endpoint'}).fill('consultar cuenta corriente');
  await page.waitForFunction(()=>document.querySelector('.ct-bian-domain')?.textContent==='Current Account');
  await page.getByRole('button',{name:'Current Account',exact:true}).click();assert.match(await page.locator('.ct-bian-detail').textContent(),/Retrieve/);
  if(supportMode){
    await page.getByRole('button',{name:'Guía BIAN',exact:true}).click();assert.match(await page.locator('.ct-bian-guide').textContent(),/NO se selecciona automáticamente/);
    await page.getByRole('button',{name:'Filtrar por Initiate',exact:true}).click();
    await page.getByRole('textbox',{name:'Propósito del endpoint'}).fill('iniciar préstamo personal');await page.waitForFunction(()=>document.querySelector('.ct-bian-domain')?.textContent==='Consumer Loan');
    await page.getByRole('button',{name:'Consumer Loan',exact:true}).click();assert.match(await page.locator('.ct-bian-detail').textContent(),/Préstamo de consumo/);
    await page.getByRole('button',{name:'Agregar endpoint BIAN ConsumerLoan Initiate',exact:true}).click();assert.match(await page.locator('.ct-bian-notice').textContent(),/Referencia BIAN agregada/);
  }
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.doesNotMatch(log,/OFFLINE_TEST|Descargando|Preparando dependencias/);
  const manifest=JSON.parse(await readFile('data/bian/manifest.json','utf8'));
  const result={date:'2026-10-18',passed:true,startupMs,sourceCommit:manifest.commit,catalogSha256:manifest.catalogSha256,nodeExternalNetworking:'blocked by offline.cjs before bootstrap',browserExternalNetworking:'blocked',external,errors,scope:'Existing dependencies and verified WAR; start/build and actual BIAN search, not a new clean clone/bootstrap download.'};
  if(supportMode)result.supportChecked='Guide, Spanish summary, manual action filter and actual reference insertion under network isolation';
  await writeFile(`docs/evidence/${supportMode?'bian-help-offline':'bian-offline'}-summary.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser?.close();server?.kill();}
