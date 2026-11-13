import {contractMenu} from '../contract-menu.mjs';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

async function bridge(page){await page.waitForFunction(()=>!!window.Draw?.loadPlugin);await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await page.waitForFunction(()=>!!window.testUi?.fileNode);}
async function importSample(page,sample,name='inventario-ficticio.json'){
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();
  const previous=await page.locator('.ct-api-tools [role=status]').textContent();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Importar',exact:true}).click();
  await(await chooser).setFiles(typeof sample==='string'?sample:{name,mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});
  await expect(page.locator('.ct-api-tools [role=status]')).not.toHaveText(previous);await expect(page.locator('.geDialog')).toHaveCount(0);
}
async function chooseApi(page,title){await page.getByRole('button',{name:new RegExp('Seleccionar API '+title)}).click();for(const button of await page.locator('.opblock-summary-control').all())await button.click();}
const inspect=page=>contractMenu(page,'contractsInspect');
const panelOf=page=>page.getByRole('document',{name:'Documentación del contrato'});

test('Swagger UI real: herencia, refs, esquemas 3.1, respuestas, seguridad y selección sin mutar snapshot',async({page})=>{
  const requests=[],errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).hostname!=='127.0.0.1')requests.push(request.url());});
  await page.goto('/?lang=es&ui=kennedy');await bridge(page);
  await page.evaluate(xml=>window.testUi.setFileData(xml),await readFile('examples/diagrams/seleccion-lateral-ficticia.drawio','utf8'));
  const before=await page.evaluate(()=>testUi.getFileData(true));
  await page.getByText(/^«PATCH»/).click();await inspect(page);const panel=panelOf(page);
  await expect(panel.locator('td.parameters-col_name').first()).toContainText('clienteId');
  await expect(panel.locator('.opblock')).toHaveCount(1);
  await expect(panel.locator('[data-renderer="swagger-ui"]')).toHaveCount(1);
  await expect(panel.locator('tr[data-param-name="clienteId"]')).toContainText('(path)');
  await expect(panel.locator('tr[data-param-name="detalle"] .parameter__name')).not.toContainText('*');
  await expect(panel.locator('tr[data-param-name="sesionFicticia"]')).toContainText('(cookie)');
  await expect(panel.locator('.response[data-code="200"]')).toContainText('Persona inventada');
  await expect(panel.locator('.response[data-code="200"]')).toContainText('https://example.invalid/es-un-dato-no-una-referencia');
  await expect(panel.locator('.response[data-code="200"]')).toContainText('X-Revision');
  await expect(panel.locator('.response[data-code="400"]')).toContainText('Solicitud ficticia inválida');
  await expect(panel.locator('.response[data-code="default"]')).toContainText('Otro resultado ficticio');
  await panel.getByRole('tab',{name:'Schema',exact:true}).first().click();
  await expect(panel.locator('.opblock-section-request-body')).toContainText('≤ 2 properties');
  await expect(panel.locator('.opblock-section-request-body')).toContainText('string | null');
  await expect(panel.locator('.opblock-section-request-body')).toContainText('progenitor');
  await panel.getByText('Snapshot y seguridad efectiva',{exact:true}).click();
  await expect(panel.getByText('La operación no exige seguridad en esta revisión.',{exact:true})).toBeVisible();
  await expect(panel.locator('.ct-swagger-source pre')).toHaveText((JSON.parse(await page.evaluate(()=>testUi.fileNode.getAttribute('contractsRegistry')))).revisions.find(r=>r.snapshot.includes('API de clientes de demostración')).snapshot);
  // Real SVG clicks switch operations, and referenced path parameters still resolve.
  await page.getByText(/^«GET»/).click();await inspect(page);await expect(panel.locator('.opblock-summary-method')).toHaveText('GET');
  await expect(panel.locator('tr[data-param-name="detalle"] .parameter__name')).toContainText('*');
  await panel.getByText('Snapshot y seguridad efectiva',{exact:true}).click();await expect(panel).toContainText('Seguridad heredada:');
  // Rapid changes, including the same path/method in another revision, cannot retain old responses.
  for(let i=0;i<4;i++){await page.getByText(/^«PATCH»/).click();await inspect(page);await page.getByText(/^«GET»/).click();await inspect(page);}
  await expect(panel.locator('.response[data-code="200"]')).toContainText('Resultado ficticio específico de consulta');
  await expect(panel.getByRole('button',{name:/Try it out|Execute|Authorize/})).toHaveCount(0);
  const withoutViewport=xml=>xml.replace(/<mxGraphModel\b[^>]*>/g,tag=>tag.replace(/ (?:dx|dy)="[^"]*"/g,''));
  expect(withoutViewport(await page.evaluate(()=>testUi.getFileData(true)))).toBe(withoutViewport(before));
  expect(requests).toEqual([]);expect(errors).toEqual([]);
  await page.screenshot({path:'docs/evidence/swagger-ui-endpoint.png'});
});

