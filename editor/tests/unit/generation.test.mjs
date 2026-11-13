import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readDrafts,writeDrafts,findDraft,assertDraftDocumentBudget} from '../../dist/drafts-core.mjs';
import {generateContract} from '../../dist/generation-core.mjs';
import {prepareImport} from '../../dist/contracts-core.mjs';
const source=await readFile('examples/designs/catalogo-ficticio.json','utf8');
const fixture=()=>readDrafts(source);
test('autoría genera YAML reimportable con required, tipos, ejemplos, parámetros, 204 y seguridad explícitos',async()=>{
  const api=fixture().apis[0],before=JSON.stringify(api),result=generateContract(api);
  assert.deepEqual(result.issues,[]);assert.equal(JSON.stringify(api),before);
  const imported=await prepareImport(new TextEncoder().encode(result.yaml),'yaml',{version:2,revisions:[]});
  const op=imported.contract.operations[0],doc=imported.contract.document;
  assert.equal(imported.contract.sourceVersion,'3.0.1');assert.equal(op.ref.path,'/articulos/{id}');assert.equal(op.ref.method,'GET');
  assert.deepEqual(op.parameters.map(p=>[p.name,p.location,p.required]),[['id','path',true],['detalle','query',false]]);
  assert.equal(op.parameters[1].definition.schema.example,true);
  const schema=Object.values(doc.components.schemas)[0];assert.deepEqual(schema.required,['nombre','disponible']);assert.equal(schema.properties.precio.example,10.5);assert.equal(schema.properties.disponible.example,true);
  assert.deepEqual(doc.paths['/articulos/{id}'].get.responses['204'],{description:'Consulta ficticia sin contenido.'});
  assert.deepEqual(doc.security,[{bearerAuth:[]}]);assert.equal(doc.components.securitySchemes.bearerAuth.scheme,'bearer');
  assert.equal(doc['x-drawio-authoring-profile'],'basic-openapi-3.0.1/v1');assert.equal(imported.registry.revisions.length,1);
});
test('borrador incompleto se guarda; generación rechaza faltantes, conflictos, ejemplos falsos y cuerpo 204 sin mutar el diseño',()=>{
  const store=fixture(),api=store.apis[0],op=api.operations[0];api.title='';op.parameters=[];op.responses[0].fields[1].example='no-numérico';op.responses[1].body='object';op.responses[1].fields=[{name:'dato',type:'integer',description:'Dato ficticio.',required:false,example:'1.5'}];
  const copy=structuredClone(op);copy.id='otra-operacion';api.operations.push(copy);
  const raw=writeDrafts(store);assert.equal(readDrafts(raw).apis[0].title,'');
  const result=generateContract(api);assert.equal(result.contract,undefined);assert.equal(writeDrafts(store),raw);
  assert.ok(result.issues.some(i=>i.field==='title'));assert.ok(result.issues.some(i=>/parámetro de ruta/.test(i.message)));assert.ok(result.issues.some(i=>/numérico/.test(i.message)));assert.ok(result.issues.some(i=>/204/.test(i.message)));assert.ok(result.issues.some(i=>/otra operación GET/.test(i.message)));assert.ok(result.issues.some(i=>/único/.test(i.message)));
});
test('almacén de borradores limita complejidad y rechaza versiones, ids y referencias desconocidos conservando la entrada',()=>{
  const raw='{"version":99,"apis":[],"dato":"ficticio"}';assert.throws(()=>readDrafts(raw),/no soportada/);assert.equal(raw,'{"version":99,"apis":[],"dato":"ficticio"}');
  const store=fixture();store.apis.push(structuredClone(store.apis[0]));assert.throws(()=>writeDrafts(store),/inválido/);
  assert.throws(()=>readDrafts(' '.repeat(1024*1024+1)),/1 MiB/);
  const large=fixture();large.apis[0].operations[0].responses[0].fields=Array.from({length:101},()=>({name:'ficticio',type:'string',description:'',required:false,example:''}));assert.throws(()=>writeDrafts(large),/inválido/);
  assert.throws(()=>findDraft(fixture(),{apiId:'ausente'}),/no disponible/);assert.throws(()=>findDraft(fixture(),{apiId:fixture().apis[0].id,operationId:'ausente'}),/no disponible/);
});
test('seguridad none y ejemplos literales no crean auth, código ejecutable ni propiedades por inferencia',()=>{
  const api=fixture().apis[0];api.security='none';api.operations[0].responses[0].fields[0].example='<img src="https://example.invalid/demo" onerror="alert(1)">';
  const result=generateContract(api);assert.deepEqual(result.issues,[]);assert.equal(result.document.security,undefined);assert.equal(result.document.components.securitySchemes,undefined);
  assert.match(Object.values(result.document.components.schemas)[0].properties.nombre.example,/<img/);
  api.operations[0].parameters[0].name='__proto__';api.operations[0].path='/articulos/{__proto__}';assert.deepEqual(generateContract(api).issues,[]);assert.equal({}.ficticio,undefined);
});
test('borradores y snapshots comparten presupuesto de 15 MiB sin cambiar ninguno al rechazar',()=>{
  const raw=writeDrafts(fixture()),snapshot=' '.repeat(15*1024*1024-100),registry={version:2,revisions:[{apiId:'ficticio',revisionId:'ficticio',sha256:'ficticio',format:'json',snapshot}]};
  assert.throws(()=>assertDraftDocumentBudget(raw,registry),/juntos superarían 15 MiB/);assert.equal(registry.revisions[0].snapshot,snapshot);assert.equal(writeDrafts(fixture()),raw);
  assert.doesNotThrow(()=>assertDraftDocumentBudget(raw,{version:2,revisions:[]}));assert.doesNotThrow(()=>assertDraftDocumentBudget(null,registry));
});
