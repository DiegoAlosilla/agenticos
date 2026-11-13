import {contractMenu} from '../contract-menu.mjs';
import {test, expect} from '@playwright/test';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const url = '/?lang=es&ui=kennedy&mode=device&gapi=0&db=0&od=0&gh=0&gl=0&tr=0&browser=0&picker=0&stealth=1&math=0';
// Test-only bridge obtains the real editor via its documented plugin callback.
async function bridge(page) {
  await page.waitForFunction(() => typeof window.Draw?.loadPlugin === 'function');
  await page.evaluate(() => Draw.loadPlugin(ui => {window.testUi = ui;}));
  await page.waitForFunction(() => !!window.testUi?.fileNode);
}
async function audit(context, ledger) {
  context.on('request', req => ledger.requests.push({url: req.url(), method: req.method()}));
  context.on('response', response => ledger.responses.push({url:response.url(),status:response.status()}));
  await context.route('**/*', route => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.hostname === '127.0.0.1') return route.continue();
    ledger.external.push(route.request().url());
    return route.abort('internetdisconnected');
  });
}
async function state(page) {
  return page.evaluate(() => {
    const ui = window.testUi, graph = ui.editor.graph;
    return {
      registry: ui.fileNode.getAttribute('contractsRegistry'),
      pages: ui.pages.length,
      cells: graph.getChildVertices(graph.getDefaultParent()).map(c => ({id: c.id,
        ref: graph.getAttributeForCell(c, 'contractRef', ''), label: graph.convertValueToString(c),
        note: graph.getAttributeForCell(c, 'authorNote', ''), geometry: {x:c.geometry.x,y:c.geometry.y,width:c.geometry.width,height:c.geometry.height}})),
      xml: ui.getFileData(true)
    };
  });
}
async function inspectFirst(page) {
  await page.evaluate(() => {
    const ui = window.testUi, graph = ui.editor.graph;
    graph.setSelectionCell(graph.getChildVertices(graph.getDefaultParent())[0]);
  });
  await contractMenu(page,'contractsInspect');
  await expect(page.getByRole('heading', {name: 'GET /clientes/{clienteId}', exact: true})).toBeVisible();
  await expect(page.getByRole('document', {name:'Documentación del contrato'})).toContainText('Cliente ficticio encontrado');
}