test('Swagger UI: ejemplos sin schema, selector nativo, ventana estrecha y aislamiento del formato',async({page})=>{
  const sample={openapi:'3.0.0',info:{title:'API de inventario ficticio',version:'1.0.0'},paths:{'/articulos':{get:{summary:'Consultar artículos de demostración',responses:{'200':{description:'Artículos disponibles',content:{'application/json':{examples:{disponibles:{summary:'Con resultados',value:{articulos:[{id:'F-001',nombre:'Artículo ficticio'}]}},vacio:{summary:'Sin resultados',value:{articulos:[]}},texto:{summary:'Texto original',value:'{"texto":"se conserva como cadena"}'}}}}},'404':{description:'Inventario no encontrado'}}}}}};
  await page.goto('/?lang=es&ui=kennedy');await bridge(page);await importSample(page,sample);
  await chooseApi(page,'API de inventario ficticio');await page.getByRole('button',{name:'Agregar al lienzo GET /articulos · API de inventario ficticio',exact:true}).click();const panel=panelOf(page),response=panel.locator('.response[data-code="200"]');
  await expect(response.locator('pre')).toContainText('Artículo ficticio');
  await response.locator('.examples-select select').selectOption('vacio');await expect(response.locator('pre')).toContainText('"articulos": []');
  await response.locator('.examples-select select').selectOption('texto');await expect(response.locator('pre')).toContainText('se conserva como cadena');
  await response.locator('.examples-select select').selectOption('disponibles');
  await page.screenshot({path:'docs/evidence/swagger-ui-respuestas.png'});
  await page.setViewportSize({width:640,height:720});
  // Kennedy collapses its native Format panel after this responsive breakpoint.
  // Wait for that event, then reopen through the editor's native action.
  await page.waitForFunction(()=>testUi.lastWindowWidth===640);
  await page.evaluate(()=>{if(testUi.formatWidth===0)testUi.actions.get('format').funct();});await expect(response).toBeVisible();
  expect(await panel.evaluate(element=>element.scrollWidth<=element.clientWidth+1)).toBe(true);
  await page.screenshot({path:'docs/evidence/swagger-ui-estrecho.png'});
  await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({colorScheme:'dark'});
  await expect(response).toContainText('Artículos disponibles');
  await page.locator('.geFormatTitleContainer').getByText('Estilo',{exact:true}).click();await expect(page.locator('.geFormatContainer')).toBeVisible();
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();await expect(response).toBeVisible();
});

test('Swagger UI: contrato 3.0 y Swagger 2.0, body/formData y cambio de archivo',async({page})=>{
  await page.goto('/?lang=es&ui=kennedy');await bridge(page);
  await importSample(page,'examples/contracts/ofertas-3.0-ficticias.yaml');await chooseApi(page,'API de ofertas de demostración');
  const panel=panelOf(page);await expect(panel.locator('.response[data-code="200"]')).toContainText('Oferta ficticia');await expect(panel.locator('td.parameters-col_name').first()).toContainText('clienteId');
  await importSample(page,'examples/contracts/archivos-swagger-2-ficticios.json');
  await chooseApi(page,'API ficticia anterior');
  await expect(panel.locator('.response[data-code="204"]')).toContainText('Actualización ficticia sin contenido');await expect(panel.locator('tr[data-param-name="persona"]')).toContainText('(body)');

  await expect(panel.locator('tr[data-param-name="archivo"]')).toContainText('(formData)');await expect(panel.locator('.response[data-code="201"] pre')).toContainText('ejemplo ficticio');
  await page.evaluate(xml=>{testUi.setFileData(xml);const g=testUi.editor.graph;g.setSelectionCell(g.getChildVertices(g.getDefaultParent())[0]);},await readFile('examples/diagrams/seleccion-lateral-ficticia.drawio','utf8'));
  await inspect(page);await expect(panel.locator('.info .title')).toContainText('API de clientes de demostración');await expect(panel.locator('.response[data-code="200"]')).toContainText('Resultado ficticio específico de consulta');await expect(panel.locator('.opblock')).toHaveCount(1);
});

test('Swagger UI: refs entre rutas, múltiples tags, HTML, OIDC y ejemplos externos no generan red',async({page})=>{
  const literal='<img src="https://example.invalid/imagen.png" onerror="window.testExecuted=true"> ![imagen](https://example.invalid/otra.png)';
  const response={description:'Plantilla ficticia referenciada',content:{'application/json':{
    schema:{type:'object',description:literal,properties:{id:{type:'string'}}},
    examples:{externo:{externalValue:'https://example.invalid/ejemplo.json'},local:{value:{id:'F-001'}}},
  }}};
  const sample={openapi:'3.1.0',info:{title:'API ficticia sin conexiones',version:'1.0.0',description:literal},
    security:[{demoOidc:[]}],components:{securitySchemes:{demoOidc:{type:'openIdConnect',openIdConnectUrl:'https://example.invalid/.well-known/openid-configuration'}}},
    paths:{'/consulta':{get:{tags:['Primero','Segundo'],description:literal,responses:{'200':{$ref:'#/paths/~1plantilla/get/responses/200'}}}},'/plantilla':{get:{responses:{'200':response}}}},
  };
  const requests=[];page.on('request',request=>{if(new URL(request.url()).hostname!=='127.0.0.1')requests.push(request.url());});
  await page.goto('/?lang=es&ui=kennedy');await importSample(page,sample);
  await chooseApi(page,'API ficticia sin conexiones');const panel=panelOf(page);
  await expect(panel.locator('.response[data-code="200"]').first()).toContainText('Plantilla ficticia referenciada');await expect(panel.locator('.opblock')).toHaveCount(3);
  await expect(panel.locator('.info .renderedMarkdown')).toHaveText(literal);expect(await panel.locator('img').count()).toBe(0);
  await expect(panel.getByRole('button',{name:/Try it out|Execute|Authorize/})).toHaveCount(0);
  await panel.locator('.examples-select select').first().selectOption('local');await expect(panel.locator('.response[data-code="200"] pre').first()).toContainText('F-001');
  expect(await page.evaluate(()=>window.testExecuted)).toBeUndefined();expect(requests).toEqual([]);
});
