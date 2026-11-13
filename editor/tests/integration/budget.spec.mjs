import {contractMenu} from '../contract-menu.mjs';
import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
test.beforeAll(() => mkdir('work', {recursive: true}));
test('presupuesto provisional: 3 contratos de 100 operaciones y búsqueda local',async({page})=>{
  await page.goto('/?lang=es&ui=kennedy');
  await page.getByRole('tab',{name:'Contratos',exact:true}).click();
  const measurements=[];
  for(const [index,version]of ['3.1.2','3.0.4','2.0'].entries()){
    const schema={type:'object',properties:Object.fromEntries(Array.from({length:20},(_,i)=>[`campo${i}`,{type:'string',description:'Campo ficticio para la prueba'}]))};
    const document={...(version==='2.0'?{swagger:version,produces:['application/json']}:{openapi:version}),info:{title:`API de rendimiento ficticia ${index+1}`,version:'0.0.1'},paths:Object.fromEntries(Array.from({length:100},(_,i)=>[`/ficticios/${i}`,{get:{operationId:`consultaFicticia${i}`,summary:`Consulta ficticia número ${i}`,description:'Operación de prueba de presupuesto provisional',responses:{'200':version==='2.0'?{description:'Resultado ficticio',schema}:{description:'Resultado ficticio',content:{'application/json':{schema}}}}}}]))};
    const source=Buffer.from(JSON.stringify(document));
    const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Importar',exact:true}).click();
    const start=Date.now();await(await chooser).setFiles({name:`presupuesto-ficticio-${index}.json`,mimeType:'application/json',buffer:source});
    await expect(page.getByRole('status')).toContainText(`API de rendimiento ficticia ${index+1}`);await expect(page.getByRole('status')).toContainText('100 operaciones');
    const elapsed=Date.now()-start;expect(elapsed).toBeLessThan(3000);measurements.push({version,bytes:source.byteLength,operations:100,importMs:elapsed});

  }
  await contractMenu(page,'contractsCatalog');expect(await page.getByRole('listitem').count()).toBe(3);
  await page.evaluate(()=>{
    const input=document.querySelector('input[aria-label="Busca tu API"]');
    input.addEventListener('input',()=>window.searchStart=performance.now(),{capture:true});
    input.addEventListener('input',()=>window.searchMs=performance.now()-window.searchStart);
  });
  await page.getByRole('searchbox',{name:'Busca tu API'}).fill('rendimiento ficticia 3');
  expect(await page.getByRole('listitem').count()).toBe(1);
  const searchMs=await page.evaluate(()=>window.searchMs);expect(searchMs).toBeLessThan(300);
  await writeFile('work/budget-results.json',JSON.stringify({fixtureOnly:true,contracts:measurements,searchMs},null,2));
});
