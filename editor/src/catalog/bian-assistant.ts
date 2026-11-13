import type {BianCatalog,BianDomain,BianOperation} from '../bian/types';
import {resolveSuggestions} from '../bian/assistant';
import {el} from '../ui/styles';

export interface BianAiContext {reason:string;limitations:string;}
export function bianAssistant(catalog:BianCatalog,catalogHash:string,query:()=>{purpose:string;action:string},review:(domain:BianDomain,operation:BianOperation,trigger:HTMLButtonElement,context:BianAiContext)=>void,activate:()=>void){
  const element=el('section','','ct-bian-ai');element.setAttribute('aria-label','Asistencia BIAN con IA local');
  const controls=el('div','','ct-bian-ai-controls'),ask=el('button','Sugerir con IA local','geBtn'),cancel=el('button','Cancelar','geBtn');ask.type=cancel.type='button';cancel.hidden=true;
  const hint=el('p','Sugerencias generadas · revisa la definición oficial.','ct-bian-hint');
  const status=el('p','','ct-bian-ai-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const output=el('div','','ct-bian-ai-results');controls.append(ask,cancel);element.append(hint,status,output);
  let controller:AbortController|undefined,version=0;
  function invalidate(message=''){version++;controller?.abort();controller=undefined;ask.disabled=false;cancel.hidden=true;element.removeAttribute('aria-busy');status.textContent=message;output.replaceChildren();}
  cancel.onclick=()=>invalidate('Consulta cancelada. Puedes seguir buscando por palabras.');
  ask.onclick=async()=>{
    invalidate();activate();const requested=query();if(!requested.purpose.trim()){status.textContent='Escribe primero el propósito del endpoint.';return;}
    const revision=version;controller=new AbortController();const requestController=controller,signal=controller.signal,timeout=setTimeout(()=>requestController.abort(),245_000);
    ask.disabled=true;cancel.hidden=false;element.setAttribute('aria-busy','true');status.textContent='Buscando candidatos y preparando su explicación en tu equipo…';
    try{
      const response=await fetch('/api/bian-ai/suggest',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(requested),signal,credentials:'same-origin',redirect:'error'});
      const raw=await response.text();if(raw.length>16000)throw Error('Respuesta de asistencia demasiado grande.');
      const data=JSON.parse(raw);if(!response.ok)throw Error(typeof data.error==='string'?data.error:'La asistencia local no está disponible.');
      const result=resolveSuggestions(data,catalog,requested.action,catalogHash);if(revision!==version)return;
      status.textContent=result.suggestions.length?`${result.suggestions.length} sugerencias disponibles.`:'La IA se abstuvo de sugerir operaciones. Prueba un propósito más preciso.';
      for(const item of result.suggestions){
        const domain=catalog.domains.find(d=>d.id===item.domainId)!,operation=domain.operations.find(o=>o.method===item.method&&o.path===item.path)!;
        const row=el('article','','ct-bian-ai-suggestion');row.dataset.domainId=domain.id;row.dataset.operationKey=JSON.stringify([domain.id,operation.method,operation.path]);
        const source=el('a','Fuente oficial fijada');source.href=`https://github.com/bian-official/public/blob/${catalog.commit}/${domain.source.split('/').map(encodeURIComponent).join('/')}`;source.target='_blank';source.rel='noopener noreferrer';
        const open=el('button','','ct-bian-ai-choice');open.type='button';open.setAttribute('aria-label','Revisar operación oficial');open.setAttribute('aria-pressed','false');open.append(el('strong',domain.title),el('span',`${operation.method} · ${operation.operationId}`));open.onclick=()=>review(domain,operation,open,{reason:item.reason,limitations:result.limitations});
        const why=el('details');why.append(el('summary','Por qué se propone'),el('p',item.reason),source);row.append(open,why);output.append(row);
      }
      const limits=el('details','','ct-bian-ai-limits');limits.append(el('summary','Límites de las sugerencias'),el('p',result.limitations));output.append(limits);
      const provenance=el('details');provenance.append(el('summary','Modelos, revisión y tiempo'),el('p',`${result.models.chat.name} · ${result.models.chat.digest}\nEmbeddings: ${result.models.embedding.name} · ${result.models.embedding.digest}\nBIAN ${catalog.release} · commit ${result.catalogCommit}\nCatálogo SHA-256: ${result.catalogSha256}\n${(result.elapsedMs/1000).toFixed(1)} s · sin historial guardado.`));output.append(provenance);
    }catch(error){if(revision===version){status.textContent=signal.aborted?'La consulta se canceló o agotó su tiempo. Puedes reintentar.':`${error instanceof Error?error.message:String(error)} La búsqueda por palabras sigue disponible.`;}}
    finally{clearTimeout(timeout);if(revision===version){controller=undefined;ask.disabled=false;cancel.hidden=true;element.removeAttribute('aria-busy');}}
  };
  return {element,controls,invalidate,cancelPending(){if(controller)invalidate('Consulta cancelada.');},select(domainId?:string,operation?:BianOperation){const key=operation?JSON.stringify([domainId,operation.method,operation.path]):undefined;for(const row of output.querySelectorAll<HTMLElement>('.ct-bian-ai-suggestion'))row.querySelector('button')?.setAttribute('aria-pressed',String(row.dataset.operationKey===key));}};
}
