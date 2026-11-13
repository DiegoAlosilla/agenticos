// Reproduce the local projection from pinned official BOM files. No network by default.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseDocument} from 'yaml';

const root=fileURLToPath(new URL('../',import.meta.url));
const manifest=JSON.parse(await readFile(resolve(root,'data/bian/manifest.json'),'utf8'));
const cache=resolve(root,'work/bian/sources');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const sourceUrl=path=>`${manifest.rawBase}/${path.split('/').map(encodeURIComponent).join('/')}`;
if(process.argv.includes('--download')){
  await mkdir(cache,{recursive:true});let index=0;
  await Promise.all(Array.from({length:6},async()=>{while(index<manifest.sources.length){const source=manifest.sources[index++];
    const response=await fetch(sourceUrl(source.path));if(!response.ok)throw Error(`BIAN: HTTP ${response.status} ${source.path}`);
    const bytes=Buffer.from(await response.arrayBuffer());if(sha256(bytes)!==source.sha256)throw Error(`BIAN: SHA-256 no coincide ${source.path}`);
    await writeFile(resolve(cache,basename(source.path)),bytes);
  }}));
}
const str=(value,label,empty=false)=>{if(typeof value!=='string'||(!empty&&!value.trim())||value.length>20000)throw Error(`BIAN: campo inválido ${label}`);return value;};
const domains=[];const anomalies=[];
for(const source of manifest.sources){
  const bytes=await readFile(resolve(cache,basename(source.path)));
  if(bytes.length!==source.bytes||sha256(bytes)!==source.sha256||createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')!==source.gitBlobSha1)throw Error(`BIAN: fuente alterada ${source.path}`);
  const parsed=parseDocument(bytes.toString('utf8'),{uniqueKeys:true});if(parsed.errors.length)throw Error(`BIAN: YAML inválido ${source.path}: ${parsed.errors[0].message}`);
  const document=parsed.toJS({maxAliasCount:0});
  if(document.openapi!=='3.0.1'||!document.paths||!document.info)throw Error(`BIAN: estructura no soportada ${source.path}`);
  const operations=[];
  for(const [path,item] of Object.entries(document.paths)){
    if(!path.startsWith('/')||!item||typeof item!=='object')throw Error(`BIAN: path inválido ${source.path}`);
    for(const [method,operation] of Object.entries(item)){
      if(!/^(get|post|put|delete|patch|head|options|trace)$/.test(method))continue;
      const tags=operation.tags??[];if(!Array.isArray(tags))throw Error('BIAN: tags inválidos');
      operations.push({method:method.toUpperCase(),path,action:str(path.split('/').at(-1),'action'),operationId:str(operation.operationId,'operationId'),summary:str(operation.summary??'','summary',true),description:str(operation.description??'','description',true),tags:tags.map(tag=>str(tag,'tag'))});
    }
  }
  const version=str(document.info.version,'version');
  if(version!==manifest.artifactRelease)anomalies.push({source:source.path,field:'info.version',value:version,expected:manifest.artifactRelease});
  const description=str(document.info.description,'description',true);
  if(!description.trim())anomalies.push({source:source.path,field:'info.description',value:description,expected:'non-empty definition'});
  if(!operations.length)anomalies.push({source:source.path,field:'paths',value:0,expected:'published operations'});
  domains.push({id:basename(source.path,'.yaml'),title:str(document.info.title,'title'),description,version,source:source.path,operations});
}
const catalog={notice:manifest.projectionNotice,release:manifest.artifactRelease,landscape:manifest.landscape,variant:manifest.variant,commit:manifest.commit,domains};
const output=JSON.stringify(catalog,null,2)+'\n';
if(sha256(output)!==manifest.catalogSha256)throw Error('BIAN: la proyección difiere de la huella fijada; no se escribe');
if(process.argv.includes('--write'))await writeFile(resolve(root,'data/bian/catalog.json'),output);
const stored=await readFile(resolve(root,'data/bian/catalog.json'));
if(stored.toString('utf8')!==output||sha256(stored)!==manifest.catalogSha256)throw Error('BIAN: catálogo o huella no reproducible');
if(sha256(await readFile(resolve(root,'licenses/bian-Apache-2.0.txt')))!==manifest.license.sha256)throw Error('BIAN: licencia alterada');
if(JSON.stringify(anomalies)!==JSON.stringify(manifest.anomalies))throw Error('BIAN: anomalías difieren del manifiesto');
const operations=domains.reduce((total,domain)=>total+domain.operations.length,0);
if(domains.length!==manifest.counts.domains||operations!==manifest.counts.operations)throw Error('BIAN: conteos difieren');
console.log(JSON.stringify({verified:true,commit:manifest.commit,domains:domains.length,operations,catalogBytes:stored.length,catalogSha256:sha256(stored),anomalies},null,2));
