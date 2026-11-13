import {contractMenu} from '../contract-menu.mjs';
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
test('etapa 5: copiar, páginas, salvar y reabrir sin originales; copia incompleta bloqueada',async({browser})=>{
  const ledger={requests:[],external:[]};
  async function setup(vanilla=false){
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    context.on('request',request=>ledger.requests.push({url:request.url(),method:request.method()}));
    await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();ledger.external.push(route.request().url());return route.abort('internetdisconnected');});
    const page=await context.newPage();await page.goto('http://127.0.0.1:8080/?lang=es&ui=kennedy'+(vanilla?'&contracts=0':''));
    await page.waitForFunction(()=>typeof window.Draw?.loadPlugin==='function');
    await page.evaluate(()=>Draw.loadPlugin(ui=>{window.testUi=ui;}));await page.waitForFunction(()=>!!window.testUi?.fileNode);
    return {page,context};
  }
  const author=await setup(),page=author.page;
  await page.evaluate(xml=>window.testUi.setFileData(xml),await readFile('examples/diagrams/etapa-3-flujo-ficticio.drawio','utf8'));
  const before=await page.evaluate(()=>window.testUi.fileNode.getAttribute('contractsRegistry'));
  await page.evaluate(()=>{
    const g=window.testUi.editor.graph,c=g.getChildVertices(g.getDefaultParent())[0];
    mxClipboard.copy(g,[c]);mxClipboard.paste(g);
    const copy=g.getChildVertices(g.getDefaultParent())[4];g.moveCells([copy],60-copy.geometry.x,520-copy.geometry.y);
    const cache=g.insertVertex(g.getDefaultParent(),null,'Caché ficticia',450,520,120,80,'shape=cylinder3;whiteSpace=wrap;html=0;');
    const step=g.insertVertex(g.getDefaultParent(),null,'Validación manual ficticia',620,520,180,60,'whiteSpace=wrap;html=0;');
    g.insertEdge(g.getDefaultParent(),null,'paso ficticio',c,step);
    g.insertEdge(g.getDefaultParent(),null,'consulta ficticia',c,cache);
    const ui=window.testUi;ui.selectPage(ui.duplicatePage(ui.currentPage,'Escenario ficticio duplicado'));ui.selectPage(ui.pages[0]);
  });
  const summary=await page.evaluate(()=>{
    const ui=window.testUi,g=ui.editor.graph;return {registry:ui.fileNode.getAttribute('contractsRegistry'),pages:ui.pages.length,
      cells:g.getChildVertices(g.getDefaultParent()).map(c=>({id:c.id,label:g.convertValueToString(c),style:c.style,ref:g.getAttributeForCell(c,'contractRef',''),note:g.getAttributeForCell(c,'authorNote',''),geometry:{x:c.geometry.x,y:c.geometry.y,width:c.geometry.width,height:c.geometry.height}})),edges:g.getChildEdges(g.getDefaultParent()).map(e=>({id:e.id,source:e.source.id,target:e.target.id,label:g.convertValueToString(e)}))};
  });
  expect(summary.registry).toBe(before);expect(summary.pages).toBe(2);expect(summary.cells).toHaveLength(7);
  expect(summary.cells[0].ref).toBe(summary.cells[4].ref);expect(summary.cells[0].id).not.toBe(summary.cells[4].id);
  const download=page.waitForEvent('download');await page.evaluate(()=>window.testUi.actions.get('contractsSave').funct());
  await(await download).saveAs('examples/diagrams/mvp-ficticio.drawio');await author.context.close();
  const disk=await readFile('examples/diagrams/mvp-ficticio.drawio','utf8');
  const native=await setup(true);
  await native.page.evaluate(xml=>window.testUi.setFileData(xml),disk);
  const editedLabel='Cliente ficticio: etiqueta editada sin extensión';
  await native.page.evaluate(label=>{const g=window.testUi.editor.graph;g.cellLabelChanged(g.getChildVertices(g.getDefaultParent())[0],label);},editedLabel);
  await native.page.getByText('Archivo',{exact:true}).click();await native.page.getByText('Guardar como...',{exact:true}).click();
  const dialog=native.page.locator('.geDialog');await dialog.getByRole('textbox').fill('mvp-sin-extension-ficticio.drawio');
  await dialog.getByRole('combobox').filter({hasText:'Dispositivo'}).selectOption({label:'Descargar'});
  const nativeDownload=native.page.waitForEvent('download');await dialog.getByRole('button',{name:'OK',exact:true}).click();
  await(await nativeDownload).saveAs('examples/diagrams/mvp-sin-extension-ficticio.drawio');await native.context.close();
  summary.cells[0].label=editedLabel;
  const reopened=await setup();
  await reopened.page.evaluate(xml=>window.testUi.setFileData(xml),await readFile('examples/diagrams/mvp-sin-extension-ficticio.drawio','utf8'));
  const recovered=await reopened.page.evaluate(()=>{
    const ui=window.testUi,g=ui.editor.graph;return {registry:ui.fileNode.getAttribute('contractsRegistry'),pages:ui.pages.length,
      cells:g.getChildVertices(g.getDefaultParent()).map(c=>({id:c.id,label:g.convertValueToString(c),style:c.style,ref:g.getAttributeForCell(c,'contractRef',''),note:g.getAttributeForCell(c,'authorNote',''),geometry:{x:c.geometry.x,y:c.geometry.y,width:c.geometry.width,height:c.geometry.height}})),edges:g.getChildEdges(g.getDefaultParent()).map(e=>({id:e.id,source:e.source.id,target:e.target.id,label:g.convertValueToString(e)}))};
  });
  expect(recovered).toEqual(summary);
  await reopened.page.evaluate(()=>{const g=window.testUi.editor.graph;g.setSelectionCell(g.getChildVertices(g.getDefaultParent())[0]);});
  await contractMenu(reopened.page,'contractsInspect');await expect(reopened.page.getByRole('heading',{name:'GET /clientes/{clienteId}',exact:true})).toBeVisible();
  await reopened.page.screenshot({path:'work/etapa-5-perfil-limpio.png'});await reopened.page.evaluate(()=>window.testUi.actions.get('format').funct());
  // Same editor, different document. Native mxClipboard paste is guarded before insertion.
  await reopened.page.evaluate(()=>{const ui=window.testUi,g=ui.editor.graph;mxClipboard.copy(g,[g.getChildVertices(g.getDefaultParent())[0]]);ui.setFileData(ui.emptyDiagramXml);mxClipboard.paste(g);});
  await expect(reopened.page.getByText(/Copia bloqueada: el documento destino/)).toBeVisible();
  expect(await reopened.page.evaluate(()=>{const g=window.testUi.editor.graph;return g.getChildVertices(g.getDefaultParent()).length;})).toBe(0);
  await reopened.page.evaluate(()=>window.testUi.hideDialog());
  await reopened.page.evaluate(()=>{const g=window.testUi.editor.graph,c=g.insertVertex(g.getDefaultParent(),null,'Figura libre ficticia',20,20,100,60);mxClipboard.copy(g,[c]);mxClipboard.paste(g);});
  expect(await reopened.page.evaluate(()=>{const g=window.testUi.editor.graph;return g.getChildVertices(g.getDefaultParent()).length;})).toBe(2);
  await reopened.context.close();expect(ledger.external).toEqual([]);expect(ledger.requests.every(r=>r.method==='GET')).toBe(true);
  await writeFile('work/etapa-5-network.json',JSON.stringify(ledger,null,2));
});
