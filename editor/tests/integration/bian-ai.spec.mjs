import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('data/bian/catalog.json','utf8')),manifest=JSON.parse(await readFile('data/bian/manifest.json','utf8')),models=JSON.parse(await readFile('config/bian-ai.json','utf8'));
const domain=catalog.domains.find(d=>d.id==='ConsumerLoan'),operation=domain.operations.find(o=>o.action==='Retrieve');
const response={suggestions:[{domainId:domain.id,method:operation.method,path:operation.path,reason:'Explicación ficticia <img src=x onerror="window.injected=true">'}],limitations:'Doble de interfaz; no inferencia real.',catalogCommit:catalog.commit,catalogSha256:manifest.catalogSha256,models:{chat:models.chat,embedding:models.embedding},elapsedMs:123};
async function setup(browser,dark=false){
  const context=await browser.newContext({viewport:{width:1317,height:884},colorScheme:dark?'dark':'light'}),external=[],errors=[],calls=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
  await context.route('**/api/bian-ai/suggest',route=>{calls.push(route.request().postDataJSON());return route.fulfill({json:response});});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('/?lang=es&ui=kennedy&mode=device');
  await page.waitForFunction(()=>!!window.Draw?.loadPlugin);await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await page.waitForFunction(()=>!!window.testUi?.fileNode);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();await page.getByRole('tab',{name:'BIAN',exact:true}).click();
  return {context,page,external,errors,calls};
}
const state=page=>page.evaluate(()=>({xml:testUi.getFileData(true).replace(/ (dx|dy)="[^"]*"/g,''),undo:testUi.editor.undoManager.indexOfNextAdd}));
test('IA BIAN (doble): sugerencia escapada, fuente fijada, revisión e inserción manual deshacible, claro/oscuro',async({browser})=>{
  for(const dark of [false,true]){
    const {context,page,external,errors,calls}=await setup(browser,dark),before=await state(page);
    const purpose=page.getByRole('textbox',{name:'Propósito del endpoint'}),ask=page.getByRole('button',{name:'Sugerir con IA local',exact:true});
    await purpose.fill('consultar cuotas pendientes del préstamo personal ficticio');await page.getByRole('combobox',{name:'Acción BIAN'}).selectOption('Retrieve');expect(calls).toHaveLength(0);
    await ask.focus();await page.keyboard.press('Enter');await expect(page.locator('.ct-bian-ai-suggestion')).toHaveCount(1);
    expect(calls).toEqual([{purpose:'consultar cuotas pendientes del préstamo personal ficticio',action:'Retrieve'}]);
    expect(await state(page)).toEqual(before);await expect(page.locator('.ct-bian-ai-suggestion img')).toHaveCount(0);expect(await page.evaluate(()=>window.injected)).toBeUndefined();
    await expect(page.locator('.ct-bian-ai-suggestion')).toContainText('Explicación ficticia <img');await expect(page.locator('.ct-bian-ai-suggestion a')).toHaveAttribute('href',new RegExp(catalog.commit));
    const native=await page.getByRole('button',{name:'Limpiar',exact:true}).evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
    expect(await ask.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}))).toEqual(native);
    // Minimum supported sidebar width, controlled through its native keyboard resizer.
    await page.getByRole('separator',{name:'Ancho del panel de contratos'}).focus();await page.keyboard.press('Home');
    expect(await page.locator('.ct-bian-ai').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    await page.screenshot({path:`docs/evidence/bian-detail-compact-ai-lista-${dark?'oscuro':'claro'}.png`});
    await page.getByRole('button',{name:'Revisar operación oficial',exact:true}).click();await expect(page.locator('.ct-bian-operation')).toHaveCount(1);await expect(page.locator('.ct-bian-operation')).toContainText(operation.path);
    await page.getByRole('button',{name:'← Dominios',exact:true}).click();await expect(page.getByRole('button',{name:'Revisar operación oficial',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'Revisar operación oficial',exact:true}).click();await page.locator('.ct-bian-provenance>summary').click();await page.getByRole('checkbox',{name:'Mostrar apoyo en español'}).uncheck();await page.locator('.ct-bian-provenance>summary').click();await expect(page.locator('.ct-bian-operation')).toHaveCount(1);await expect(page.locator('.ct-bian-operation')).toContainText(operation.path);
    expect(await state(page)).toEqual(before);
    await page.getByRole('button',{name:`Agregar endpoint BIAN ${domain.id} ${operation.operationId}`,exact:true}).click();
    const inserted=await page.evaluate(()=>{const g=testUi.editor.graph,c=Object.values(g.model.cells).find(c=>c.value?.getAttribute?.('bianRef'));return {ref:JSON.parse(c.value.getAttribute('bianRef')),xml:testUi.getFileData(true)};});
    expect(inserted.ref.operation.path).toBe(operation.path);expect(inserted.xml).not.toContain('Explicación ficticia');expect(inserted.xml).not.toContain('cuotas pendientes');
    await page.evaluate(()=>testUi.editor.undoManager.undo());expect(await state(page)).toEqual(before);await page.evaluate(()=>testUi.editor.undoManager.redo());
    expect((await state(page)).xml).toBe(inserted.xml.replace(/ (dx|dy)="[^"]*"/g,''));expect(external).toEqual([]);expect(errors).toEqual([]);await context.close();
  }
});
test('IA BIAN (doble): errores, filtro, cancelación, resultados tardíos y cambio de documento',async({browser})=>{
  const {context,page}=await setup(browser),purpose=page.getByRole('textbox',{name:'Propósito del endpoint'}),ask=page.getByRole('button',{name:'Sugerir con IA local',exact:true}),status=page.locator('.ct-bian-ai-status');
  await ask.click();await expect(status).toContainText('Escribe primero');
  await purpose.fill('iniciar préstamo personal ficticio');await page.getByRole('combobox',{name:'Acción BIAN'}).selectOption('Initiate');await ask.click();await expect(status).toContainText('fuera del filtro');await expect(page.locator('.ct-bian-ai-suggestion')).toHaveCount(0);
  await page.route('**/api/bian-ai/suggest',route=>route.fulfill({status:503,json:{error:'Motor ficticio ausente.'}}));await ask.click();await expect(status).toContainText('Motor ficticio ausente');await expect(page.locator('.ct-bian-domain').first()).toHaveText('Consumer Loan');
  let finish;const delayed=new Promise(r=>finish=r);await page.route('**/api/bian-ai/suggest',async route=>{await delayed;await route.fulfill({json:response}).catch(()=>{});});
  await ask.click();await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toBeVisible();await page.getByRole('tab',{name:'Sugerencias IA',exact:true}).click();await expect(page.getByRole('button',{name:'Cancelar',exact:true})).toBeVisible();await purpose.fill('consultar cuenta corriente ficticia');finish();await expect(ask).toBeEnabled();await expect(page.locator('.ct-bian-ai-suggestion')).toHaveCount(0);
  await page.route('**/api/bian-ai/suggest',route=>route.fulfill({json:response}));await page.getByRole('combobox',{name:'Acción BIAN'}).selectOption('Retrieve');await ask.click();await expect(page.locator('.ct-bian-ai-suggestion')).toHaveCount(1);
  const xml=await readFile('examples/diagrams/autoria-g1-ficticia.drawio','utf8');await page.evaluate(xml=>testUi.setFileData(xml),xml);
  await page.getByRole('tab',{name:'BIAN',exact:true}).click();await expect(purpose).toHaveValue('');await expect(page.locator('.ct-bian-ai-suggestion')).toHaveCount(0);await context.close();
});

test('BIAN lista y detalle: columnas, selección explícita, scroll, pestañas y regreso en 300 px',async({browser})=>{
  for(const dark of [false,true]){
    const {context,page,calls,external,errors}=await setup(browser,dark),before=await state(page),separator=page.getByRole('separator',{name:'Ancho del panel de contratos'});
    async function resize(width){await separator.press('Home');for(let current=300;current<width;current+=20)await separator.press('ArrowLeft');}
    await resize(760);await expect(page.getByRole('tab',{name:'BIAN',exact:true})).toBeVisible();await expect(page.getByRole('searchbox',{name:'Busca tu API'})).toBeHidden();await expect(page.getByRole('button',{name:'Importar',exact:true})).toBeHidden();
    await expect(page.locator('.ct-bian-provenance')).not.toHaveAttribute('open','');
    await page.getByRole('textbox',{name:'Propósito del endpoint'}).fill('consultar préstamo personal ficticio');await page.getByRole('combobox',{name:'Acción BIAN'}).selectOption('Retrieve');await page.getByRole('button',{name:'Consumer Loan',exact:true}).click();
    await expect(page.locator('.ct-bian-list-pane')).toBeVisible();await expect(page.locator('.ct-bian-detail')).toBeVisible();await expect(page.getByRole('button',{name:'Consumer Loan',exact:true})).toHaveAttribute('aria-pressed','true');
    const leftBox=await page.locator('.ct-bian-list-pane').boundingBox(),rightBox=await page.locator('.ct-bian-scroll').boundingBox();expect(leftBox.x+leftBox.width).toBeLessThanOrEqual(rightBox.x+1);expect(rightBox.height).toBeGreaterThan(250);
    await page.locator('.ct-bian-list-scroll').hover();await page.mouse.wheel(0,250);await expect.poll(()=>page.locator('.ct-bian-list-scroll').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
    await page.locator('.ct-bian-operation-original>summary').click();await page.locator('.ct-bian-domain-info>summary').click();await page.locator('.ct-bian-original>summary').click();
    await page.setViewportSize({width:1317,height:690});
    await page.locator('.ct-bian-scroll').hover();await page.mouse.wheel(0,150);await expect.poll(()=>page.locator('.ct-bian-scroll').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
    const positions=await page.locator('.ct-bian').evaluate(e=>[e.querySelector('.ct-bian-list-scroll').scrollTop,e.querySelector('.ct-bian-scroll').scrollTop]);await page.evaluate(()=>testUi.format.immediateRefresh());
    await expect.poll(()=>page.locator('.ct-bian').evaluate(e=>[e.querySelector('.ct-bian-list-scroll').scrollTop,e.querySelector('.ct-bian-scroll').scrollTop])).toEqual(positions);
    const current=catalog.domains.find(d=>d.id==='CurrentAccount'),currentOperation=current.operations.find(o=>o.action==='Retrieve');
    await page.route('**/api/bian-ai/suggest',route=>{calls.push(route.request().postDataJSON());return route.fulfill({json:{...response,suggestions:[...response.suggestions,{domainId:current.id,method:currentOperation.method,path:currentOperation.path,reason:'Segunda alternativa ficticia para comparar.'}]}});});
    await page.getByRole('button',{name:'Sugerir con IA local',exact:true}).click();await expect(page.getByRole('tab',{name:'Sugerencias IA',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.locator('.ct-bian-ai-suggestion')).toHaveCount(2);await expect(page.locator('.ct-bian-results')).toBeHidden();
    const candidates=page.getByRole('button',{name:'Revisar operación oficial',exact:true});await candidates.nth(0).click();await expect(page.locator('.ct-bian-detail h3')).toHaveText('Consumer Loan');await candidates.nth(1).click();await expect(page.locator('.ct-bian-detail h3')).toHaveText('Current Account');await expect(candidates.nth(1)).toHaveAttribute('aria-pressed','true');await expect(candidates.nth(0)).toHaveAttribute('aria-pressed','false');await expect(page.locator('.ct-bian-operation')).toHaveCount(1);await expect(page.locator('.ct-bian-operation')).toContainText(currentOperation.path);
    await expect(page.locator('.ct-bian-ai-explanation')).not.toHaveAttribute('open','');await page.locator('.ct-bian-ai-explanation>summary').click();await expect(page.locator('.ct-bian-ai-explanation')).toContainText('Segunda alternativa ficticia');await page.locator('.ct-bian-ai-explanation>summary').click();
    await page.screenshot({path:`docs/evidence/bian-detail-compact-ai-${dark?'oscuro':'claro'}.png`});
    await resize(560);await expect(page.locator('.ct-bian-list-pane')).toBeVisible();await expect(page.locator('.ct-bian-detail')).toBeVisible();expect(await page.locator('.ct-bian').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    await resize(300);await expect(page.locator('.ct-bian-list-pane')).toBeHidden();await expect(page.locator('.ct-bian-detail')).toBeVisible();await expect(page.locator('.ct-bian-scroll')).toHaveJSProperty('scrollLeft',0);expect(await page.locator('.ct-bian').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
    await page.getByRole('button',{name:'← Dominios',exact:true}).click();await expect(page.locator('.ct-bian-list-pane')).toBeVisible();await expect(candidates.nth(1)).toBeFocused();
    await page.getByRole('tab',{name:'Sugerencias IA',exact:true}).press('ArrowLeft');await expect(page.getByRole('tab',{name:'Catálogo',exact:true})).toBeFocused();await expect(page.locator('.ct-bian-results')).toBeVisible();expect(calls).toHaveLength(1);
    expect(await state(page)).toEqual(before);expect(external).toEqual([]);expect(errors).toEqual([]);await context.close();
  }
});
