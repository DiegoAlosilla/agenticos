import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('data/bian/catalog.json','utf8'));

test('BIAN detalle compacto: ancho inicial real, todas las operaciones y acción visible al desplegar originales',async({browser})=>{
  const measurements=[];
  for(const dark of [false,true]){
    const context=await browser.newContext({viewport:{width:1220,height:884},colorScheme:dark?'dark':'light'}),external=[],errors=[];
    await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('/?lang=es&ui=kennedy&mode=device');
    await page.waitForFunction(()=>!!window.Draw?.loadPlugin);await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await page.waitForFunction(()=>!!window.testUi?.fileNode);
    await page.getByRole('tab',{name:'Contratos',exact:true}).click();await page.getByRole('tab',{name:'BIAN',exact:true}).click();
    const state=()=>page.evaluate(()=>({xml:testUi.getFileData(true).replace(/ (dx|dy)="[^"]*"/g,''),undo:testUi.editor.undoManager.indexOfNextAdd})),before=await state();
    await page.getByRole('button',{name:'Account Recovery',exact:true}).click();
    const domain=catalog.domains.find(d=>d.id==='AccountRecovery'),picker=page.getByRole('combobox',{name:'Operación BIAN',exact:true});
    await expect(picker.locator('option')).toHaveCount(domain.operations.length);await expect(page.locator('.ct-bian-operation')).toHaveCount(1);
    // Every published operation remains reachable by explicit selection, with a matching insert action.
    for(const option of await picker.locator('option').all()){
      const value=await option.getAttribute('value'),label=await option.textContent();await picker.selectOption(value);
      const path=await page.locator('.ct-bian-operation code').textContent(),operation=domain.operations.find(o=>`${o.method} ${o.path}`===path);
      expect(label).toContain(operation.operationId);await expect(page.getByRole('button',{name:`Agregar endpoint BIAN ${domain.id} ${operation.operationId}`,exact:true})).toHaveCount(1);
    }
    await picker.focus();await page.keyboard.press('Home');await page.keyboard.press('Enter');await page.keyboard.press('Escape');await expect(picker).toBeFocused();
    async function visibleAction(){return page.locator('.ct-bian').evaluate(root=>{const pane=root.querySelector('.ct-bian-detail-pane').getBoundingClientRect(),add=root.querySelector('.ct-bian-add').getBoundingClientRect();return {panel:root.getBoundingClientRect().width,pane:{x:pane.x,y:pane.y,width:pane.width,height:pane.height},add:{x:add.x,y:add.y,width:add.width,height:add.height},overflow:[root,...root.querySelectorAll('.ct-bian-detail-pane,.ct-bian-scroll,.ct-bian-operation')].some(e=>e.scrollWidth>e.clientWidth+1)};});}
    const bounds=await visibleAction();expect(bounds.panel).toBeGreaterThan(460);expect(bounds.panel).toBeLessThan(490);expect(bounds.add.y+bounds.add.height).toBeLessThanOrEqual(bounds.pane.y+bounds.pane.height);expect(bounds.add.x+bounds.add.width).toBeLessThanOrEqual(bounds.pane.x+bounds.pane.width);expect(bounds.overflow).toBe(false);
    await expect(page.locator('.ct-bian-domain-info')).not.toHaveAttribute('open','');await expect(page.locator('.ct-bian-operation-original')).not.toHaveAttribute('open','');
    await page.screenshot({path:`docs/evidence/bian-detail-compact-catalogo-${dark?'oscuro':'claro'}.png`});
    await page.locator('.ct-bian-operation-original>summary').click();await page.locator('.ct-bian-domain-info>summary').click();await page.locator('.ct-bian-original>summary').click();
    await expect(page.locator('.ct-bian-original p')).toHaveText(domain.description);
    const top=await visibleAction();await page.locator('.ct-bian-scroll').hover();await page.mouse.wheel(0,1000);await expect.poll(()=>page.locator('.ct-bian-scroll').evaluate(e=>e.scrollTop)).toBeGreaterThan(0);expect((await visibleAction()).add).toEqual(top.add);
    const scrollBefore=await page.locator('.ct-bian-scroll').evaluate(e=>e.scrollTop);await page.evaluate(()=>testUi.format.immediateRefresh());expect(await page.locator('.ct-bian-scroll').evaluate(e=>e.scrollTop)).toBe(scrollBefore);
    expect(await state()).toEqual(before);
    const selectedPath=await page.locator('.ct-bian-operation code').textContent();await page.locator('.ct-bian-add').click();
    expect(await page.evaluate(()=>testUi.editor.undoManager.indexOfNextAdd)).toBe(before.undo+1);expect(await page.evaluate(()=>{const o=JSON.parse(testUi.editor.graph.getSelectionCell().value.getAttribute('bianRef')).operation;return `${o.method} ${o.path}`;})).toBe(selectedPath);
    await page.evaluate(()=>testUi.editor.undoManager.undo());expect(await state()).toEqual(before);
    measurements.push({dark,bounds,operationsReviewed:domain.operations.length,external,errors});expect(external).toEqual([]);expect(errors).toEqual([]);await context.close();
  }
  await writeFile('docs/evidence/bian-detail-compact-layout.json',JSON.stringify({date:'2026-10-24',viewport:'1220×884',catalog:'real pinned local data; no model call',measurements},null,2)+'\n');
});
