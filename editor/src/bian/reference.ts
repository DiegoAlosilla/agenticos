import type {BianCatalog,BianDomain,BianOperation} from './types';
export const BIAN_REF_ATTRIBUTE='bianRef';
export const MAX_BIAN_REF_BYTES=32*1024;
export interface BianReference {
  version:1;release:string;variant:string;commit:string;source:string;sourceSha256:string;
  license:'Apache-2.0';attribution:'BIAN and contributors';
  domain:Pick<BianDomain,'id'|'title'|'description'>;operation:BianOperation;
}
const object=(value:any)=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value:any,max=20000)=>typeof value==='string'&&value.length<=max;
export function readBianReference(raw:string):BianReference {
  if(new TextEncoder().encode(raw).length>MAX_BIAN_REF_BYTES)throw Error('Referencia BIAN supera 32 KiB. Se conserva sin modificar.');
  let ref:any;try{ref=JSON.parse(raw);}catch{throw Error('Referencia BIAN inválida. Se conserva sin modificar.');}
  if(ref?.version!==1)throw Error('Versión de referencia BIAN no soportada. Se conserva sin modificar.');
  const d=ref.domain,o=ref.operation;
  if(!object(ref)||ref.license!=='Apache-2.0'||ref.attribution!=='BIAN and contributors'||!text(ref.release,30)||!/^\d+\.\d+\.\d+$/.test(ref.release)||!text(ref.variant,120)||!ref.variant||!text(ref.commit,40)||!/^[a-f0-9]{40}$/.test(ref.commit)||!text(ref.sourceSha256,64)||!/^[a-f0-9]{64}$/.test(ref.sourceSha256)||
    !object(d)||!text(d.id,100)||!/^[A-Za-z0-9]+$/.test(d.id)||!text(d.title,300)||!d.title||!text(d.description)||
    ref.source!==`release${ref.release}/semantic-apis/oas3 /yamls/${d.id}.yaml`||
    !object(o)||!['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS','TRACE'].includes(o.method)||!text(o.path,2000)||!o.path.startsWith('/')||!text(o.action,100)||o.path.split('/').at(-1)!==o.action||
    !text(o.operationId,300)||!o.operationId||!text(o.summary)||!text(o.description)||!Array.isArray(o.tags)||o.tags.length>30||!o.tags.every((tag:any)=>text(tag,300)))throw Error('Referencia BIAN inválida. Se conserva sin modificar.');
  return ref;
}
export function makeBianReference(catalog:BianCatalog,domain:BianDomain,operation:BianOperation,sourceSha256:string):BianReference {
  const ref={version:1,license:'Apache-2.0',attribution:'BIAN and contributors',release:catalog.release,variant:catalog.variant,commit:catalog.commit,source:domain.source,sourceSha256,domain:{id:domain.id,title:domain.title,description:domain.description},operation};
  return readBianReference(JSON.stringify(ref));
}
