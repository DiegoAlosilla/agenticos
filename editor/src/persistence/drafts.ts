import type {DraftApi,DraftStore,DraftRef} from '../model/drafts';
import type {Registry} from '../model/types';
import {MAX_DOCUMENT_BYTES} from '../contracts/parse';
export const DRAFTS_ATTRIBUTE='contractsDrafts';
export const DRAFT_REF_ATTRIBUTE='contractDraftRef';
export const MAX_DRAFT_BYTES=1024*1024;
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=(v:any)=>typeof v==='string'&&v.length<=20000;
const id=(v:any)=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(v);
const list=(v:any)=>Array.isArray(v)&&v.length<=100;
const scalar=(v:any)=>['string','integer','number','boolean'].includes(v);
function field(v:any){return object(v)&&text(v.name)&&scalar(v.type)&&text(v.description)&&typeof v.required==='boolean'&&text(v.example);}
export function readDrafts(raw:string|null):DraftStore {
  if(!raw)return {version:1,apis:[]};
  if(new TextEncoder().encode(raw).length>MAX_DRAFT_BYTES)throw new Error('Los borradores superan 1 MiB. Se conservan sin reescribir.');
  let store:any;try{store=JSON.parse(raw);}catch{throw new Error('Registro de borradores inválido. Se conserva sin reescribir.');}
  if(store?.version!==1)throw new Error('Versión de borradores no soportada. Se conservan sin reescribir.');
  const fail=()=>{throw new Error('Registro de borradores inválido. Se conserva sin reescribir.');};
  if(!Array.isArray(store.apis)||store.apis.length>10)fail();
  const ids=new Set<string>();
  for(const api of store.apis){
    if(!object(api)||!id(api.id)||ids.has(api.id)||api.profile!=='basic-openapi-3.0.1/v1'||!['title','version','description','server','tag'].every(k=>text(api[k]))||!['none','bearer'].includes(api.security)||!list(api.operations))fail();
    ids.add(api.id);
    for(const op of api.operations){
      if(!object(op)||!id(op.id)||ids.has(op.id)||op.method!=='GET'||!['path','operationId','summary','description'].every(k=>text(op[k]))||!list(op.parameters)||!list(op.responses))fail();
      ids.add(op.id);
      if(!op.parameters.every((p:any)=>field(p)&&['path','query','header','cookie'].includes(p.location)))fail();
      if(!op.responses.every((r:any)=>object(r)&&text(r.code)&&text(r.description)&&['none','object'].includes(r.body)&&list(r.fields)&&r.fields.every(field)))fail();
    }
  }
  return store;
}
export function writeDrafts(store:DraftStore):string {const raw=JSON.stringify(store);readDrafts(raw);return raw;}
export function assertDraftDocumentBudget(raw:string|null,registry:Registry):void {
  if(!raw)return;
  const encoder=new TextEncoder(),bytes=encoder.encode(raw).length+registry.revisions.reduce((sum,r)=>sum+encoder.encode(r.snapshot).length,0);
  if(bytes>MAX_DOCUMENT_BYTES)throw new Error('Los contratos y borradores juntos superarían 15 MiB. No se ha cambiado el documento.');
}
export function readDraftRef(raw:string):DraftRef {
  const ref=JSON.parse(raw);if(!object(ref)||!id(ref.apiId)||(ref.operationId!==undefined&&!id(ref.operationId)))throw new Error('Referencia de borrador inválida.');return ref;
}
export function findDraft(store:DraftStore,ref:DraftRef):DraftApi {
  const api=store.apis.find(a=>a.id===ref.apiId);
  if(!api||(ref.operationId&&!api.operations.some(o=>o.id===ref.operationId)))throw new Error('Borrador no disponible: falta la API o la operación en este documento.');return api;
}
