import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';

test('autoría retirada: preserva diseños existentes y consulta con colores nativos',async({browser})=>{
  const external=[],errors=[],palettes=[];
  async function setup(dark=false,vanilla=false){
    const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:dark?'dark':'light'});
    await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/?lang=es&ui=kennedy'+(vanilla?'&contracts=0':''));
    await page.waitForFunction(()=>!!window.Draw?.loadPlugin);
    await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));
    await page.waitForFunction(()=>!!window.testUi?.fileNode);
    return {context,page};
  }
  const original=await readFile('examples/diagrams/autoria-g1-ficticia.drawio','utf8');
  const state=page=>page.evaluate(()=>({drafts:testUi.fileNode.getAttribute('contractsDrafts'),registry:testUi.fileNode.getAttribute('contractsRegistry'),pages:testUi.pages.map(p=>p.id),cells:Object.values(testUi.editor.graph.model.cells).filter(c=>c.vertex||c.edge).map(c=>({id:c.id,label:testUi.editor.graph.convertValueToString(c),style:c.style,ref:c.value?.getAttribute?.('contractDraftRef')||'',note:c.value?.getAttribute?.('authorNote')||'',geometry:c.geometry?JSON.parse(JSON.stringify(c.geometry)):null,source:c.source?.id,target:c.target?.id}))}));
  let saved,before;
  for(const dark of [false,true]){
    const {context,page}=await setup(dark);await page.evaluate(xml=>testUi.setFileData(xml),saved??original);
    expect(await page.evaluate(()=>!!testUi.actions.get('contractsNewDraft'))).toBe(false);
    const initial=await state(page);if(before)expect(initial).toEqual(before);else before=initial;
    await page.getByRole('tab',{name:'Contratos',exact:true}).click();
    await expect(page.getByRole('button',{name:'Nueva API',exact:true})).toHaveCount(0);
    await expect(page.getByLabel('Abrir borrador',{exact:true})).toHaveCount(0);
    await page.evaluate(()=>{const g=testUi.editor.graph;g.setSelectionCell(g.getChildVertices(g.getDefaultParent()).find(c=>c.value?.getAttribute?.('contractDraftRef')));});
    await expect(page.locator('.ct-authoring')).toHaveCount(0);
    await page.locator('.ct-api-choice').first().click();
    await expect(page.locator('.ct-add-operation').first()).toBeVisible();
    const palette=await page.evaluate(()=>{function colors(node){const style=getComputedStyle(node);let background=style.backgroundColor,parent=node;while(background==='rgba(0, 0, 0, 0)'&&(parent=parent.parentElement)){background=getComputedStyle(parent).backgroundColor;}return {color:style.color,background,border:style.borderTopColor};}const host=document.querySelector('[data-renderer=swagger-ui]');return {dark:document.body.classList.contains('geDarkMode'),native:colors(document.querySelector('.ct-api-toolbar .geBtn')),operation:colors(host.shadowRoot.querySelector('.ct-add-operation')),all:colors(document.querySelector('.ct-add-all'))};});
    palettes.push(palette);expect(palette.dark).toBe(dark);expect(palette.operation).toEqual(palette.native);expect(palette.all).toEqual(palette.native);
    await expect(page.locator('.opblock.is-open')).toHaveCount(0);
    await page.screenshot({path:`docs/evidence/consulta-nativa-${dark?'oscura':'clara'}.png`});
    await page.getByRole('button',{name:'Cerrar contrato',exact:true}).click();
    expect(await state(page)).toEqual(before);
    saved=await page.evaluate(()=>testUi.getFileData(true));
    await context.close();
  }
  const native=await setup(false,true);await native.page.evaluate(xml=>testUi.setFileData(xml),saved);expect(await state(native.page)).toEqual(before);saved=await native.page.evaluate(()=>testUi.getFileData(true));await native.context.close();
  const reopened=await setup();await reopened.page.evaluate(xml=>testUi.setFileData(xml),saved);expect(await state(reopened.page)).toEqual(before);
  await reopened.page.evaluate(()=>{const ui=testUi,g=ui.editor.graph;mxClipboard.copy(g,[g.getChildVertices(g.getDefaultParent()).find(c=>c.value?.getAttribute?.('contractDraftRef'))]);ui.setFileData(ui.emptyDiagramXml);mxClipboard.paste(g);});
  await expect(reopened.page.getByText(/Copia bloqueada: el documento destino no contiene el borrador/)).toBeVisible();
  expect(await reopened.page.evaluate(()=>testUi.editor.graph.getChildVertices(testUi.editor.graph.getDefaultParent()).length)).toBe(0);
  await reopened.page.evaluate(()=>{testUi.hideDialog();testUi.fileNode.setAttribute('contractsDrafts','{"version":99,"apis":[],"dato":"ficticio"}');});
  const future=await reopened.page.evaluate(()=>testUi.getFileData(true));await reopened.page.evaluate(xml=>testUi.setFileData(xml),future);expect(await reopened.page.evaluate(()=>testUi.fileNode.getAttribute('contractsDrafts'))).toBe('{"version":99,"apis":[],"dato":"ficticio"}');
  await reopened.context.close();expect(external).toEqual([]);expect(errors).toEqual([]);
  await writeFile('docs/evidence/authoring-paused-summary.json',JSON.stringify({date:'2026-10-18',scenario:'UI retirada, preservación y colores nativos',palettes,external,errors},null,2)+'\n');
});
