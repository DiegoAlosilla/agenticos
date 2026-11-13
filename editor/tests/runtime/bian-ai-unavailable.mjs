// Real app + real connection refusal, no route double. Requires npm start, stopped ai:serve.
import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
let reachable=false;try{reachable=(await fetch('http://127.0.0.1:11434/api/version',{signal:AbortSignal.timeout(1000)})).ok;}catch{}
assert.equal(reachable,false,'Detén ai:serve para probar su ausencia real.');
const browser=await chromium.launch(),external=[],errors=[],requests=[];
try{
  const context=await browser.newContext();await context.route('**/*',route=>{if(new URL(route.request().url()).origin==='http://127.0.0.1:8080')return route.continue();external.push(route.request().url());return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/bian-ai/'))requests.push(r.postDataJSON());});
  await page.goto('http://127.0.0.1:8080/?lang=es&ui=kennedy&mode=device');await page.waitForFunction(()=>!!window.Draw?.loadPlugin);await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await page.waitForFunction(()=>!!window.testUi?.fileNode);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();await page.getByRole('button',{name:'Consultar BIAN',exact:true}).click();await page.getByRole('textbox',{name:'Propósito del endpoint'}).fill('iniciar préstamo personal ficticio');await page.waitForFunction(()=>document.querySelector('.ct-bian-domain')?.textContent==='Consumer Loan');assert.equal(requests.length,0);
  const before=await page.evaluate(()=>({xml:testUi.getFileData(true),undo:testUi.editor.undoManager.indexOfNextAdd}));
  const pending=page.waitForResponse(r=>r.url().endsWith('/api/bian-ai/suggest'));await page.getByRole('button',{name:'Sugerir con IA local',exact:true}).click();const response=await pending;assert.equal(response.status(),503);
  await page.waitForFunction(()=>document.querySelector('.ct-bian-ai-status')?.textContent.includes('búsqueda por palabras sigue disponible'));assert.deepEqual(await page.evaluate(()=>({xml:testUi.getFileData(true),undo:testUi.editor.undoManager.indexOfNextAdd})),before);
  assert.equal(await page.locator('.ct-bian-domain').first().textContent(),'Consumer Loan');assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  const result={date:'2026-10-23',passed:true,kind:'Real app and actual absent Ollama, no doubles',status:response.status(),requests,external,errors,documentAndUndoUnchanged:true,lexicalSearchUsable:true};await writeFile('docs/evidence/bian-ai-unavailable.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
