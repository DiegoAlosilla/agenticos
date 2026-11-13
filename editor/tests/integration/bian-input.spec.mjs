import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('BIAN: clic, selección y escritura real del propósito sin editar el lienzo',async({browser})=>{
  const runs=[];
  for(const dark of [false,true]){
    const context=await browser.newContext({viewport:{width:1220,height:884},colorScheme:dark?'dark':'light'}),external=[],errors=[];
    await context.route('**/*',route=>{if(new URL(route.request().url()).hostname==='127.0.0.1')return route.continue();external.push(route.request().url());return route.abort();});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/?lang=es&ui=kennedy&mode=device');
    await page.waitForFunction(()=>!!window.Draw?.loadPlugin);
    await page.evaluate(()=>Draw.loadPlugin(ui=>window.testUi=ui));
    await page.waitForFunction(()=>!!window.testUi?.fileNode);
    await page.evaluate(()=>{const g=testUi.editor.graph;g.setSelectionCell(g.insertVertex(g.getDefaultParent(),null,'Figura ficticia',40,40,140,60));});
    const snapshot=()=>page.evaluate(()=>({xml:testUi.getFileData(true),undo:testUi.editor.undoManager.indexOfNextAdd,selection:testUi.editor.graph.getSelectionCells().map(c=>c.id)}));
    await page.getByRole('tab',{name:'Contratos',exact:true}).click();
    await page.getByRole('tab',{name:'BIAN',exact:true}).click();
    await page.getByRole('combobox',{name:'Acción BIAN'}).selectOption('Initiate');
    await page.getByRole('button',{name:'Ayuda de acciones BIAN',exact:true}).click();
    await page.getByRole('button',{name:'← Volver a la consulta',exact:true}).click();
    const purpose=page.getByRole('textbox',{name:'Propósito del endpoint'});
    await page.getByRole('combobox',{name:'Acción BIAN'}).focus();
    await expect(purpose).not.toBeFocused();
    const before=await snapshot();
    await purpose.click();await expect(purpose).toBeFocused();
    await page.keyboard.type('iniciar prestamo personal');
    await expect(purpose).toHaveValue('iniciar prestamo personal');
    await expect(page.locator('.ct-bian-domain').first()).toHaveText('Consumer Loan');
    // A real pointer drag must place a text selection, not only programmatic focus.
    const box=await purpose.boundingBox();
    await page.mouse.move(box.x+9,box.y+12);await page.mouse.down();await page.mouse.move(box.x+85,box.y+12,{steps:8});await page.mouse.up();
    expect(await purpose.evaluate(n=>Math.abs(n.selectionEnd-n.selectionStart))).toBeGreaterThan(0);
    await page.keyboard.press('Control+A');await page.keyboard.press('Backspace');await expect(purpose).toHaveValue('');
    await page.keyboard.type('iniciar prestamo personal');
    await page.keyboard.press('Enter');await page.keyboard.type('oferta');
    await expect(purpose).toHaveValue('iniciar prestamo personal\noferta');
    await page.keyboard.press('Control+A');await page.keyboard.press('Delete');
    await page.keyboard.type('iniciar prestamo personal');
    // Native refresh detaches and restores the panel; typing must remain possible.
    await page.evaluate(()=>testUi.format.immediateRefresh());await expect(purpose).toBeFocused();
    await page.keyboard.press('End');await page.keyboard.type(' oferta');
    await expect(purpose).toHaveValue('iniciar prestamo personal oferta');
    await page.keyboard.press('Tab');await expect(page.getByRole('combobox',{name:'Acción BIAN'})).toBeFocused();
    await page.keyboard.press('Shift+Tab');await expect(purpose).toBeFocused();
    expect(await snapshot()).toEqual(before);
    expect(external).toEqual([]);expect(errors).toEqual([]);
    await page.screenshot({path:`docs/evidence/bian-input-${dark?'oscuro':'claro'}.png`});
    runs.push({theme:dark?'dark':'light',mouseFocus:true,pointerTextSelection:true,keyboardEditing:true,refreshFocus:true,documentUnchanged:true,external,errors});
    await context.close();
  }
  await writeFile('docs/evidence/bian-input-summary.json',JSON.stringify({viewport:{width:1220,height:884},runs},null,2)+'\n');
});
