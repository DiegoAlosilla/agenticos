import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer,request as httpRequest} from 'node:http';
import {once} from 'node:events';
import {createBianAssistant,OLLAMA,limitedJson} from '../../scripts/bian-ai.mjs';
import {parseExplanation,validatePurpose,resolveSuggestions,unitVector} from '../../dist/bian-assistant.mjs';
const catalog=JSON.parse(await readFile('data/bian/catalog.json','utf8')),manifest=JSON.parse(await readFile('data/bian/manifest.json','utf8')),config=JSON.parse(await readFile('config/bian-ai.json','utf8'));
// Use Node's loopback HTTP transport so the existing offline guard can keep
// fetch completely disabled for contract imports during the clean-clone check.
function localFetch(url,options={}){return new Promise((resolve,reject)=>{
  const req=httpRequest(url,{method:options.method??'GET',headers:options.headers,signal:options.signal},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve(new Response(Buffer.concat(chunks),{status:res.statusCode})));res.on('error',reject);});
  req.on('error',reject);req.end(options.body);
});}
function double({invent=false,remote=false,digest=false,stall=false,wrongVersion=false,unavailable=false}={}){
  const calls=[];
  return {calls,fetchImpl:async(url,options)=>{
    assert.ok(url.startsWith(OLLAMA+'/api/'));assert.equal(options.redirect,'error');
    const body=options.body?JSON.parse(options.body):undefined;calls.push({url,body});let result;
    if(unavailable)throw Error('Connection refused (double)');
    if(stall)return await new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted')),{once:true}));
    if(url.endsWith('/version'))result={version:wrongVersion?'0.0.0':config.engine.version};
    else if(url.endsWith('/tags'))result={models:[config.chat,config.embedding].map(m=>({name:m.name,digest:digest?'wrong':m.digest}))};
    else if(url.endsWith('/show'))result={capabilities:['embedding','completion'],...(remote?{remote_host:'https://example.invalid'}:{})};
    else if(url.endsWith('/embed'))result={embeddings:body.input.map(()=>[1,0])};
    else if(url.endsWith('/chat')){
      const data=JSON.parse(body.messages[1].content);assert.ok(data.candidates.every(c=>!data.action||c.path.endsWith('/'+data.action)));
      const candidate=data.candidates.find(c=>c.domain==='Consumer Loan')??data.candidates[0];
      result={done:true,message:{content:JSON.stringify({suggestions:[{id:invent?'FAKE':candidate.id,reason:'Razón ficticia <img src=x onerror=alert(1)>'}],limitations:'Doble de transporte; no inferencia real.'})}};
    }else throw Error('Unexpected endpoint');
    return Response.json(result);
  }};
}
async function server(run,options={}){
  const handler=await createBianAssistant(process.cwd(),options),http=createServer(async(req,res)=>{await handler(req,res,new URL(req.url,'http://127.0.0.1'));});http.listen(0,'127.0.0.1');await once(http,'listening');
  const url=`http://127.0.0.1:${http.address().port}/api/bian-ai/suggest`;
  try{await run((payload,headers={},signal)=>localFetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:typeof payload==='string'?payload:JSON.stringify(payload),signal}),url);}
  finally{http.closeAllConnections();await new Promise(resolve=>http.close(resolve));}
}
const purpose={purpose:'consultar cuotas pendientes de préstamo personal ficticio',action:'Retrieve'};

