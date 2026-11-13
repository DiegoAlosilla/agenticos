// Explicit development audit. Not an application connector or reference fetcher.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {prepareImport} from '../../dist/contracts-core.mjs';
const manifest=JSON.parse(await readFile('config/public-examples.json','utf8'));
const directory='work/public-examples-'+manifest.commit;
await mkdir(directory,{recursive:true});const results=[];
for(const fixture of manifest.files){
  const path=directory+'/'+fixture.path.slice(9);let bytes;
  try{bytes=await readFile(path);}catch{
    const response=await fetch(`https://raw.githubusercontent.com/postmanlabs/openapi-to-postman/${manifest.commit}/${fixture.path}`);
    if(!response.ok)throw Error('No se pudo obtener '+fixture.path);bytes=Buffer.from(await response.arrayBuffer());await writeFile(path,bytes);
  }
  assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.sha256,'Huella de '+fixture.path);
  const originalFetch=globalThis.fetch;globalThis.fetch=()=>{throw Error('El importador no debe descargar referencias');};
  let actual;
  try{const value=await prepareImport(bytes,fixture.path.endsWith('.json')?'json':'yaml',{version:2,revisions:[]});actual={status:'accepted',operations:value.contract.operations.length,version:value.contract.sourceVersion};assert.equal(value.contract.revision.snapshot,new TextDecoder('utf-8',{ignoreBOM:true}).decode(bytes));}
  catch(error){if(!error.diagnostic)throw error;actual={status:'rejected',code:error.diagnostic.code};}
  finally{globalThis.fetch=originalFetch;}
  assert.deepEqual(actual,fixture.expected,fixture.path);results.push({path:fixture.path,...actual});
}
// Pinned malformed example: explicit, local repair of one closing brace only.
const path=directory+'/api-with-examples.yaml',raw=await readFile(path,'utf8'),lines=raw.split('\n');assert.equal(lines[42].trim(),'}');lines[42]='                  }';
const repaired=lines.join('\n'),value=await prepareImport(new TextEncoder().encode(repaired),'yaml',{version:2,revisions:[]});assert.equal(value.contract.operations.length,2);
await writeFile(directory+'/api-with-examples.corregido.yaml',repaired);
const report={repository:manifest.repository,commit:manifest.commit,results,explicitIndentationRepair:{line:43,operations:2},allExpectationsMet:true};
await writeFile('work/public-examples-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
