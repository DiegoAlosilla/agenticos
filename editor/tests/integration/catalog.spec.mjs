import {contractMenu} from '../contract-menu.mjs';
import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
test('etapa 3: buscar, botón, arrastre y vinculación conserva trabajo',async({page})=>{
  await page.goto('/?lang=es&ui=kennedy');
  await page.waitForFunction(()=>typeof window.Draw?.loadPlugin==='function');
  await page.evaluate(()=>Draw.loadPlugin(ui=>{window.testUi=ui;}));
  await page.waitForFunction(()=>!!window.testUi?.fileNode);
  // Reopen stage 2's actual snapshots: catalogue never needs original contracts.
  const {readFile}=await import('node:fs/promises');
  const xml=await readFile('examples/diagrams/etapa-2-contratos-ficticios.drawio','utf8');
  await page.evaluate(xml=>window.testUi.setFileData(xml),xml);
  await contractMenu(page,'contractsCatalog');
  const search=page.getByRole('searchbox',{name:'Busca tu API'});
  await search.fill('');
  expect(await page.getByRole('listitem').count()).toBe(3);
  await page.getByRole('button',{name:/Seleccionar API API de clientes de demostración/}).click();
  const client=page.getByRole('button',{name:'Agregar al lienzo GET /clientes/{clienteId} · API de clientes de demostración',exact:true});
  await client.click();
  await page.getByRole('button',{name:/Seleccionar API API de ofertas de demostración/}).click();
  await page.getByRole('button',{name:'Agregar al lienzo GET /clientes/{clienteId} · API de ofertas de demostración',exact:true}).click();
  await contractMenu(page,'contractsCatalog');
  await page.getByRole('button',{name:/Seleccionar API API de clientes de demostración/}).click();
  const handle=page.getByLabel('Arrastrar PATCH /clientes/{clienteId} · API de clientes de demostración',{exact:true});
  await handle.dragTo(page.locator('.geDiagramContainer'),{targetPosition:{x:380,y:400}});
  await expect.poll(()=>page.evaluate(()=>window.testUi.editor.graph.getChildVertices(window.testUi.editor.graph.getDefaultParent()).length)).toBe(3);
  const refs=await page.evaluate(()=>{const g=window.testUi.editor.graph;return g.getChildVertices(g.getDefaultParent()).map(c=>JSON.parse(g.getAttributeForCell(c,'contractRef','')));});
  expect(refs[0].path).toBe(refs[1].path);expect(refs[0].apiId).not.toBe(refs[1].apiId);expect(refs[2].method).toBe('PATCH');
  await page.evaluate(()=>window.testUi.actions.get('contractsPending').funct());
  await page.getByRole('textbox',{name:'Método previsto',exact:true}).fill('POST');
  await page.getByRole('textbox',{name:'Ruta prevista',exact:true}).fill('/previsto');
  await page.getByRole('textbox',{name:'Propósito de la operación',exact:true}).fill('Validación ficticia del canal');
  await page.getByRole('button',{name:'Crear pendiente',exact:true}).click();
  const before=await page.evaluate(()=>{
    const ui=window.testUi,g=ui.editor.graph,c=g.getSelectionCell();
    g.setAttributeForCell(c,'authorNote','Nota ficticia que debe conservarse');
    g.moveCells([c],250,70);const geometry=c.geometry.clone();geometry.width=420;g.getModel().setGeometry(c,geometry);
    const target=g.getChildVertices(g.getDefaultParent())[0];g.insertEdge(g.getDefaultParent(),null,'consumo ficticio',c,target);
    return {id:c.id,geometry:{x:c.geometry.x,y:c.geometry.y,width:c.geometry.width,height:c.geometry.height},style:c.style,label:g.convertValueToString(c)};
  });
  await page.evaluate(()=>window.testUi.actions.get('contractsLink').funct());
  await page.getByRole('searchbox',{name:'Buscar operaciones'}).fill('PATCH /clientes/{clienteId}');
  await page.getByRole('button',{name:'Vincular PATCH /clientes/{clienteId} · API de clientes de demostración',exact:true}).click();
  await expect(page.getByText('Previsto: POST /previsto',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Vincular',exact:true}).click();
  const linked=await page.evaluate(()=>{const g=window.testUi.editor.graph,c=g.getSelectionCell();return {id:c.id,ref:g.getAttributeForCell(c,'contractRef',''),note:g.getAttributeForCell(c,'authorNote',''),label:g.convertValueToString(c),geometry:{x:c.geometry.x,y:c.geometry.y,width:c.geometry.width,height:c.geometry.height},style:c.style,edges:g.getEdges(c).length};});
  expect(linked.id).toBe(before.id);expect(linked.geometry).toEqual(before.geometry);expect(linked.style).toBe(before.style);expect(linked.edges).toBe(1);expect(linked.note).toContain('debe conservarse');expect(linked.label).toContain('Validación ficticia del canal');
  expect(JSON.parse(linked.ref).method).toBe('PATCH');
  await page.evaluate(()=>window.testUi.actions.get('undo').funct());
  expect(await page.evaluate(()=>{const g=window.testUi.editor.graph,c=g.getSelectionCell();return g.getAttributeForCell(c,'contractState','');})).toBe('pending');
  await page.evaluate(()=>window.testUi.actions.get('redo').funct());
  await contractMenu(page,'contractsInspect');
  await expect(page.getByRole('heading',{name:'PATCH /clientes/{clienteId}',exact:true})).toBeVisible();
  await page.evaluate(()=>window.testUi.actions.get('format').funct());
  // Explicit author placement for the published fictional demonstration; the
  // extension never rearranges existing user shapes on import or linking.
  await page.evaluate(()=>{
    const g=window.testUi.editor.graph,cells=g.getChildVertices(g.getDefaultParent());
    const positions=[[60,80],[430,80],[60,300],[430,300]];
    g.getModel().beginUpdate();
    try{cells.forEach((cell,index)=>{const geometry=cell.geometry.clone();[geometry.x,geometry.y]=positions[index];g.getModel().setGeometry(cell,geometry);});}finally{g.getModel().endUpdate();}
  });
  await page.screenshot({path:'work/etapa-3-lienzo.png'});
  await writeFile('examples/diagrams/etapa-3-flujo-ficticio.drawio',await page.evaluate(()=>window.testUi.getFileData(true)));
});
