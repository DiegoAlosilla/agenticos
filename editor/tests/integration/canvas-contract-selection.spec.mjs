import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('fila única de seis endpoints y selección del lienzo: API completa y endpoint expandido',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1505,height:884}}),external=[],errors=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  async function bridge(target){await target.waitForFunction(()=>!!window.Draw?.loadPlugin);await target.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await target.waitForFunction(()=>!!window.testUi?.fileNode);}
  await page.goto('http://127.0.0.1:8080/?lang=es&ui=kennedy');await bridge(page);
  await page.evaluate(xml=>testUi.setFileData(xml),await readFile('examples/diagrams/etapa-2-contratos-ficticios.drawio','utf8'));
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();
  const fixture={openapi:'3.1.2',info:{title:'API de seis rutas ficticias',version:'1.0.0'},paths:Object.fromEntries(Array.from({length:6},(_,i)=>[`/rutas-ficticias/${i+1}`,{get:{summary:`Consulta ficticia ${i+1}`,responses:{'200':{description:`Resultado ficticio ${i+1}`}}}}]))};
  const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Importar',exact:true}).click();await(await chooser).setFiles({name:'seis-rutas-ficticias.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await page.getByRole('button',{name:/Seleccionar API API de seis rutas ficticias/}).click();
  await page.getByRole('button',{name:'Agregar todos los endpoints · API de seis rutas ficticias',exact:true}).click();
  const inserted=await page.evaluate(()=>{const g=testUi.editor.graph,c=g.getSelectionCell();return {parent:c.id,geometry:{x:c.geometry.x,y:c.geometry.y,width:c.geometry.width,height:c.geometry.height},children:c.children.filter(c=>c.value?.getAttribute('contractRef')).map(c=>({id:c.id,x:c.geometry.x,y:c.geometry.y,width:c.geometry.width,ref:c.value.getAttribute('contractRef')})),registry:testUi.fileNode.getAttribute('contractsRegistry')};});
  expect(inserted.children).toHaveLength(6);expect(new Set(inserted.children.map(c=>c.y)).size).toBe(1);
  expect(inserted.children.every((c,i)=>i===0||c.x>=inserted.children[i-1].x+inserted.children[i-1].width)).toBe(true);
  expect(inserted.geometry.width).toBeGreaterThan(inserted.children.at(-1).x+inserted.children.at(-1).width);
  // Zoom and place only this test's new group so real SVG clicks fit the viewport.
  await page.evaluate(()=>{const g=testUi.editor.graph,c=g.getSelectionCell(),geo=c.geometry.clone();geo.x=20;geo.y=20;g.model.setGeometry(c,geo);g.zoomTo(.4);g.clearSelection();});
  await page.getByRole('button',{name:/Seleccionar API API de ofertas de demostración/}).click();await expect(page.locator('.opblock')).toHaveCount(1);
  const sourceBefore=await page.evaluate(()=>testUi.getFileData(true));
  await page.locator('.geDiagramContainer').getByText(/^«API»/).click();
  await expect(page.locator('.info .title')).toContainText('API de seis rutas ficticias');await expect(page.locator('.opblock')).toHaveCount(6);await expect(page.locator('.opblock.is-open')).toHaveCount(0);
  // Select an endpoint while a native tab is active: Contratos opens automatically.
  await page.locator('.geFormatTitleContainer').getByText('Estilo',{exact:true}).click();
  await page.locator('.geDiagramContainer').getByText(/^«GET»\s*\/rutas-ficticias\/6$/).click();
  await expect(page.getByRole('tab',{name:'Contratos',exact:true})).toHaveAttribute('aria-selected','true');await expect(page.locator('.opblock')).toHaveCount(6);
  await expect(page.locator('.opblock.is-open')).toHaveCount(1);await expect(page.locator('.opblock.is-open')).toContainText('/rutas-ficticias/6');await expect(page.locator('.opblock.is-open')).toContainText('Resultado ficticio 6');
  await expect(page.locator('.opblock.is-open .opblock-summary-control')).toBeInViewport();
  // Close and click the already selected endpoint; it must reopen the contract.
  await page.getByRole('button',{name:'Cerrar contrato',exact:true}).click();await page.locator('.geDiagramContainer').getByText(/^«GET»\s*\/rutas-ficticias\/6$/).click();
  await expect(page.locator('.opblock')).toHaveCount(6);await expect(page.locator('.opblock.is-open')).toHaveCount(1);
  await page.locator('.geDiagramContainer').getByText(/^«GET»\s*\/rutas-ficticias\/2$/).click();await expect(page.locator('.opblock.is-open')).toHaveCount(1);await expect(page.locator('.opblock.is-open')).toContainText('Resultado ficticio 2');
  await page.locator('.geDiagramContainer').getByText(/^«API»/).click();await expect(page.locator('.opblock.is-open')).toHaveCount(0);
  const withoutViewport=xml=>xml.replace(/<mxGraphModel\b[^>]*>/g,tag=>tag.replace(/ (?:dx|dy)="[^"]*"/g,''));
  expect(withoutViewport(await page.evaluate(()=>testUi.getFileData(true)))).toBe(withoutViewport(sourceBefore));
  await page.screenshot({path:'docs/evidence/seleccion-api-fila-1.11.png'});
  await page.locator('.geDiagramContainer').getByText(/^«GET»\s*\/rutas-ficticias\/3$/).click();await expect(page.locator('.opblock.is-open')).toContainText('Resultado ficticio 3');await page.screenshot({path:'docs/evidence/seleccion-endpoint-1.11.png'});
  // Existing saved API groups use descendant refs, including after clean reopen.
  const saved=await page.evaluate(()=>testUi.getFileData(true));const clean=await browser.newContext(),reopened=await clean.newPage();await reopened.goto('http://127.0.0.1:8080/?lang=es&ui=kennedy');await bridge(reopened);await reopened.evaluate(xml=>testUi.setFileData(xml),saved);
  await reopened.evaluate(id=>{const g=testUi.editor.graph;g.setSelectionCell(g.model.getCell(id));},inserted.parent);await expect(reopened.locator('.opblock')).toHaveCount(6);await expect(reopened.locator('.opblock.is-open')).toHaveCount(0);
  await reopened.evaluate(id=>{const g=testUi.editor.graph;g.setSelectionCell(g.model.getCell(id));},inserted.children[5].id);await expect(reopened.locator('.opblock')).toHaveCount(6);await expect(reopened.locator('.opblock.is-open')).toContainText('Resultado ficticio 6');
  expect(await reopened.evaluate(()=>testUi.fileNode.getAttribute('contractsRegistry'))).toBe(inserted.registry);
  await clean.close();await context.close();expect(external).toEqual([]);expect(errors).toEqual([]);
});