test('etapa 0: editor real, guardado portable, perfiles limpios, páginas y red local', async ({browser}, info) => {
  const ledger = {requests: [], responses: [], external: [], errors: []};
  const author = await browser.newContext({viewport:{width:1440,height:1000}, acceptDownloads:true});
  await audit(author, ledger);
  const page = await author.newPage();
  page.on('pageerror', error => ledger.errors.push(error.message));
  page.on('console', msg => {if (msg.text().startsWith('Plugin Error:') || msg.text().includes('violates the following Content Security Policy')) ledger.errors.push(msg.text());});
  await page.goto('http://127.0.0.1:8080' + url);
  await expect(page.getByRole('tab',{name:'Contratos',exact:true})).toBeVisible();
  await bridge(page);
  await contractMenu(page,'contractsDemo');
  await expect.poll(async () => (await state(page)).cells.length).toBe(1);
  const inserted = await state(page);
  const registry = JSON.parse(inserted.registry);
  expect(registry.revisions).toHaveLength(1);
  const original = await readFile('examples/contracts/clientes-ficticios.json', 'utf8');
  expect(registry.revisions[0].snapshot).toBe(original);
  expect(registry.revisions[0].sha256).toBe(createHash('sha256').update(original).digest('hex'));
  await page.evaluate(() => window.testUi.actions.get('undo').funct());
  expect((await state(page)).cells).toHaveLength(0);
  expect((await state(page)).registry).toBeNull();
  await page.evaluate(() => window.testUi.actions.get('redo').funct());
  expect((await state(page)).cells[0].ref).toBe(inserted.cells[0].ref);
  await inspectFirst(page);
  await page.screenshot({path:'work/etapa-0-inspector.png'});
  await page.evaluate(()=>window.testUi.actions.get('format').funct());
  await page.evaluate(() => {
    const ui=window.testUi, graph=ui.editor.graph, cell=graph.getSelectionCell();
    graph.setAttributeForCell(cell,'authorNote','Nota ficticia: conservar geometría y propósito.');
    const clone=graph.duplicateCells([cell])[0];
    graph.moveCells([clone], 350, 120);
  });
  const duplicated = await state(page);
  expect(duplicated.cells).toHaveLength(2);
  expect(duplicated.cells[0].id).not.toBe(duplicated.cells[1].id);
  expect(duplicated.cells[0].ref).toBe(duplicated.cells[1].ref);
  expect(JSON.parse(duplicated.registry).revisions).toHaveLength(1);
  await page.evaluate(() => {
    const ui=window.testUi;
    const clone=ui.duplicatePage(ui.currentPage,'Copia ficticia');
    ui.selectPage(clone);
  });
  const duplicatedPage=await state(page);
  expect(duplicatedPage.pages).toBe(2);
  expect(duplicatedPage.cells).toHaveLength(2);
  expect(duplicatedPage.registry).toBe(duplicated.registry);
  expect(duplicatedPage.cells[0].id).not.toBe(duplicated.cells[0].id);
  await page.evaluate(() => {const ui=window.testUi; ui.selectPage(ui.insertPage());});
  expect((await state(page)).cells).toHaveLength(0);
  await contractMenu(page,'contractsDemo');
  await expect.poll(async () => (await state(page)).cells.length).toBe(1);
  expect(JSON.parse((await state(page)).registry).revisions).toHaveLength(1);
  await page.evaluate(() => {const ui=window.testUi; ui.selectPage(ui.pages[0]);});
  await page.getByText('Extras', {exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByText('Guardar prueba portable', {exact:true}).click();
  const download=await downloadPromise;
  await mkdir('examples/diagrams', {recursive:true});
  await download.saveAs('examples/diagrams/etapa-0-ficticia.drawio');
  const disk=await readFile('examples/diagrams/etapa-0-ficticia.drawio','utf8');
  expect(disk).toContain('contractsRegistry=');
  expect(disk.match(/contractsRegistry=/g)).toHaveLength(1);
  expect(disk.length).toBeLessThan(20000);
  await page.screenshot({path:'work/etapa-0-lienzo.png'});
  await author.close();

  const clean=await browser.newContext({viewport:{width:1440,height:1000}});
  await audit(clean,ledger);
  const reopened=await clean.newPage();
  await reopened.goto('http://127.0.0.1:8080'+url);
  await expect(reopened.getByRole('tab',{name:'Contratos',exact:true})).toBeVisible();
  await bridge(reopened);
  // Real browser File object, disk .drawio. No contract input and no author profile.
  await reopened.getByText('Extras',{exact:true}).click();
  const chooserPromise=reopened.waitForEvent('filechooser');
  await reopened.getByText('Abrir prueba portable',{exact:true}).click();
  const chooser=await chooserPromise;
  await chooser.setFiles('examples/diagrams/etapa-0-ficticia.drawio');
  await expect.poll(async () => (await state(reopened)).pages).toBe(3);
  const recovered=await state(reopened);
  expect(recovered.registry).toBe(duplicated.registry);
  expect(recovered.cells).toEqual(duplicated.cells);
  await inspectFirst(reopened);
  await reopened.screenshot({path:'work/etapa-0-perfil-limpio.png'});
  await clean.close();

  const vanilla=await browser.newContext();
  await audit(vanilla,ledger);
  const plain=await vanilla.newPage();
  await plain.goto('http://127.0.0.1:8080'+url+'&contracts=0');
  await bridge(plain);
  await plain.evaluate(xml => window.testUi.setFileData(xml),disk);
  expect(await plain.getByRole('tab',{name:'Contratos',exact:true}).count()).toBe(0);
  const plainState=await state(plain);
  expect(plainState.cells).toEqual(duplicated.cells);
  expect(plainState.registry).toBe(duplicated.registry);
  // Edit a normal label and save via the native File > Save As > Download flow.
  await plain.evaluate(() => {
    const ui=window.testUi, graph=ui.editor.graph;
    const cell=graph.getChildVertices(graph.getDefaultParent())[0];
    graph.cellLabelChanged(cell,'Etiqueta ficticia editada sin extensión');
  });
  await plain.getByText('Archivo',{exact:true}).click();
  await plain.getByText('Guardar como...',{exact:true}).click();
  const saveDialog=plain.locator('.geDialog');
  await saveDialog.getByRole('textbox').fill('etapa-0-sin-extension.drawio');
  await saveDialog.getByRole('combobox').filter({hasText:'Dispositivo'}).selectOption({label:'Descargar'});
  const nativeDownloadPromise=plain.waitForEvent('download');
  await saveDialog.getByRole('button',{name:'OK',exact:true}).click();
  const nativeDownload=await nativeDownloadPromise;
  await nativeDownload.saveAs('examples/diagrams/etapa-0-sin-extension.drawio');
  const vanillaSaved=await readFile('examples/diagrams/etapa-0-sin-extension.drawio','utf8');
  await vanilla.close();
  const restored=await browser.newContext();
  await audit(restored,ledger);
  const finalPage=await restored.newPage();
  await finalPage.goto('http://127.0.0.1:8080'+url);
  await expect(finalPage.getByRole('tab',{name:'Contratos',exact:true})).toBeVisible();
  await bridge(finalPage);
  await finalPage.evaluate(xml => window.testUi.setFileData(xml),vanillaSaved);
  expect((await state(finalPage)).cells[0].label).toBe('Etiqueta ficticia editada sin extensión');
  expect((await state(finalPage)).registry).toBe(duplicated.registry);
  await inspectFirst(finalPage);
  await restored.close();
  expect(ledger.external).toEqual([]);
  expect(ledger.requests.every(r=>r.method==='GET')).toBe(true);
  expect(ledger.responses.filter(r=>r.status>=400)).toEqual([]);
  expect(ledger.errors).toEqual([]);
  await writeFile('work/etapa-0-network.json',JSON.stringify(ledger,null,2));
  await info.attach('network',{body:JSON.stringify(ledger),contentType:'application/json'});
});

test('la documentación del snapshot se muestra como texto y no ejecuta HTML',async ({page})=>{
  await page.goto(url);
  await expect(page.getByRole('tab',{name:'Contratos',exact:true})).toBeVisible();
  await bridge(page);
  await contractMenu(page,'contractsDemo');
  await expect.poll(async () => (await state(page)).cells.length).toBe(1);
  const text='<img src="https://example.invalid/ficticio.png" onerror="window.testExecuted=true">';
  await page.evaluate(description=>{
    const ui=window.testUi;
    const registry=JSON.parse(ui.fileNode.getAttribute('contractsRegistry'));
    const snapshot=JSON.parse(registry.revisions[0].snapshot);
    snapshot.paths['/clientes/{clienteId}'].get.description=description;
    registry.revisions[0].snapshot=JSON.stringify(snapshot);
    ui.fileNode.setAttribute('contractsRegistry',JSON.stringify(registry));
  },text);
  await inspectFirst(page);
  const panel=page.getByRole('document',{name:'Documentación del contrato'});
  await expect(panel).toContainText(text);
  expect(await panel.locator('img').count()).toBe(0);
  expect(await page.evaluate(()=>window.testExecuted)).toBeUndefined();
});

test('formatos desconocidos y vínculos perdidos conservan figura y datos',async ({page})=>{
  await page.goto(url);
  await expect(page.getByRole('tab',{name:'Contratos',exact:true})).toBeVisible();
  await bridge(page);
  await contractMenu(page,'contractsDemo');
  await expect.poll(async () => (await state(page)).cells.length).toBe(1);
  await page.evaluate(()=>window.testUi.fileNode.setAttribute('contractsRegistry',JSON.stringify({version:99,revisions:[]})));
  const unknown=await state(page);
  await contractMenu(page,'contractsDemo');
  await expect(page.getByText(/Formato de contratos no soportado: 99/)).toBeVisible();
  expect((await state(page)).registry).toBe(unknown.registry);
  expect((await state(page)).cells).toEqual(unknown.cells);
  await page.evaluate(()=>window.testUi.hideDialog());
  await page.evaluate(()=>window.testUi.fileNode.setAttribute('contractsRegistry',JSON.stringify({version:1,revisions:[]})));
  await contractMenu(page,'contractsInspect');
  await expect(page.getByText(/Contrato no disponible: falta la revisión/)).toBeVisible();
  expect((await state(page)).cells).toEqual(unknown.cells);
});
