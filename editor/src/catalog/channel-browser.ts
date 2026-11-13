import {el} from '../ui/styles';

interface Match {file:string; title:string; version:string; method:string; path:string; summary:string; sha256:string}

async function get(url:string, signal?:AbortSignal) {
  const response=await fetch(url,{signal,redirect:'error'});
  if(!response.headers.get('content-type')?.startsWith('application/json')) throw Error('Inicia el editor con npm run channel:editor para consultar el repositorio.');
  const body=await response.json();
  if(!response.ok) throw Error(body.error ?? 'Repositorio no disponible.');
  return body;
}

export function channelBrowser(open:(revision:unknown,match:Match)=>Promise<void>) {
  const element=el('section','','ct-channel-browser');element.setAttribute('aria-label','Repositorio Business');
  const form=el('form','','ct-api-toolbar');
  const input=el('input');input.type='search';input.maxLength=600;input.placeholder='Busca operación en Git';input.setAttribute('aria-label','Busca operación en Git');
  const search=el('button','Buscar','geBtn');form.append(input,search);
  const status=el('p');status.setAttribute('role','status');
  const hint=el('p','Al abrir un resultado se guarda esa revisión en el diagrama.','ct-note');
  const list=el('div','','ct-api-choices');list.setAttribute('role','list');list.setAttribute('aria-label','Operaciones del repositorio');element.append(form,hint,status,list);
  let controller:AbortController|undefined;
  async function lookup() {
    controller?.abort();
    const signal=(controller=new AbortController()).signal;
    list.replaceChildren();status.textContent='Consultando repositorio…';
    try {
      const data=await get(`/api/channel-catalog/search?${new URLSearchParams({q:input.value.trim()})}`,signal);
      if(signal.aborted)return;
      status.textContent=`${data.operations.length} de ${data.total} operaciones · ${data.commit.slice(0,8)}${data.skipped.length?` · ${data.skipped.length} archivos omitidos`:''}`;
      for(const match of data.operations as Match[]) {
        const row=el('div');row.setAttribute('role','listitem');
        const button=el('button',`${match.title} · ${match.version} · ${match.method} ${match.path}`,'ct-api-choice');button.type='button';
        const summary=el('small',match.summary);row.append(button,summary);list.append(row);
        button.onclick=async()=>{
          button.disabled=true;
          try {
            const dataFile=await get(`/api/channel-catalog/contract?${new URLSearchParams({commit:data.commit,file:match.file})}`,signal);
            if(!signal.aborted)await open(dataFile.revision,match);
          }catch(error){if(!signal.aborted)status.textContent=error instanceof Error?error.message:String(error);}
          finally{button.disabled=false;}
        };
      }
    }catch(error){if(!signal.aborted)status.textContent=error instanceof Error?error.message:String(error);}
  }
  form.onsubmit=event=>{event.preventDefault();void lookup();};
  return {element,start(){input.focus();void lookup();},pause(){controller?.abort();}};
}
