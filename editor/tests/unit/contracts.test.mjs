import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {stringify} from 'yaml';
import {prepareImport,readContract,pointerTarget,resolveObject,ContractError} from '../../dist/contracts-core.mjs';
import {readRegistry} from '../../dist/registry-core.mjs';
const empty=()=>({version:1,revisions:[]});
const fixture=async name=>readFile(`examples/contracts/${name}`,'utf8');
const modern=await fixture('clientes-3.1-ficticios.json');
const legacy=await fixture('archivos-swagger-2-ficticios.json');
const yaml=await fixture('ofertas-3.0-ficticias.yaml');
const bytes=text=>new TextEncoder().encode(text);
const importText=(source,format='json',registry=empty())=>prepareImport(bytes(source),format,registry);
const rejects=(source,code,format='json',registry=empty())=>assert.rejects(importText(source,format,registry),error=>error instanceof ContractError&&error.diagnostic.code===code);
const change=callback=>{const doc=JSON.parse(modern);callback(doc);return JSON.stringify(doc);};

test('3.1: parámetros efectivos, seguridad y responses sin inventar esquemas',async()=>{
  const {contract,registry}=await importText(modern);
  assert.equal(contract.line,'3.1');assert.equal(registry.version,2);
  assert.equal(contract.operations.length,3);
  const get=contract.operations.find(op=>op.ref.method==='GET');
  assert.deepEqual(get.parameters.map(p=>p.location),['path','query','header','cookie']);
  assert.equal(get.parameters.find(p=>p.name==='detalle').required,true);
  assert.equal(get.security.origin,'global');assert.equal(get.security.schemes.demoKey.type,'apiKey');
  assert.deepEqual(get.responses.map(r=>r.code),['200','4XX','default']);
  assert.equal(get.responses[0].description,'Resultado ficticio específico de consulta');
  assert.deepEqual(Object.keys(get.responses[0].headers),['X-Revision']);
  assert.match(get.responses[0].content['application/json'].examples.demo.value.$ref,/es-un-dato/);
  const patch=contract.operations.find(op=>op.ref.method==='PATCH');
  assert.deepEqual(patch.security.requirements,[]);assert.equal(patch.security.origin,'operation');
  assert.equal(patch.request.required,true);
  assert.equal(patch.request.content['application/json'].schema.maxProperties,2);
  assert.deepEqual(contract.document.components.schemas.Persona.properties.nombre.type,['string','null']);
  assert.equal(contract.document.components.schemas.Vacio,false);
  assert.ok(contract.cycles.length>0);
  assert.deepEqual(contract.operations.find(op=>op.ref.method==='POST').security.requirements,[{}]);
});
test('3.0 YAML: conserva nullable y allOf; identidad API separada de 3.1',async()=>{
  const first=await importText(modern);
  const second=await importText(yaml,'yaml',first.registry);
  assert.equal(second.contract.line,'3.0');
  assert.equal(second.contract.document.components.schemas.Oferta.properties.nombre.nullable,true);
  assert.equal(second.contract.document.components.schemas.Oferta.properties.detalle.allOf.length,2);
  assert.equal(second.contract.operations[0].ref.path,first.contract.operations[0].ref.path);
  assert.notEqual(second.contract.revision.apiId,first.contract.revision.apiId);
  assert.equal(second.registry.revisions.length,2);
});
test('Swagger 2.0: body/formData y MIME efectivos mantienen procedencia',async()=>{
  const {contract}=await importText(legacy);
  assert.equal(contract.line,'2.0');
  const get=contract.operations.find(op=>op.ref.method==='GET');
  assert.equal(get.parameters[0].definition.type,'string');
  assert.deepEqual(get.responses[0].mediaTypes,['application/json']);
  assert.equal(get.responses[0].headers['X-Demo'].type,'string');
  const patch=contract.operations.find(op=>op.ref.method==='PATCH');
  assert.equal(patch.request.kind,'body');assert.equal(patch.request.schema.$ref,'#/definitions/Persona');
  assert.deepEqual(patch.security.requirements,[]);
  const post=contract.operations.find(op=>op.ref.method==='POST');
  assert.equal(post.request.kind,'form');assert.equal(post.request.fields[0].definition.type,'file');
  assert.equal(post.request.fields[1].definition.collectionFormat,'multi');
  assert.deepEqual(post.request.mediaTypes,['multipart/form-data']);
  assert.deepEqual(post.responses[0].mediaTypes,['text/plain']);
});
test('reimportación idéntica no cambia registro, huella de bytes y BOM',async()=>{
  const first=await importText('\uFEFF'+modern);
  const second=await importText('\uFEFF'+modern,'json',first.registry);
  assert.equal(second.duplicate,true);assert.equal(second.registry,first.registry);
  assert.equal(second.contract.revision.snapshot,'\uFEFF'+modern);
  assert.equal(second.contract.revision.sha256,createHash('sha256').update(bytes('\uFEFF'+modern)).digest('hex'));
  const pretty=await importText(JSON.stringify(JSON.parse(modern)),'json',first.registry);
  assert.equal(pretty.duplicate,false);assert.equal(pretty.registry.revisions.length,2);
});
test('round-trip formato 1 y 2; desconocido conservado, YAML requiere formato 2',async()=>{
  const result=await importText(yaml,'yaml');
  const parsed=readRegistry(JSON.stringify(result.registry));
  assert.equal(readContract(parsed.revisions[0]).operations[0].ref.path,'/clientes/{clienteId}');
  const old=await importText(modern);old.registry.version=1;
  assert.equal(readRegistry(JSON.stringify(old.registry)).version,1);
  assert.throws(()=>readRegistry(JSON.stringify({...result.registry,version:1})),/inválido/);
  assert.throws(()=>readRegistry('{"version":99,"revisions":[]}'),/no soportado/);
});
test('JSON Pointer: escapes, URI, índice y propiedades heredadas',()=>{
  assert.equal(pointerTarget({a:{'b/c~d':42}},'#/a/b~1c~0d'),42);
  assert.equal(pointerTarget({'con espacio':[false]},'#/con%20espacio/0'),false);
  for(const ref of ['#/toString','#/a/~2','#/a/01','#Anchor']) assert.throws(()=>pointerTarget({a:[0,1]},ref),ContractError);
});
test('3.1 Reference Object overrides; 3.0 siblings ignorados',()=>{
  const doc={definitions:{respuesta:{description:'base',type:'string'}}};
  const ref={$ref:'#/definitions/respuesta',description:'local',type:'number'};
  assert.equal(resolveObject(doc,ref,'3.1').description,'local');
  assert.equal(resolveObject(doc,ref,'3.1').type,'string');
  assert.equal(resolveObject(doc,ref,'3.0').description,'base');
});
test('versiones y dialectos no soportados: diagnósticos distintos',async()=>{
  await rejects(change(doc=>doc.openapi='3.2.0'),'UNSUPPORTED_VERSION');
  await rejects(change(doc=>doc.swagger='2.0'),'AMBIGUOUS_VERSION');
  await rejects(change(doc=>doc.jsonSchemaDialect='https://example.invalid/dialecto'),'UNSUPPORTED_DIALECT');
  await rejects(change(doc=>doc.components.schemas.Persona.$id='persona.json'),'UNSUPPORTED_SCHEMA_REFERENCE');
  await rejects(change(doc=>doc.components.schemas.Persona.$dynamicRef='#persona'),'UNSUPPORTED_SCHEMA_REFERENCE');
});
test('referencias externas, anchors y faltantes rechazados; ninguna descarga',async()=>{
  const previousFetch=globalThis.fetch;let calls=0;
  globalThis.fetch=()=>{calls++;throw new Error('No debe descargar');};
  try {
    await rejects(change(doc=>doc.components.schemas.Persona.properties.nombre={$ref:'https://example.invalid/schema.json'}),'EXTERNAL_REFERENCE');
    await rejects(change(doc=>doc.components.schemas.Persona.properties.nombre={$ref:'archivo.yaml#/Nombre'}),'EXTERNAL_REFERENCE');
    await rejects(change(doc=>doc.components.schemas.Persona.properties.nombre={$ref:'#Nombre'}),'UNSUPPORTED_ANCHOR');
    await rejects(change(doc=>doc.components.schemas.Persona.properties.nombre={$ref:'#/components/schemas/Ausente'}),'MISSING_REFERENCE');
    await rejects(change(doc=>doc.components.schemas.Persona.properties.nombre={$ref:'#/info/title'}),'INVALID_REFERENCE_TARGET');
    await importText(change(doc=>{doc.components.responses.Cliente.links={demo:{operationId:'crearCliente',parameters:{dato:{$ref:'https://example.invalid/dato-literal'}},requestBody:{$ref:'https://example.invalid/payload-literal'},server:{url:'https://example.invalid/ficticio'}}};}));
    assert.equal(calls,0);
  } finally {globalThis.fetch=previousFetch;}
});
test('malformados, duplicados, rangos Swagger, paths y ciclos no-schema',async()=>{
  await rejects('{','INVALID_FILE');
  await rejects('openapi: 3.0.4\nopenapi: 3.1.2','INVALID_FILE','yaml');
  await rejects(change(doc=>delete doc.info),'INVALID_OPENAPI');
  await rejects(change(doc=>doc.paths['/clientes'].post.operationId='consultarCliente'),'DUPLICATE_OPERATION_ID');
  await rejects(change(doc=>doc.paths['/clientes/{clienteId}'].get.parameters.push(doc.paths['/clientes/{clienteId}'].get.parameters[0])),'DUPLICATE_PARAMETER');
  await rejects(change(doc=>doc.paths['/clientes/{clienteId}'].parameters[0]={name:'otroId',in:'path',required:true,schema:{type:'string'}}),'PATH_PARAMETER_MISMATCH');
  await rejects(change(doc=>doc.components.parameters.clienteId={$ref:'#/components/parameters/clienteId'}),'CIRCULAR_REFERENCE');
  const swagger=JSON.parse(legacy);swagger.paths['/clientes/{clienteId}'].get.responses['2XX']={description:'Ficticia'};
  await assert.rejects(importText(JSON.stringify(swagger)),ContractError);
});
test('diagnóstico YAML acotado, sin volcar contenido y sin alterar registro',async()=>{
  const first=await importText(modern),before=JSON.stringify(first.registry);
  const broken='openapi 3.1.0\ninfo\n  title API ficticia\npaths\n  ficticio\n    get\n      examples { type string, example TEXTO_FICTICIO_RESERVADO }';
  await assert.rejects(importText(broken,'yaml',first.registry),error=>{
    assert.equal(error.diagnostic.code,'INVALID_FILE');
    assert.match(error.message,/raíz debe ser un mapa.*línea 1/);
    assert.match(error.message,/openapi: 3.1.0/);
    assert.ok(error.message.length<500);
    assert.ok(!error.message.includes('TEXTO_FICTICIO_RESERVADO'));return true;
  });
  await assert.rejects(importText('openapi: 3.1.0\ninfo:\n  title: API ficticia\n  version: [sin cierre\n','yaml'),error=>{
    assert.match(error.message,/línea \d+, columna \d+/);
    assert.ok(error.message.length<500);assert.ok(!error.message.includes('sin cierre'));return true;
  });
  assert.equal(JSON.stringify(first.registry),before);
  await assert.rejects(importText('<!DOCTYPE html><html><body>Ejemplo ficticio</body></html>','yaml'),error=>{assert.match(error.message,/Raw/);return true;});
});
test('diagnósticos estructurales agrupados sin ruido de alternativas $ref',async()=>{
  const doc={openapi:'3.0.0',info:{title:'API inválida ficticia',version:'1.0.0'},paths:{'/ficticio':{get:{parameters:[{name:'filtro',in:'query',stype:'form',schema:{type:'string'}},{name:'limite',in:'query'}],responses:{'200':{description:'Respuesta ficticia'}}}}},components:{securitySchemes:{demo:{type:'http',name:'no-admitido'}}}};
  await assert.rejects(importText(JSON.stringify(doc)),error=>{
    assert.equal(error.diagnostic.code,'INVALID_OPENAPI');assert.ok(error.issues.length>=4);
    assert.ok(error.issues.some(issue=>issue.pointer.endsWith('/stype')));
    assert.ok(error.issues.some(issue=>issue.message.includes('schema o content')));
    assert.ok(error.issues.some(issue=>issue.message.includes('scheme')));
    assert.ok(!error.issues.some(issue=>issue.message.includes('«$ref»')));return true;
  });
});
test('límites y atomicidad: errores conservan registro e identidad',async()=>{
  const first=await importText(modern);const before=JSON.stringify(first.registry);
  await rejects(change(doc=>doc.components.schemas.Persona.properties.nombre={$ref:'otro.yaml'}),'EXTERNAL_REFERENCE','json',first.registry);
  assert.equal(JSON.stringify(first.registry),before);
  await rejects(' '.repeat(5*1024*1024+1),'FILE_TOO_LARGE');
  await rejects('a: &a\n  b: *a','YAML_ALIAS_CYCLE','yaml');
  const big={version:2,revisions:[{...first.contract.revision,snapshot:' '.repeat(15*1024*1024)}]};
  await rejects(yaml,'DOCUMENT_TOO_LARGE','yaml',big);
});
test('referencias se validan en su sitio de uso; summary solo donde es aplicable',async()=>{
  await rejects(change(doc=>doc.paths['/clientes/{clienteId}'].parameters[0]={$ref:'#/info'}),'INVALID_OPENAPI');
  const valid=await importText(change(doc=>doc.paths['/clientes/{clienteId}'].parameters[0].summary='Esta anotación no corresponde a Parameter'));
  assert.equal(valid.contract.operations[0].parameters[0].definition.summary,undefined);
  await rejects(change(doc=>doc.components.schemas.Persona.properties.nombre.type='tipo-inexistente'),'INVALID_SCHEMA');
});
test('las tres versiones admiten JSON y YAML; schema oficial mantiene huella fijada',async()=>{
  for(const source of [modern,legacy,JSON.stringify({openapi:'3.0.4',info:{title:'API ficticia mínima',version:'0.0.1'},paths:{'/ficticio':{get:{responses:{'200':{description:'Resultado ficticio'}}}}}})]){
    const json=await importText(source);
    const yaml=await importText(stringify(JSON.parse(source)),'yaml');
    assert.equal(json.contract.line,yaml.contract.line);assert.equal(json.contract.operations.length,yaml.contract.operations.length);
  }
  const pin=JSON.parse(await readFile('config/openapi-validation.json','utf8'));
  assert.equal(createHash('sha256').update(await readFile(pin.openapi31.file)).digest('hex'),pin.openapi31.sha256);
});