test('IA BIAN: entrada cerrada, límites, IDs inventados y duplicados no producen referencias',()=>{
  for(const invalid of [{...purpose,url:'https://example.invalid'},{...purpose,contract:{}},{...purpose,purpose:'a'.repeat(601)},{...purpose,action:'Invent'},{...purpose,purpose:' '}])assert.throws(()=>validatePurpose(invalid,['Retrieve']));
  const d=catalog.domains.find(d=>d.id==='ConsumerLoan'),candidates=[{id:'C1',domain:d,operation:d.operations[0]}];
  assert.throws(()=>parseExplanation({suggestions:[{id:'C999',reason:'x'}],limitations:'x'},candidates),/ajena/);
  assert.throws(()=>parseExplanation({suggestions:[{id:'C1',reason:'x'},{id:'C1',reason:'x'}],limitations:'x'},candidates),/duplicados/);
  assert.throws(()=>parseExplanation({suggestions:[{id:'C1',reason:'x',path:'/fake'}],limitations:'x'},candidates));
  assert.deepEqual(parseExplanation({suggestions:[],limitations:'Sin evidencia'},candidates),{suggestions:[],limitations:'Sin evidencia'});
  for(const vector of [[0,0],[NaN,1],[Infinity],[],[1,'2']])assert.throws(()=>unitVector(vector));
});
test('IA BIAN: transporte doble recupera operaciones reales y respeta acción; consulta solo en memoria',async()=>{
  const fake=double();await server(async request=>{
    const response=await request(purpose);assert.equal(response.status,200);const result=await response.json();
    assert.equal(result.models.chat.digest,config.chat.digest);assert.equal(result.catalogSha256,manifest.catalogSha256);
    resolveSuggestions(result,catalog,purpose.action,manifest.catalogSha256);
    assert.ok(result.suggestions.some(s=>s.domainId==='ConsumerLoan'));
    const before=fake.calls.filter(c=>c.url.endsWith('/embed')).length;assert.equal((await request(purpose)).status,200);
    assert.equal(fake.calls.filter(c=>c.url.endsWith('/embed')).length-before,1,'Solo se vuelve a vectorizar el propósito');
    assert.ok(fake.calls.every(c=>!JSON.stringify(c.body??null).includes('contractsRegistry')));
    const bad=structuredClone(result);bad.suggestions[0].path='/Invented';assert.throws(()=>resolveSuggestions(bad,catalog,purpose.action,manifest.catalogSha256));
    assert.throws(()=>resolveSuggestions(result,catalog,'Initiate',manifest.catalogSha256));
  },fake);
});
test('IA BIAN: servidor rechaza solicitudes ajenas, JSON roto, cuerpos excesivos y rutas de proxy',async()=>{
  const fake=double();await server(async(request,url)=>{
    assert.equal((await request(purpose,{Origin:'https://example.invalid'})).status,403);
    assert.equal((await request(purpose,{'Sec-Fetch-Site':'cross-site'})).status,403);
    const hostStatus=await new Promise((resolve,reject)=>{const req=httpRequest(url,{method:'POST',headers:{Host:'example.invalid','Content-Type':'application/json'}},res=>{res.resume();resolve(res.statusCode);});req.on('error',reject);req.end(JSON.stringify(purpose));});assert.equal(hostStatus,403);
    assert.equal((await request('{')).status,400);
    assert.equal((await request({...purpose,model:'remote'})).status,400);
    assert.equal((await request('x'.repeat(4097))).status,413);
    assert.equal((await request(purpose,{'Content-Type':'text/plain'})).status,415);
    assert.equal((await localFetch(url)).status,405);
    assert.equal((await localFetch(url+'?url=https://example.invalid')).status,404);
    assert.equal(fake.calls.length,0);
  },fake);
});
test('IA BIAN: modelo cambiado/remoto e invención del modelo se rechazan sin resultados parciales',async()=>{
  for(const options of [{digest:true},{remote:true},{invent:true},{wrongVersion:true},{unavailable:true}]){
    const fake=double(options);await server(async request=>{const response=await request(purpose);assert.equal(response.status,503);assert.equal((await response.json()).suggestions,undefined);},fake);
    if(!options.invent)assert.equal(fake.calls.some(c=>c.url.endsWith('/embed')),false);
  }
});
test('IA BIAN: timeout libera el servidor y rechaza concurrencia; cancelar propaga abort al motor',async()=>{
  const fake=double({stall:true});await server(async request=>{
    const first=request(purpose);await new Promise(r=>setTimeout(r,20));assert.equal((await request(purpose)).status,429);assert.equal((await first).status,504);
    const controller=new AbortController(),cancelled=request(purpose,{},controller.signal);await new Promise(r=>setTimeout(r,20));controller.abort();await assert.rejects(cancelled);
    await new Promise(r=>setTimeout(r,20));assert.equal((await request(purpose)).status,504);
  },{...fake,timeoutMs:100});
});
test('IA BIAN: respuestas grandes y JSON inválido del motor quedan acotados',async()=>{
  await assert.rejects(limitedJson(new Response('x'.repeat(200)),100),/grande/);
  await assert.rejects(limitedJson(new Response('{')));
});
