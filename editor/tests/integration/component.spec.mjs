import {contractMenu} from '../contract-menu.mjs';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('figura de componente: edición, copia interna, conversión reversible y perfil limpio',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true,colorScheme:'light'});
  const page=await context.newPage();
  async function bridge(target){
    await target.waitForFunction(()=>typeof window.Draw?.loadPlugin==='function');
    await target.evaluate(()=>Draw.loadPlugin(ui=>{window.testUi=ui;}));
    await target.waitForFunction(()=>!!window.testUi?.fileNode);
  }
  await page.goto('/?lang=es&ui=kennedy');await bridge(page);
  await contractMenu(page,'contractsDemo');
  await expect.poll(()=>page.evaluate(()=>window.testUi.editor.graph.getChildVertices(window.testUi.editor.graph.getDefaultParent()).length)).toBe(1);
  await page.screenshot({path:'docs/evidence/figura-componente.png'});
  const before=await page.evaluate(()=>{
    const ui=window.testUi,g=ui.editor.graph,root=g.getSelectionCell(),op=root.children.find(c=>g.getAttributeForCell(c,'contractVisualRole','')==='operation');
    const result={root:root.id,child:op.id,ref:g.getAttributeForCell(root,'contractRef',''),parent:op.parent.id};
    // Ordinary Draw.io editing and a connector attached to the inner operation.
    g.cellLabelChanged(op,'«GET»\n/clientes/{clienteId}\nNota visual ficticia');
    g.setAttributeForCell(root,'authorNote','Nota persistente ficticia');
    g.moveCells([root],50,40);
    const cache=g.insertVertex(g.getDefaultParent(),null,'Caché ficticia',650,300,120,70);
    g.insertEdge(g.getDefaultParent(),null,'consulta ficticia',op,cache);
    g.setSelectionCell(op);return result;
  });
  expect(before.parent).toBe(before.root);
  await contractMenu(page,'contractsInspect');
  await expect(page.getByRole('heading',{name:'GET /clientes/{clienteId}',exact:true})).toBeVisible();
  await page.evaluate(()=>window.testUi.actions.get('format').funct());
  const copied=await page.evaluate(()=>{
    const g=window.testUi.editor.graph,selected=g.getSelectionCell();mxClipboard.copy(g,[selected]);mxClipboard.paste(g);
    const copy=g.getSelectionCell();return {id:copy.id,ref:g.getAttributeForCell(copy,'contractRef',''),children:copy.children.length};
  });
  expect(copied.id).not.toBe(before.root);expect(copied.ref).toBe(before.ref);expect(copied.children).toBe(2);
  await page.evaluate(()=>window.testUi.actions.get('undo').funct());
  // Convert an old single box explicitly, preserving identity/edges/notes; undo restores it.
  const old=await page.evaluate(()=>{
    const g=window.testUi.editor.graph,root=g.getChildVertices(g.getDefaultParent())[0];
    const v=root.value.cloneNode(true);v.removeAttribute('contractVisualRole');v.setAttribute('label','Caja anterior ficticia');
    const cell=g.insertVertex(g.getDefaultParent(),null,v,650,100,300,110,'rounded=1;');
    g.insertEdge(g.getDefaultParent(),null,'consumo ficticio',root,cell);g.setSelectionCell(cell);
    return {id:cell.id,style:cell.style};
  });
  await page.evaluate(()=>window.testUi.actions.get('contractsComponent').funct());
  expect(await page.evaluate(()=>window.testUi.editor.graph.getSelectionCell().children.length)).toBe(2);
  await page.evaluate(()=>window.testUi.actions.get('undo').funct());
  expect(await page.evaluate(()=>window.testUi.editor.graph.getSelectionCell().style)).toBe(old.style);
  await page.evaluate(()=>window.testUi.actions.get('redo').funct());
  expect(await page.evaluate(()=>window.testUi.editor.graph.getSelectionCell().id)).toBe(old.id);
  const download=page.waitForEvent('download');await page.evaluate(()=>window.testUi.actions.get('contractsSave').funct());
  await(await download).saveAs('examples/diagrams/figura-componente-ficticia.drawio');
  await context.close();
  const disk=await readFile('examples/diagrams/figura-componente-ficticia.drawio','utf8');
  const clean=await browser.newContext();const reopened=await clean.newPage();
  await reopened.goto('/?lang=es&ui=kennedy');await bridge(reopened);
  await reopened.evaluate(xml=>window.testUi.setFileData(xml),disk);
  const recovered=await reopened.evaluate(({root,child})=>{
    const g=window.testUi.editor.graph,r=g.getModel().getCell(root),op=g.getModel().getCell(child);g.setSelectionCell(op);
    return {parent:op.parent.id,label:g.convertValueToString(op),ref:g.getAttributeForCell(r,'contractRef',''),note:g.getAttributeForCell(r,'authorNote',''),edge:g.getEdges(op)[0]?.source.id};
  },before);
  expect(recovered.parent).toBe(before.root);expect(recovered.edge).toBe(before.child);
  expect(recovered.label).toContain('Nota visual ficticia');expect(recovered.note).toContain('persistente');expect(recovered.ref).toBe(before.ref);
  await contractMenu(reopened,'contractsInspect');
  await expect(reopened.getByRole('heading',{name:'GET /clientes/{clienteId}',exact:true})).toBeVisible();
  await clean.close();
});
