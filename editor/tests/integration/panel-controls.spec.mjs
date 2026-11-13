import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {contractMenu} from '../contract-menu.mjs';

test('ajustes de controles: ancho, cierre integrado y API completa portable en una transacción',async({browser})=>{
  const external=[],errors=[];
  async function setup(plain=false){
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8080/?lang=es&ui=kennedy'+(plain?'&contracts=0':''));
    await page.waitForFunction(()=>!!window.Draw?.loadPlugin);await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await page.waitForFunction(()=>!!window.testUi?.fileNode);
    return {page,context};
  }
  const author=await setup(),page=author.page;
  await page.evaluate(xml=>testUi.setFileData(xml),await readFile('examples/diagrams/etapa-2-contratos-ficticios.drawio','utf8'));
  await expect(page.locator('[data-contract-controls]')).toHaveCount(0);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();
  const panel=page.locator('.geFormatContainer'),search=page.getByRole('searchbox',{name:'Busca tu API'}),separator=page.getByRole('separator',{name:'Ancho del panel de contratos'});
  await expect(page.getByRole('button',{name:'Importar',exact:true})).toBeVisible();
  await search.fill('clientes');await page.getByRole('button',{name:/Seleccionar API API de clientes de demostración/}).click();
  await expect(page.locator('.ct-api-tools [role=status]')).toBeHidden();
  await expect(page.locator('.ct-swagger-toolbar').getByRole('button',{name:'Cerrar contrato',exact:true})).toHaveText('×');
  await expect(page.locator('.ct-api-document-bar')).toHaveCount(0);
  await page.getByRole('button',{name:'Agregar al lienzo GET /clientes/{clienteId} · API de clientes de demostración',exact:true}).click();
  const original=await page.evaluate(()=>{const g=testUi.editor.graph,c=g.getSelectionCell();g.setAttributeForCell(c,'authorNote','Nota ficticia conservada');g.insertEdge(g.getDefaultParent(),null,'Conexión ficticia',c,c.children[0]);return {id:c.id,geometry:JSON.stringify(c.geometry),note:c.value.getAttribute('authorNote'),ref:c.value.getAttribute('contractRef'),registry:testUi.fileNode.getAttribute('contractsRegistry')};});
  // Real pointer drag plus keyboard bounds. Resizing must survive native refresh.
  const initial=(await panel.boundingBox()).width,handle=await separator.boundingBox();
  await page.mouse.move(handle.x+3,handle.y+120);await page.mouse.down();await page.mouse.move(handle.x-117,handle.y+120,{steps:8});await page.mouse.up();
  expect((await panel.boundingBox()).width).toBeCloseTo(initial+120,0);
  await separator.press('ArrowLeft');const preferred=(await panel.boundingBox()).width;expect(preferred).toBeCloseTo(initial+140,0);
  await panel.getByText('Estilo',{exact:true}).click();await expect(separator).toBeHidden();expect((await panel.boundingBox()).width).toBeLessThan(preferred);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();expect((await panel.boundingBox()).width).toBeCloseTo(preferred,0);
  await separator.press('Home');expect((await panel.boundingBox()).width).toBe(300);
  await expect(page.getByRole('button',{name:'Cerrar contrato',exact:true})).toBeVisible();
  await separator.press('End');expect((await panel.boundingBox()).width).toBe(1000);
  await page.setViewportSize({width:640,height:720});
  await page.waitForFunction(()=>testUi.lastWindowWidth===640);
  await page.evaluate(()=>{if(testUi.formatWidth===0)testUi.actions.get('format').funct();});expect((await panel.boundingBox()).width).toBeLessThanOrEqual(600);
  await expect(search).toBeVisible();expect(await panel.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
  await page.setViewportSize({width:1440,height:1000});await separator.press('Home');
  const all=page.getByRole('button',{name:'Agregar todos los endpoints · API de clientes de demostración',exact:true});
  await all.click();await expect(search).toHaveValue('clientes');await expect(page.locator('.opblock')).toHaveCount(3);await expect(page.locator('.opblock.is-open')).toHaveCount(0);
  const state=()=>page.evaluate(()=>{const g=testUi.editor.graph;return g.getChildVertices(g.getDefaultParent()).map(c=>({id:c.id,geometry:JSON.stringify(c.geometry),label:g.convertValueToString(c),ref:g.getAttributeForCell(c,'contractRef',''),note:g.getAttributeForCell(c,'authorNote',''),children:(c.children??[]).filter(child=>g.getAttributeForCell(child,'contractState','')==='linked').map(child=>({id:child.id,parent:child.parent.id,ref:g.getAttributeForCell(child,'contractRef',''),label:g.convertValueToString(child),geometry:JSON.stringify({x:child.geometry.x,y:child.geometry.y,width:child.geometry.width,height:child.geometry.height,relative:!!child.geometry.relative})}))}));});
  const inserted=await state();expect(inserted).toHaveLength(2);expect(inserted[0]).toMatchObject({id:original.id,geometry:original.geometry,note:original.note,ref:original.ref});
  const group=inserted[1];expect(group.children).toHaveLength(3);expect(new Set(group.children.map(c=>JSON.parse(c.ref).method)).size).toBe(3);expect(group.children.every(c=>c.parent===group.id)).toBe(true);
  expect(await page.evaluate(()=>testUi.fileNode.getAttribute('contractsRegistry'))).toBe(original.registry);
  await page.evaluate(()=>testUi.actions.get('undo').funct());expect(await state()).toEqual([inserted[0]]);
  await page.evaluate(()=>testUi.actions.get('redo').funct());expect(await state()).toEqual(inserted);
  // Endpoint selection and individual copying use its own explicit reference.
  await page.evaluate(id=>{const g=testUi.editor.graph;g.setSelectionCell(g.model.getCell(id));},group.children[0].id);
  await contractMenu(page,'contractsInspect');await expect(page.locator('.opblock')).toHaveCount(1);
  await page.evaluate(()=>{const g=testUi.editor.graph;mxClipboard.copy(g,g.getSelectionCells());mxClipboard.paste(g);});
  const withChild=await state();expect(withChild).toHaveLength(3);expect(withChild[2].ref).toBe(group.children[0].ref);expect(withChild[2].id).not.toBe(group.children[0].id);
  await page.evaluate(()=>testUi.actions.get('undo').funct());
  await page.evaluate(id=>{const g=testUi.editor.graph;g.setSelectionCell(g.model.getCell(id));mxClipboard.copy(g,g.getSelectionCells());mxClipboard.paste(g);},group.id);
  const copied=await state();expect(copied).toHaveLength(3);expect(copied[2].children.map(c=>c.ref)).toEqual(group.children.map(c=>c.ref));expect(copied[2].id).not.toBe(group.id);
  await page.evaluate(()=>testUi.actions.get('undo').funct());
  await page.evaluate(()=>testUi.selectPage(testUi.duplicatePage(testUi.currentPage,'API ficticia duplicada')));
  const duplicatePage=await state();expect(duplicatePage[1].children.map(c=>c.ref)).toEqual(group.children.map(c=>c.ref));expect(duplicatePage[1].id).not.toBe(group.id);
  await page.evaluate(()=>testUi.selectPage(testUi.pages[0]));expect(await state()).toEqual(inserted);
  await page.getByRole('button',{name:/Seleccionar API API de clientes de demostración/}).click();
  await separator.press('ArrowLeft');await separator.press('ArrowLeft');await separator.press('ArrowLeft');await separator.press('ArrowLeft');await separator.press('ArrowLeft');await separator.press('ArrowLeft');await separator.press('ArrowLeft');
  await page.screenshot({path:'docs/evidence/controles-contratos-1.10.png'});
  await page.getByRole('button',{name:'Cerrar contrato',exact:true}).click();await expect(search).toHaveValue('');await expect(page.getByRole('listitem')).toHaveCount(3);await expect(page.locator('.swagger-ui')).toHaveCount(0);
  const download=page.waitForEvent('download');await page.evaluate(()=>testUi.actions.get('contractsSave').funct());await(await download).saveAs('work/api-completa-ficticia.drawio');
  const disk=await readFile('work/api-completa-ficticia.drawio','utf8');await author.context.close();
  for(const plain of [false,true]){
    const clean=await setup(plain);await clean.page.evaluate(xml=>testUi.setFileData(xml),disk);
    const result=await clean.page.evaluate(()=>{const g=testUi.editor.graph;return {registry:testUi.fileNode.getAttribute('contractsRegistry'),children:g.getChildVertices(g.getDefaultParent()).flatMap(c=>(c.children??[]).filter(child=>child.value?.getAttribute?.('contractState')==='linked').map(child=>({id:child.id,parent:child.parent.id,ref:child.value.getAttribute('contractRef'),label:g.convertValueToString(child),geometry:JSON.stringify({x:child.geometry.x,y:child.geometry.y,width:child.geometry.width,height:child.geometry.height,relative:!!child.geometry.relative})})))};});
    expect(result.registry).toBe(original.registry);expect(result.children).toEqual(group.children);
    if(!plain){await clean.page.evaluate(id=>testUi.editor.graph.setSelectionCell(testUi.editor.graph.model.getCell(id)),group.children[1].id);await contractMenu(clean.page,'contractsInspect');await expect(clean.page.locator('.opblock')).toHaveCount(1);}
    else{
      // Serialize after ordinary editing without the extension, then inspect in a
      // fresh editor with it. Native XML serialization must keep descendant refs.
      const saved=await clean.page.evaluate(()=>{const g=testUi.editor.graph,c=g.getChildVertices(g.getDefaultParent())[1];g.cellLabelChanged(c,'API ficticia editada sin extensión');return testUi.getFileData(true);});
      const restored=await setup();await restored.page.evaluate(xml=>testUi.setFileData(xml),saved);
      await restored.page.evaluate(id=>testUi.editor.graph.setSelectionCell(testUi.editor.graph.model.getCell(id)),group.children[2].id);await contractMenu(restored.page,'contractsInspect');await expect(restored.page.locator('.opblock')).toHaveCount(1);
      expect(await restored.page.evaluate(()=>testUi.fileNode.getAttribute('contractsRegistry'))).toBe(original.registry);await restored.context.close();
    }
    await clean.context.close();
  }
  expect(external).toEqual([]);expect(errors).toEqual([]);
});
