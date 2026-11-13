import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createBianSearch,QUERY_LIMIT,TERM_LIMIT} from '../../dist/bian-core.mjs';
import {makeBianReference,readBianReference,MAX_BIAN_REF_BYTES} from '../../dist/bian-reference.mjs';

const bytes=await readFile('data/bian/catalog.json'),catalog=JSON.parse(bytes),manifest=JSON.parse(await readFile('data/bian/manifest.json','utf8'));
const engine=createBianSearch(catalog);
test('BIAN: catálogo fijado íntegro, trazable y separado de las otras variantes',async()=>{
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.catalogSha256);
  assert.equal(catalog.domains.length,258);assert.equal(catalog.domains.reduce((n,d)=>n+d.operations.length,0),4580);
  assert.equal(catalog.commit,manifest.commit);assert.equal(manifest.sources.length,258);
  assert.equal(createHash('sha256').update(await readFile('licenses/bian-Apache-2.0.txt')).digest('hex'),manifest.license.sha256);
  for(const d of catalog.domains){assert.equal(d.version,'14.0.0');assert.ok(d.source.startsWith(manifest.sourceDirectory));assert.ok(manifest.sources.some(s=>s.path===d.source));}
  assert.deepEqual(catalog.domains.filter(d=>!d.description).map(d=>d.id),['InformationProviderOperation']);
});
test('BIAN: propósito en español orienta a cuenta corriente y préstamo con nombres oficiales',()=>{
  const results=engine.search('consultar saldo de una cuenta corriente');
  assert.equal(results.matches[0].domain.title,'Current Account');
  assert.equal(results.matches[0].operations[0].operation.action,'Retrieve');
  assert.ok(results.expansions.some(item=>item.term==='consultar'&&item.alternatives.includes('retrieve')));
  assert.ok(engine.search('crear un préstamo').matches.slice(0,5).some(x=>x.domain.id==='Loan'));
  assert.equal(engine.search('crear un préstamo').matches[0].operations[0].operation.operationId,'Initiate');
  const official=catalog.domains.find(d=>d.id==='CurrentAccount');
  assert.equal(results.matches[0].domain.description,official.description);
  assert.deepEqual(results.matches[0].operations.find(x=>x.operation.operationId==='Retrieve').operation,official.operations.find(x=>x.operationId==='Retrieve'));
});
test('BIAN: filtro de acción, inglés, vacío y ausencia de coincidencias no inventan operaciones',()=>{
  assert.equal(engine.search('CurrentAccount').matches[0].domain.id,'CurrentAccount');
  const r=engine.search('cuenta corriente','Initiate');assert.ok(r.matches.length>0);
  assert.ok(r.matches.every(d=>d.operations.length&&d.operations.every(x=>x.operation.action==='Initiate')));
  assert.equal(engine.search('zzzzinexistente').matches.length,0);
  assert.equal(engine.search('', 'Inventada').matches.length,0);
  assert.equal(engine.search('').matches.length,258);
  assert.equal(engine.search('Customer Surveys').matches[0].domain.id,'CustomerSurveys');
  assert.equal(engine.search('Customer Surveys').matches[0].operations.length,0);
});
test('BIAN: presupuestos de consulta y pureza, sin mutar fuente ni nombres',()=>{
  const original=JSON.stringify(catalog);const text='cuenta corriente '+Array.from({length:100},(_,i)=>`token${i}`).join(' ');
  const r=engine.search(text);assert.ok(r.truncated);assert.equal(r.terms.length,TERM_LIMIT);
  assert.ok(engine.search('x'.repeat(QUERY_LIMIT+1)).truncated);
  assert.equal(JSON.stringify(catalog),original);
});
test('BIAN: español de apoyo cubre los dominios y preserva huecos y huellas oficiales',async()=>{
  const es=JSON.parse(await readFile('data/bian/es-support.json','utf8'));
  assert.equal(es.catalogCommit,catalog.commit);assert.equal(Object.keys(es.domains).length,258);
  for(const domain of catalog.domains){assert.equal(es.domains[domain.id].length,2);assert.ok(es.domains[domain.id][0]);assert.equal(Boolean(es.domains[domain.id][1]),Boolean(domain.description));}
  const r=engine.search('iniciar préstamo personal oferta');assert.ok(r.matches.slice(0,3).some(m=>m.domain.id==='ConsumerLoan'));
  assert.ok(r.matches.find(m=>m.domain.id==='ConsumerLoan').matchedTerms.includes('personal'));
  assert.equal(createHash('sha256').update(await readFile('data/bian/catalog.json')).digest('hex'),manifest.catalogSha256);
});
test('BIAN: snapshot de figura portable, limitado y validado sin mutar el original',()=>{
  const domain=catalog.domains.find(d=>d.id==='ConsumerLoan'),operation=domain.operations.find(o=>o.operationId==='Initiate');
  const ref=makeBianReference(catalog,domain,operation,manifest.sources.find(s=>s.path===domain.source).sha256),raw=JSON.stringify(ref);
  assert.deepEqual(readBianReference(raw),ref);assert.deepEqual(ref.operation,operation);assert.notEqual(ref.operation,operation);
  for(const changed of [{...ref,version:99},{...ref,commit:'-'.repeat(40)},{...ref,source:'../../privado.yaml'},{...ref,operation:{...ref.operation,method:'SCRIPT'}},{...ref,operation:{...ref.operation,action:'Inventada'}},{...ref,domain:{...ref.domain,description:'x'.repeat(MAX_BIAN_REF_BYTES)}}])assert.throws(()=>readBianReference(JSON.stringify(changed)),/BIAN/);
  assert.equal(JSON.stringify(ref),raw);assert.throws(()=>readBianReference('{'),/BIAN/);
});
