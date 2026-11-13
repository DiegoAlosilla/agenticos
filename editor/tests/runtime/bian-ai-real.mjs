// Requires npm run ai:prepare and a running npm run ai:serve. No doubles or downloads.
import {spawn} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {createBianSearch,resolveSuggestions} from '../../dist/bian-assistant.mjs';
const port=8084,base=`http://127.0.0.1:${port}`,external=[],errors=[],runs=[];
const catalog=JSON.parse(await readFile('data/bian/catalog.json','utf8')),manifest=JSON.parse(await readFile('data/bian/manifest.json','utf8')),engine=createBianSearch(catalog);
let server,browser,log='';const start=performance.now();
try{
  await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(2000)});
  let occupied=false;try{occupied=(await fetch(base+'/health',{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(occupied)throw Error('Puerto 8084 ocupado; no se reemplaza el proceso.');
  server=spawn(process.execPath,['--require',resolve('tests/runtime/ai-offline.cjs'),'scripts/start.mjs'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',chunk=>log+=chunk);server.stderr.on('data',chunk=>log+=chunk);
  for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error(log);try{if((await fetch(base+'/health')).ok)break;}catch{}if(i===99)throw Error('Servidor no arrancó.');await new Promise(r=>setTimeout(r,200));}
  const startupMs=Math.round(performance.now()-start);browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1317,height:884}});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===base)return route.continue();external.push(url.href);return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?lang=es&ui=kennedy&mode=device');
  await page.waitForFunction(()=>!!window.Draw?.loadPlugin);await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await page.waitForFunction(()=>!!window.testUi?.fileNode);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();await page.getByRole('button',{name:'Consultar BIAN',exact:true}).click();
  const state=()=>page.evaluate(()=>({xml:testUi.getFileData(true).replace(/ (dx|dy)="[^"]*"/g,''),undo:testUi.editor.undoManager.indexOfNextAdd})),before=await state();
  for(const purpose of ['Consultar las cuotas pendientes de un préstamo personal ficticio','Consultar el saldo de una cuenta corriente ficticia','Procesar una operación ficticia sin producto ni cliente definidos']){
    console.log('Inferencia real: '+purpose);
    const action='Retrieve';await page.getByRole('textbox',{name:'Propósito del endpoint'}).fill(purpose);await page.getByRole('combobox',{name:'Acción BIAN'}).selectOption(action);
    const pending=page.waitForResponse(r=>r.url()===base+'/api/bian-ai/suggest',{timeout:250_000});await page.getByRole('button',{name:'Sugerir con IA local',exact:true}).click();
    const response=await pending,data=await response.json();assert.equal(response.status(),200,JSON.stringify(data));resolveSuggestions(data,catalog,action,manifest.catalogSha256);
    await page.waitForFunction(()=>document.querySelector('.ct-bian-ai')?.getAttribute('aria-busy')!=='true');assert.deepEqual(await state(),before);
    const lexical=engine.search(purpose,action).matches.slice(0,3).map(m=>({domainId:m.domain.id,method:m.operations[0]?.operation.method,path:m.operations[0]?.operation.path}));runs.push({purpose,action,lexical,data});
    if(runs.length===1){assert.ok(data.suggestions.some(s=>s.domainId==='ConsumerLoan'),'La consulta de préstamo no recuperó ConsumerLoan');await page.screenshot({path:'docs/evidence/bian-ai-real.png'});}
    if(runs.length===2)assert.ok(data.suggestions.some(s=>s.domainId==='CurrentAccount'),'La consulta de cuenta no recuperó CurrentAccount');
    console.log(JSON.stringify({elapsedMs:data.elapsedMs,candidates:data.suggestions.map(s=>s.domainId+' '+s.path)}));
  }
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.doesNotMatch(log,/OFFLINE_TEST|Descargando|Preparando dependencias/);
  const result={date:'2026-10-23',passed:true,kind:'REAL Ollama HTTP + embeddings + chat + browser UI; no doubles',startupMs,engineVersion:'0.40.10',hardware:'Windows x64; 16 GiB RAM; GTX 1050 Ti 4 GiB',network:'Node external destinations and Chromium external requests blocked; prepared Ollama runs with OLLAMA_NO_CLOUD=1. No OS-level firewall audit.',external,errors,runs,limitations:'Three fictitious cases, not a human utility evaluation or proof of semantic correctness. Lexical baseline lists first operation per domain; IA may select another operation in the domain. No clean bootstrap repeated for Draw.io.'};
  await writeFile('docs/evidence/bian-ai-real-results.json',JSON.stringify(result,null,2)+'\n');console.log('Prueba real aprobada.');
}finally{await browser?.close();server?.kill();}
