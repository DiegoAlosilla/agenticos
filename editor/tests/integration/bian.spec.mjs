import {test,expect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
test.beforeAll(() => mkdir('work/bian', {recursive: true}));

async function setup(browser,dark=false,vanilla=false){
  const context=await browser.newContext({viewport:{width:1440,height:1000},colorScheme:dark?'dark':'light'}),external=[],errors=[];
  await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?lang=es&ui=kennedy'+(vanilla?'&contracts=0':''));
  await page.waitForFunction(()=>!!window.Draw?.loadPlugin);await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));await page.waitForFunction(()=>!!window.testUi?.fileNode);
  return {context,page,external,errors};
}
const state=page=>page.evaluate(()=>({drafts:testUi.fileNode.getAttribute('contractsDrafts'),registry:testUi.fileNode.getAttribute('contractsRegistry'),pages:testUi.pages.map(p=>p.node.getAttribute('id')),cells:Object.values(testUi.editor.graph.model.cells).filter(c=>c.vertex||c.edge).map(c=>({id:c.id,value:c.value?.outerHTML??c.value,style:c.style,geometry:c.geometry?JSON.parse(JSON.stringify(c.geometry)):null,source:c.source?.id,target:c.target?.id}))}));

test('BIAN: propósito local, definiciones y rutas oficiales, ida y vuelta con Swagger sin modificar el documento',async({browser})=>{
  const {context,page,external,errors}=await setup(browser);
  await page.evaluate(xml=>testUi.setFileData(xml),await readFile('examples/diagrams/autoria-g1-ficticia.drawio','utf8'));
  const before=await state(page),undoBefore=await page.evaluate(()=>testUi.editor.undoManager.indexOfNextAdd);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();
  await page.locator('.ct-api-choice').first().click();await expect(page.locator('.opblock')).not.toHaveCount(0);
  await page.getByRole('tab',{name:'BIAN',exact:true}).click();
  const purpose=page.getByRole('textbox',{name:'Propósito del endpoint'});await expect(purpose).toBeFocused();
  await expect(page.getByRole('button',{name:'Importar',exact:true})).toBeHidden();await expect(page.getByRole('searchbox',{name:'Busca tu API'})).toBeHidden();
  await expect(page.locator('.ct-bian-status')).toContainText('258 dominios');
  await expect(page.locator('.ct-bian-domain')).toHaveCount(30);await page.getByRole('button',{name:'Mostrar más dominios'}).click();await expect(page.locator('.ct-bian-domain')).toHaveCount(60);
  await purpose.fill('consultar saldo de una cuenta corriente');await expect(page.locator('.ct-bian-domain').first()).toHaveText('Current Account');
  await page.locator('.ct-bian-provenance>summary').click();await expect(page.locator('.ct-bian').getByText(/Ayuda local: consultar → retrieve/)).toBeVisible();await page.locator('.ct-bian-provenance>summary').click();
  await page.getByRole('combobox',{name:'Acción BIAN'}).selectOption('Retrieve');
  await page.getByRole('button',{name:'Current Account',exact:true}).click();
  await expect(page.locator('.ct-bian-detail h3')).toBeFocused();await expect(page.locator('.ct-bian-detail')).toContainText('orchestrates a consumer checking/demand deposit account');
  await expect(page.locator('.ct-bian-operation')).toHaveCount(1);await expect(page.getByRole('combobox',{name:'Operación BIAN'}).locator('option')).toHaveCount(9);
  await expect(page.locator('.ct-bian-operation').first()).toContainText('GET /CurrentAccount/{currentaccountid}/Retrieve');
  const picker=page.getByRole('combobox',{name:'Operación BIAN'});await picker.selectOption({label:await picker.locator('option').filter({hasText:/^RetrieveInterest ·/}).textContent()});await expect(page.locator('.ct-bian-operation')).toContainText('RetrieveInterest');
  await page.getByText('Fuente, alcance y ayuda de búsqueda',{exact:true}).click();
  await expect(page.locator('.ct-bian-provenance')).toContainText('b58bf4c2c300dd018afc084e9bb24b7adaaa3500');
  await expect(page.locator('.ct-bian-provenance')).toContainText('Apache-2.0');
  await expect(page.locator('.ct-bian-detail a')).toHaveAttribute('href',/b58bf4c2c300dd018afc084e9bb24b7adaaa3500\/release14.0.0\/semantic-apis\/oas3%20\/yamls\/CurrentAccount.yaml$/);
  await page.getByText('Fuente, alcance y ayuda de búsqueda',{exact:true}).click();
  await page.screenshot({path:'docs/evidence/bian-operaciones-claro.png'});
  await page.getByRole('button',{name:'← Dominios',exact:true}).click();await expect(page.getByRole('button',{name:'Current Account',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Limpiar',exact:true}).click();await purpose.fill('Information Provider Operation');
  await expect(page.locator('.ct-bian-domain').first()).toHaveText('Information Provider Operation');await page.locator('.ct-bian-domain').first().click();await expect(page.locator('.ct-bian-detail')).toContainText('La fuente no incluye una definición');
  await purpose.fill('Customer Surveys');await expect(page.locator('.ct-bian-domain').first()).toHaveText('Customer Surveys');await page.locator('.ct-bian-domain').first().click();await expect(page.locator('.ct-bian-detail')).toContainText('no publica operaciones en paths');
  await purpose.fill('zzzzinexistente');await expect(page.locator('.ct-bian-empty')).toContainText('Sin coincidencias');
  await purpose.fill('<img src="https://example.invalid/proposito-ficticio" onerror="window.injected=true">');await expect(page.locator('.ct-bian-results')).not.toContainText('Current Account');
  expect(await page.evaluate(()=>window.injected)).toBeUndefined();await expect(page.locator('.ct-bian img')).toHaveCount(0);
  await purpose.fill('consultar saldo de cuenta corriente');await expect(page.locator('.ct-bian-domain').first()).toHaveText('Current Account');
  await page.getByRole('button',{name:'Cerrar consulta BIAN'}).click();await expect(page.locator('.opblock')).not.toHaveCount(0);
  await page.getByRole('tab',{name:'BIAN',exact:true}).click();await expect(purpose).toHaveValue('consultar saldo de cuenta corriente');
  expect(await page.evaluate(()=>testUi.editor.undoManager.indexOfNextAdd)).toBe(undoBefore);
  // Native page navigation keeps a read-only consultation; explicit endpoint selection opens its contract.
  await page.evaluate(()=>testUi.selectPage(testUi.pages[1]));await expect(purpose).toHaveValue('consultar saldo de cuenta corriente');await page.evaluate(()=>testUi.selectPage(testUi.pages[0]));
  expect(await state(page)).toEqual(before);
  await page.getByRole('button',{name:'Cerrar consulta BIAN'}).click();await page.locator('.ct-add-operation').first().click();const inserted=await state(page);
  await page.getByRole('tab',{name:'BIAN',exact:true}).click();
  await page.evaluate(()=>{const g=testUi.editor.graph;g.clearSelection();g.setSelectionCell(Object.values(g.model.cells).find(c=>c.value?.getAttribute?.('contractVisualRole')==='operation'&&c.parent?.value?.getAttribute?.('contractRef')));});
  await expect(page.locator('.ct-bian')).toBeVisible();await page.getByRole('tab',{name:'Contratos',exact:true}).click();await expect(page.locator('.opblock.is-open')).toBeVisible();
  expect(await state(page)).toEqual(inserted);await page.evaluate(()=>testUi.actions.get('undo').funct());expect(await state(page)).toEqual(before);await page.evaluate(()=>testUi.actions.get('redo').funct());expect(await state(page)).toEqual(inserted);await page.evaluate(()=>testUi.actions.get('undo').funct());
  expect(await state(page)).toEqual(before);
  // Reimporting the exact original from Contratos is a no-op.
  await page.getByRole('tab',{name:'BIAN',exact:true}).click();
  const snapshot=await page.evaluate(()=>JSON.parse(testUi.fileNode.getAttribute('contractsRegistry')).revisions[0].snapshot);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Importar',exact:true}).click();await(await chooser).setFiles({name:'contrato-ficticio.json',mimeType:'application/json',buffer:Buffer.from(snapshot)});
  await expect(page.locator('.ct-api-tools [role=status]')).toContainText('archivo ya importado');expect(await state(page)).toEqual(before);
  const saved=await page.evaluate(()=>testUi.getFileData(true));await writeFile('work/bian/consulta-ficticia.drawio',saved);expect(saved).not.toContain('consultar saldo de cuenta corriente');expect(saved).not.toContain('b58bf4c2c300dd018afc084e9bb24b7adaaa3500');
  await page.getByRole('tab',{name:'BIAN',exact:true}).click();await purpose.fill('consulta ficticia temporal');await page.evaluate(()=>testUi.setFileData(testUi.emptyDiagramXml));await page.getByRole('tab',{name:'BIAN',exact:true}).click();await expect(purpose).toHaveValue('');
  const clean=await setup(browser);await clean.page.evaluate(xml=>testUi.setFileData(xml),await readFile('work/bian/consulta-ficticia.drawio','utf8'));expect(await state(clean.page)).toEqual(before);await clean.page.getByRole('tab',{name:'Contratos',exact:true}).click();await clean.page.getByRole('tab',{name:'BIAN',exact:true}).click();await expect(clean.page.getByRole('textbox',{name:'Propósito del endpoint'})).toHaveValue('');
  const native=await setup(browser,false,true);await native.page.evaluate(xml=>testUi.setFileData(xml),saved);expect(await state(native.page)).toEqual(before);const nativeSaved=await native.page.evaluate(()=>testUi.getFileData(true));await clean.page.evaluate(xml=>testUi.setFileData(xml),nativeSaved);expect(await state(clean.page)).toEqual(before);
  for(const run of [{context,external,errors},clean,native]){expect(run.external).toEqual([]);expect(run.errors).toEqual([]);await run.context.close();}
  await writeFile('docs/evidence/bian-functional-summary.json',JSON.stringify({date:'2026-10-18',sourceCommit:'b58bf4c2c300dd018afc084e9bb24b7adaaa3500',domains:258,operations:4580,purpose:'consultar saldo de una cuenta corriente',firstDomain:'Current Account',external,errors,preserved:['snapshots','drafts','page ids','cell values/styles/geometry/connections','undo index during consultation before native page navigation'],cleanReopen:true,nativeReserialization:true},null,2)+'\n');
});

test('BIAN: controles nativos oscuros, teclado y ancho mínimo del panel',async({browser})=>{
  const {context,page,external,errors}=await setup(browser,true);
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();const toggle=page.getByRole('tab',{name:'BIAN',exact:true});await toggle.focus();await page.keyboard.press('Enter');
  const purpose=page.getByRole('textbox',{name:'Propósito del endpoint'});await expect(purpose).toBeFocused();await purpose.fill('crear un préstamo');await expect(page.locator('.ct-bian-domain').first()).toHaveText('Loan');
  await page.keyboard.press('Tab');await expect(page.getByRole('combobox',{name:'Acción BIAN'})).toBeFocused();await page.keyboard.press('i');await page.keyboard.press('Enter');
  await page.getByRole('button',{name:'Loan',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.locator('.ct-bian-detail h3')).toHaveText('Loan');
  const colors=await page.evaluate(()=>({dark:document.body.classList.contains('geDarkMode'),selected:document.querySelector('#ct-tab-bian').classList.contains('geActiveFormatTitle')}));expect(colors).toEqual({dark:true,selected:true});
  await page.screenshot({path:'docs/evidence/bian-operaciones-oscuro.png'});
  await page.getByRole('separator',{name:'Ancho del panel de contratos'}).focus();await page.keyboard.press('Home');
  const bounds=await page.locator('.ct-bian').evaluate(node=>({scroll:node.scrollWidth,width:node.clientWidth,detail:node.querySelector('.ct-bian-scroll').clientHeight}));expect(bounds.scroll).toBeLessThanOrEqual(bounds.width+1);expect(bounds.detail).toBeGreaterThan(80);
  await page.getByRole('button',{name:'Cerrar consulta BIAN'}).click();await expect(page.getByRole('tab',{name:'Contratos',exact:true})).toBeFocused();
  await page.getByRole('searchbox',{name:'Busca tu API'}).fill('API ficticia');await expect(page.locator('.ct-bian')).toBeHidden();await expect(page.getByRole('searchbox',{name:'Busca tu API'})).toHaveValue('API ficticia');
  expect(external).toEqual([]);expect(errors).toEqual([]);await context.close();await writeFile('docs/evidence/bian-dark-summary.json',JSON.stringify({date:'2026-10-18',colors,bounds,external,errors,keyboard:true},null,2)+'\n');
});
