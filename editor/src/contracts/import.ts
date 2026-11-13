import type {Registry, Revision} from '../model/types';
import {parseSnapshot,detectVersion,utf8Size,MAX_DOCUMENT_BYTES} from './parse';
import {scanReferences} from './references';
import {validateStructure} from './validate';
import {normalizeOperations} from './normalize';
import {ContractError,object,text,type ContractModel} from './types';

export function readContract(revision: Revision): ContractModel {
  const document=parseSnapshot(revision.snapshot,revision.format);
  const {line,sourceVersion}=detectVersion(document);
  const scan=scanReferences(document,line);
  validateStructure(document,line,scan);
  const diagnostics=scan.cycles.map(pointer=>({code:'SCHEMA_REFERENCE_CYCLE',message:'Referencia recursiva conservada; expansión acotada.',pointer,severity:'warning' as const}));
  if (document.webhooks || Object.values(document.paths||{}).some(item=>item&&typeof item==='object'&&!Array.isArray(item)&&Object.values(item).some(op=>op&&typeof op==='object'&&!Array.isArray(op)&&Object.hasOwn(op,'callbacks')))) {
    diagnostics.push({code:'PATHS_ONLY',message:'Webhooks/callbacks se conservan en el snapshot; el catálogo inicial enumera paths.',pointer:'#',severity:'warning'});
  }
  return {line,sourceVersion,title:text(object(document.info).title),declaredVersion:text(object(document.info).version),document,revision,
    operations:normalizeOperations(document,revision,line,sourceVersion),diagnostics,cycles:scan.cycles};
}
export async function prepareImport(bytes: Uint8Array, format: 'json'|'yaml', registry: Registry): Promise<{registry: Registry; contract: ContractModel; duplicate: boolean}> {
  // Decode strictly and preserve original bytes (UTF-8 including BOM) in snapshot.
  let snapshot: string;
  try {snapshot=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}
  catch {throw new ContractError('INVALID_ENCODING','El contrato debe usar UTF-8 válido.');}
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as Uint8Array<ArrayBuffer>)),value=>value.toString(16).padStart(2,'0')).join('');
  const identical=registry.revisions.find(revision=>revision.sha256===hash);
  if (identical) return {registry,contract:readContract(identical),duplicate:true};
  if (utf8Size(snapshot)+registry.revisions.reduce((total,revision)=>total+utf8Size(revision.snapshot),0)>MAX_DOCUMENT_BYTES) throw new ContractError('DOCUMENT_TOO_LARGE','Los snapshots del documento superarían 15 MiB.');
  const revision: Revision={apiId:crypto.randomUUID(),revisionId:`sha256:${hash}`,sha256:hash,format,snapshot};
  const contract=readContract(revision);
  return {registry:{version:2,revisions:[...registry.revisions,revision]},contract,duplicate:false};
}
