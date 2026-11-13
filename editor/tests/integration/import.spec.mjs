import {contractMenu} from '../contract-menu.mjs';
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const editorUrl='/?lang=es&ui=kennedy';
async function bridge(page){
  await page.waitForFunction(()=>typeof window.Draw?.loadPlugin==='function');
  await page.evaluate(()=>Draw.loadPlugin(ui=>{window.testUi=ui;}));
  await page.waitForFunction(()=>!!window.testUi?.fileNode);
}
async function importFile(page,file){
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();
  const previous=await page.locator('.ct-api-tools [role=status]').textContent();
  const pending=page.waitForEvent('filechooser');
  await page.getByRole('button',{name:'Importar',exact:true}).click();
  await (await pending).setFiles(file);
  await page.waitForFunction(previous=>!!document.querySelector('[role=alert]')||document.querySelector('.ct-api-tools [role=status]')?.textContent!==previous,previous);
}
async function registry(page){return page.evaluate(()=>window.testUi.fileNode.getAttribute('contractsRegistry'));}
test('etapa 2: importar tres versiones, deduplicar y rechazar sin cambiar el lienzo',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const ledger={external:[],requests:[],errors:[]};
  context.on('request',request=>ledger.requests.push({url:request.url(),method:request.method()}));
  await context.route('**/*',route=>{
    if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();
    ledger.external.push(route.request().url());return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>ledger.errors.push(error.message));
  await page.goto('http://127.0.0.1:8080'+editorUrl);await bridge(page);
  for(const [file,title,version] of [
    ['clientes-3.1-ficticios.json','API de clientes de demostración','OpenAPI 3.1.2'],
    ['ofertas-3.0-ficticias.yaml','API de ofertas de demostración','OpenAPI 3.0.4'],
    ['archivos-swagger-2-ficticios.json','API ficticia anterior','Swagger 2.0']]){
    await importFile(page,`examples/contracts/${file}`);
    await expect(page.getByRole('status')).toContainText(title);await expect(page.locator('.geDialog')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText(version);
  }
  const snapshot=await registry(page), data=JSON.parse(snapshot);
  expect(data.version).toBe(2);expect(data.revisions).toHaveLength(3);
  expect(new Set(data.revisions.map(r=>r.apiId)).size).toBe(3);
  expect(data.revisions[1].snapshot).toBe(await readFile('examples/contracts/ofertas-3.0-ficticias.yaml','utf8'));
  await importFile(page,'examples/contracts/clientes-3.1-ficticios.json');
  await expect(page.getByRole('status')).toContainText('archivo ya importado');expect(await registry(page)).toBe(snapshot);
  for(const [file,message] of [['external-reference.yaml','EXTERNAL_REFERENCE'],['unsupported-version.yaml','UNSUPPORTED_VERSION'],['missing-yaml-separators.yaml','La raíz debe ser un mapa']]){
    await importFile(page,`tests/fixtures/${file}`);
    await expect(page.getByText(new RegExp(message))).toBeVisible();
    expect(await registry(page)).toBe(snapshot);
    if(file==='missing-yaml-separators.yaml'){
      await expect(page.getByRole('alert')).toContainText('openapi: 3.1.0');
      await page.screenshot({path:'docs/evidence/error-yaml-ficticio.png'});
    }
    await page.evaluate(()=>window.testUi.hideDialog());
  }
  const invalid={openapi:'3.0.0',info:{title:'API de diagnóstico ficticia',version:'1.0.0'},paths:{'/ficticio':{get:{parameters:[{name:'filtro',in:'query',stype:'form',schema:{type:'string'}}],responses:{'200':{description:'Respuesta ficticia'}}}}},components:{securitySchemes:{demo:{type:'http',name:'incorrecto'}}}};
  const invalidChooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Importar',exact:true}).click();await(await invalidChooser).setFiles({name:'diagnostico-ficticio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
  await expect(page.getByRole('alert')).toContainText('stype');await expect(page.getByRole('alert')).toContainText('scheme');
  expect(await page.locator('.ct-issue').count()).toBeGreaterThanOrEqual(3);expect(await registry(page)).toBe(snapshot);
  await page.screenshot({path:'docs/evidence/importacion-diagnosticos.png'});await page.getByRole('button',{name:'OK',exact:true}).click();
  const cells=await page.evaluate(()=>window.testUi.editor.graph.getChildVertices(window.testUi.editor.graph.getDefaultParent()).length);
  expect(cells).toBe(0);
  await page.evaluate(()=>window.testUi.actions.get('undo').funct());
  expect(JSON.parse(await registry(page)).revisions).toHaveLength(2);
  await page.evaluate(()=>window.testUi.actions.get('redo').funct());expect(await registry(page)).toBe(snapshot);
  await page.screenshot({path:'work/etapa-2-importacion.png'});
  const xml=await page.evaluate(()=>window.testUi.getFileData(true));
  await writeFile('examples/diagrams/etapa-2-contratos-ficticios.drawio',xml);
  await context.close();
  const clean=await browser.newContext();
  const reopened=await clean.newPage();await reopened.goto('http://127.0.0.1:8080'+editorUrl);await bridge(reopened);
  const disk=await readFile('examples/diagrams/etapa-2-contratos-ficticios.drawio','utf8');
  await reopened.evaluate(xml=>window.testUi.setFileData(xml),disk);
  expect(await registry(reopened)).toBe(snapshot);
  await importFile(reopened,'examples/contracts/ofertas-3.0-ficticias.yaml');
  await expect(reopened.getByRole('status')).toContainText('archivo ya importado');
  // Legacy demo action also reuses an already imported identical file/API.
  await importFile(reopened,'examples/contracts/clientes-ficticios.json');
  const withDemo=JSON.parse(await registry(reopened));
  await contractMenu(reopened,'contractsDemo');
  await expect.poll(()=>reopened.evaluate(()=>window.testUi.editor.graph.getChildVertices(window.testUi.editor.graph.getDefaultParent()).length)).toBe(1);
  expect(JSON.parse(await registry(reopened)).revisions).toHaveLength(withDemo.revisions.length);
  expect(await reopened.evaluate(()=>{const g=window.testUi.editor.graph;return JSON.parse(g.getAttributeForCell(g.getSelectionCell(),'contractRef','')).apiId;})).toBe(withDemo.revisions.at(-1).apiId);
  await clean.close();
  expect(ledger.external).toEqual([]);expect(ledger.errors).toEqual([]);expect(ledger.requests.every(r=>r.method==='GET')).toBe(true);
  await writeFile('work/etapa-2-network.json',JSON.stringify(ledger,null,2));
});
