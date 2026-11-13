import type {BianCatalog,BianDomain,BianOperation} from './types';
import {QUERY_LIMIT} from './search';
export {createBianSearch} from './search';

export interface AiCandidate {id:string;domain:BianDomain;operation:BianOperation;}
export interface AiSuggestion {domainId:string;method:string;path:string;reason:string;}
export interface AiResult {
  suggestions:AiSuggestion[];limitations:string;catalogCommit:string;catalogSha256:string;
  models:{chat:{name:string;digest:string};embedding:{name:string;digest:string}};elapsedMs:number;
}
export function validatePurpose(value:unknown,actions:string[]):{purpose:string;action:string}{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Solicitud de IA inválida.');
  const record=value as Record<string,unknown>;
  if(Object.keys(record).sort().join(',')!=='action,purpose'||typeof record.purpose!=='string'||!record.purpose.trim()||record.purpose.length>QUERY_LIMIT||typeof record.action!=='string'||(record.action!==''&&!actions.includes(record.action)))throw Error('Indica un propósito de 1 a 600 caracteres y una acción válida.');
  return {purpose:record.purpose.trim(),action:record.action};
}
export function unitVector(value:unknown,dimensions?:number):number[]{
  if(!Array.isArray(value)||!value.length||value.length>4096||(dimensions!==undefined&&value.length!==dimensions)||value.some(n=>typeof n!=='number'||!Number.isFinite(n)))throw Error('El motor devolvió embeddings inválidos.');
  const norm=Math.hypot(...value);if(!norm)throw Error('El motor devolvió un embedding vacío.');
  return value.map(n=>n/norm);
}
export function similarity(a:number[],b:number[]):number {if(a.length!==b.length)throw Error('Dimensiones de embeddings incompatibles.');return a.reduce((sum,n,i)=>sum+n*b[i],0);}
export function candidateKey(domainId:string,method:string,path:string){return JSON.stringify([domainId,method,path]);}
export function parseExplanation(value:unknown,candidates:AiCandidate[]):{suggestions:AiSuggestion[];limitations:string}{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Respuesta de IA inválida.');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).sort().join(',')!=='limitations,suggestions'||!Array.isArray(v.suggestions)||v.suggestions.length>3||typeof v.limitations!=='string'||!v.limitations.trim()||v.limitations.length>1200)throw Error('La IA no respetó el formato de explicación.');
  const used=new Set<string>(),suggestions:AiSuggestion[]=[];
  for(const item of v.suggestions){
    if(!item||typeof item!=='object'||Object.keys(item).sort().join(',')!=='id,reason'||typeof item.id!=='string'||used.has(item.id)||typeof item.reason!=='string'||!item.reason.trim()||item.reason.length>1000)throw Error('La IA devolvió candidatos inválidos o duplicados.');
    const candidate=candidates.find(c=>c.id===item.id);if(!candidate)throw Error('La IA citó una operación ajena a los candidatos recuperados.');
    used.add(item.id);suggestions.push({domainId:candidate.domain.id,method:candidate.operation.method,path:candidate.operation.path,reason:item.reason});
  }
  return {suggestions,limitations:v.limitations};
}
export function resolveSuggestions(value:unknown,catalog:BianCatalog,action:string,expectedHash:string):AiResult{
  const v=value as AiResult;
  if(!v||v.catalogCommit!==catalog.commit||v.catalogSha256!==expectedHash||!Array.isArray(v.suggestions)||v.suggestions.length>3||typeof v.limitations!=='string'||v.limitations.length>1200||!Number.isFinite(v.elapsedMs)||!v.models)throw Error('Respuesta de asistencia incompatible con el catálogo local.');
  for(const model of [v.models.chat,v.models.embedding])if(!model||typeof model.name!=='string'||model.name.length>100||!/^[a-f0-9]{64}$/.test(model.digest))throw Error('Identidad del modelo inválida.');
  const seen=new Set<string>();
  for(const item of v.suggestions){
    const key=candidateKey(item.domainId,item.method,item.path),domain=catalog.domains.find(d=>d.id===item.domainId),op=domain?.operations.find(o=>o.method===item.method&&o.path===item.path);
    if(!op||(action&&op.action!==action)||seen.has(key)||typeof item.reason!=='string'||!item.reason.trim()||item.reason.length>1000)throw Error('La asistencia devolvió una operación inexistente o fuera del filtro.');
    seen.add(key);
  }
  return v;
}
