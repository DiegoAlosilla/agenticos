import catalogData from '../../data/bian/catalog.json';
import manifest from '../../data/bian/manifest.json';
import support from '../../data/bian/es-support.json';
import {createBianSearch,QUERY_LIMIT,SEARCH_HELP_VERSION} from '../bian/search';
import {actionHelp,guideSteps,loanChoices,SUPPORT_VERSION} from '../bian/guidance';
import {makeBianReference,readBianReference} from '../bian/reference';
import type {BianReference} from '../bian/reference';
import type {BianCatalog,BianDomain,BianOperation} from '../bian/types';
import {el} from '../ui/styles';
import {bianAssistant} from './bian-assistant';
import type {BianAiContext} from './bian-assistant';

let viewSequence=0;

export function bianBrowser(close:()=>void,insert?:(reference:BianReference)=>void){
  const catalog:BianCatalog=catalogData,engine=createBianSearch(catalog),spanish:Record<string,string[]>=support.domains;
  const element=el('section','','ct-bian');element.setAttribute('aria-label','Consulta BIAN');
  const head=el('div','','ct-bian-head'),heading=el('h2','Consulta BIAN'),guideButton=button('Guía BIAN',()=>showGuide(false)),back=button('×',close);back.setAttribute('aria-label','Cerrar consulta BIAN');head.append(heading,el('span',catalog.landscape,'ct-bian-version'),guideButton,back);
  const meta=el('p',`BIAN ${catalog.landscape} · artefactos ${catalog.release} · ${catalog.variant}`,'ct-bian-meta');
  const intro=el('p','Busca una responsabilidad de negocio. El orden orienta; la elección requiere revisar la definición.','ct-bian-hint');
  const label=el('label','¿Qué hará tu endpoint?'),purpose=el('textarea');purpose.rows=2;purpose.maxLength=QUERY_LIMIT;purpose.placeholder='Ej.: iniciar préstamo personal';purpose.setAttribute('aria-label','Propósito del endpoint');label.append(purpose);
  const filters=el('div','','ct-bian-filters'),actionLabel=el('label','Acción · filtro manual'),action=el('select');action.setAttribute('aria-label','Acción BIAN');action.append(new Option('Todas las acciones',''));
  for(const name of engine.actions)action.append(new Option(`${name} — ${actionHelp[name]?.es??name}`,name));actionLabel.append(action);
  const actionButton=button('?',()=>showGuide(true));actionButton.setAttribute('aria-label','Ayuda de acciones BIAN');actionButton.title='Qué significa cada acción y cuándo usarla';
  actionButton.classList.add('ct-bian-help-trigger');
  const clear=button('Limpiar',()=>{purpose.value='';action.value='';update();purpose.focus();});filters.append(actionLabel,actionButton,clear);
  const options=el('label','','ct-bian-language'),translate=el('input');translate.type='checkbox';translate.checked=true;translate.setAttribute('aria-label','Mostrar apoyo en español');options.append(translate,el('span','Español de apoyo · no oficial'));
  const help=el('details','','ct-bian-provenance');help.append(el('summary','Fuente, alcance y ayuda de búsqueda'));
  help.append(el('p',`${catalog.domains.length} dominios y ${manifest.counts.operations} operaciones BOM OAS publicadas. No incluye todo el Landscape, ISO20022/DDD ni AsyncAPI. Fuente: BIAN y contribuidores · Apache-2.0 · commit ${catalog.commit}.`));
  help.append(el('p',`Verificado el 18/10/2026. Extracción local modificada: sin payloads. ${SUPPORT_VERSION}: nombres traducidos y resúmenes españoles propios; el original inglés se conserva. ${SEARCH_HELP_VERSION}: equivalencias locales para búsqueda. No son traducciones oficiales, reglas de tu organización ni certificación. La búsqueda por palabras no usa IA. Sugerir con IA local envía solo el propósito al motor del equipo, por acción explícita.`));
  help.prepend(meta,intro,options);
  help.append(el('p','IA opcional: envía el propósito y el filtro al motor de tu equipo. La primera consulta prepara el índice y puede tardar varios minutos. Contratos y diagrama permanecen en el navegador.','ct-bian-hint'),sourceLink('README.md','Repositorio oficial (enlace externo)'),el('br'),sourceLink('LICENSE','Licencia de la fuente (enlace externo)'));
  const expansion=el('p','','ct-bian-hint'),status=el('p','','ct-bian-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const notice=el('p','','ct-bian-notice');notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
  const workspace=el('div','','ct-bian-workspace'),listPane=el('aside','','ct-bian-list-pane'),listScroll=el('div','','ct-bian-list-scroll'),scroll=el('div','','ct-bian-scroll'),results=el('div','','ct-bian-results');results.setAttribute('aria-label','Dominios BIAN');
  listPane.setAttribute('aria-label','Lista de candidatos BIAN');scroll.setAttribute('aria-label','Detalle de referencia BIAN');
  const empty=el('p','Selecciona un dominio o una sugerencia para revisar su definición y operaciones.','ct-bian-detail-empty');
  const tabs=el('div','','ct-bian-list-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Origen de resultados BIAN');
  const catalogTab=button('Catálogo',()=>setMode('catalog')),aiTab=button('Sugerencias IA',()=>setMode('ai')),prefix=`ct-bian-${++viewSequence}`;
  for(const [tab,name] of [[catalogTab,'catalog'],[aiTab,'ai']] as const){tab.setAttribute('role','tab');tab.id=`${prefix}-${name}-tab`;tab.setAttribute('aria-controls',`${prefix}-${name}`);tab.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const next=event.key==='Home'?catalogTab:event.key==='End'?aiTab:tab===catalogTab?aiTab:catalogTab;setMode(next===catalogTab?'catalog':'ai');next.focus();}};}tabs.append(catalogTab,aiTab);
  const detail=el('article','','ct-bian-detail'),guide=el('article','','ct-bian-guide'),detailPane=el('div','','ct-bian-detail-pane'),detailActions=el('div','','ct-bian-detail-actions');detail.hidden=true;guide.hidden=true;detailActions.hidden=true;
  const assistant=bianAssistant(catalog,manifest.catalogSha256,()=>({purpose:purpose.value,action:action.value}),(domain,operation,trigger,context)=>showDetail(domain,undefined,operation,trigger,context),()=>{clearTimeout(timer);render();setMode('ai');});
  results.id=`${prefix}-catalog`;results.setAttribute('role','tabpanel');results.setAttribute('aria-labelledby',catalogTab.id);assistant.element.id=`${prefix}-ai`;assistant.element.setAttribute('role','tabpanel');assistant.element.setAttribute('aria-labelledby',aiTab.id);
  const query=el('div','','ct-bian-query');filters.append(assistant.controls);query.append(label,filters);
  help.append(expansion);listScroll.append(status,results,assistant.element);listPane.append(tabs,listScroll);scroll.append(empty,detail,guide);detailPane.append(scroll,detailActions);workspace.append(listPane,detailPane);element.append(head,query,workspace,notice,help);
  let response=engine.search(''),limit=30,timer:ReturnType<typeof setTimeout>|undefined,selected:BianDomain|undefined,saved:BianReference|undefined,guideFocus:HTMLElement|undefined;
  let focusedOperation:BianOperation|undefined;
  let detailReturnFocus:HTMLElement|undefined;
  let mode:'catalog'|'ai'='catalog',aiContext:BianAiContext|undefined;
  function button(text:string,click:()=>void){const b=el('button',text,'geBtn');b.type='button';b.onclick=click;return b;}
  function sourceLink(path:string,text:string,commit=catalog.commit){const a=el('a',text);a.href=`https://github.com/bian-official/public/blob/${commit}/${path.split('/').map(encodeURIComponent).join('/')}`;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function referenceMatches(ref:BianReference){const d=catalog.domains.find(d=>d.id===ref.domain.id),source=manifest.sources.find(s=>s.path===ref.source);return ref.commit===catalog.commit&&ref.release===catalog.release&&ref.variant===catalog.variant&&source?.sha256===ref.sourceSha256&&d?.title===ref.domain.title&&d?.description===ref.domain.description&&d.operations.some(o=>JSON.stringify(o)===JSON.stringify(ref.operation));}
  function translated(domain:BianDomain,reference?:BianReference){return translate.checked&&(!reference||referenceMatches(reference))?spanish[domain.id]:undefined;}
  function highlight(){for(const row of results.querySelectorAll<HTMLButtonElement>('[data-domain-id]'))row.setAttribute('aria-pressed',String(row.dataset.domainId===selected?.id&&(!saved||referenceMatches(saved))&&!aiContext));assistant.select(aiContext?selected?.id:undefined,aiContext?focusedOperation:undefined);}
  function clearDetail(){selected=undefined;saved=undefined;focusedOperation=undefined;aiContext=undefined;detail.hidden=true;guide.hidden=true;empty.hidden=false;detail.replaceChildren();detailActions.replaceChildren();detailActions.hidden=true;workspace.dataset.detailOpen='false';highlight();}
  function setMode(next:'catalog'|'ai',clear=true){if(clear&&next===mode)return;if(next!==mode)assistant.cancelPending();mode=next;results.hidden=mode!=='catalog';assistant.element.hidden=mode!=='ai';status.hidden=mode!=='catalog';catalogTab.setAttribute('aria-selected',String(mode==='catalog'));aiTab.setAttribute('aria-selected',String(mode==='ai'));if(clear)clearDetail();}
  function showGuide(actionsOnly:boolean){
    assistant.cancelPending();workspace.dataset.detailOpen='true';empty.hidden=true;
    clearTimeout(timer);guideFocus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;detail.hidden=true;detailActions.hidden=true;guide.hidden=false;guide.replaceChildren();
    const title=el('h3',actionsOnly?'¿Qué acción elijo?':'Guía de uso de BIAN');title.tabIndex=-1;
    guide.append(button('← Volver a la consulta',()=>{guide.hidden=true;if(selected){detail.hidden=false;detailActions.hidden=!detailActions.childElementCount;}else {empty.hidden=false;workspace.dataset.detailOpen='false';}guideFocus?.focus();}),title);
    guide.append(el('p','La acción NO se selecciona automáticamente. El filtro muestra solo operaciones que ya tienen esa acción en la fuente. Si no sabes cuál usar, empieza con Todas las acciones.'));
    if(!actionsOnly){
      for(const [name,text] of guideSteps)guide.append(el('h4',name),el('p',text));
      guide.append(el('h4','Ejemplo: ¿préstamo personal u oferta?'));
      for(const [name,text] of loanChoices)guide.append(el('h4',name),el('p',text));
      guide.append(el('p','Estas diferencias son orientación propia basada en las definiciones. «Oferta» no siempre significa préstamo formalizado. Revisa también el proceso, cliente y producto reales.'));
      guide.append(el('h4','Cómo se ordenan los resultados'),el('p','Se comparan palabras y algunas equivalencias españolas con nombres y descripciones. El nombre del dominio pesa más que una mención incidental. A igualdad de coincidencias se priorizan rutas más generales. Se muestran términos cubiertos y faltantes; no hay comprensión semántica ni una elección ideal garantizada.'));
    }
    guide.append(el('h4','Acciones: orientación en español'),el('p','Los nombres ingleses proceden del catálogo. Estas explicaciones y ejemplos son ayuda propia; confirma el significado en la descripción de cada operación. Create e Initiate, Capture y Register, o Execute y Request no son intercambiables por traducirse de forma parecida.'));
    for(const name of engine.actions){const entry=actionHelp[name];const section=el('section','','ct-bian-action-help');section.dataset.action=name;section.append(el('h4',`${name} — ${entry.es}`),el('p',entry.meaning),el('p',entry.example,'ct-bian-hint'),button(`Filtrar por ${name}`,()=>{action.value=name;update();action.focus();}));guide.append(section);}
    guide.append(el('h4','Método HTTP y nivel CR/BQ'),el('p','El término BIAN no sustituye al método HTTP. CR identifica el registro de control principal; BQ señala una parte de su comportamiento. Revisa la etiqueta original y la descripción de la operación antes de elegir.'));
    guide.append(el('h4','Fuente conceptual y límites'),el('p',`Guía propia ${SUPPORT_VERSION}. La búsqueda por palabras no usa IA; la asistencia local es opcional y sus explicaciones no son oficiales. No se ejecutan APIs. Una referencia en el dibujo no declara implementación o conformidad. Las traducciones son resúmenes de apoyo; el inglés sigue disponible.`));
    const source=el('a','Semantic API Practitioner Guide V8.1 · §3.2.5 (enlace externo)');source.href='https://bian.org/wp-content/uploads/2024/12/BIAN-Semantic-API-Pactitioner-Guide-V8.1-FINAL.pdf';source.target='_blank';source.rel='noopener noreferrer';guide.append(source);
    scroll.scrollTop=0;title.focus({preventScroll:true});
  }
  function showDetail(domain:BianDomain,reference?:BianReference,focused?:BianOperation,returnFocus?:HTMLElement,context?:BianAiContext){
    assistant.cancelPending();workspace.dataset.detailOpen='true';empty.hidden=true;aiContext=context;
    const operations=reference||context?[reference?.operation??focused!]:response.matches.find(m=>m.domain.id===domain.id)?.operations.map(m=>m.operation)??[];
    const operation=operations.find(o=>o.method===focused?.method&&o.path===focused.path)??operations[0];
    focusedOperation=operation;detailReturnFocus=returnFocus;
    selected=domain;saved=reference;detail.hidden=false;guide.hidden=true;detail.replaceChildren();detailActions.replaceChildren();detailActions.hidden=true;highlight();
    const backToList=button('← Dominios',()=>{clearDetail();const target=returnFocus?.isConnected?returnFocus:Array.from(results.querySelectorAll<HTMLButtonElement>('[data-domain-id]')).find(b=>b.dataset.domainId===domain.id);(target??purpose).focus({preventScroll:true});});
    const title=el('h3',domain.title),detailHeading=el('div','','ct-bian-detail-heading');title.tabIndex=-1;detailHeading.append(title,backToList);detail.append(detailHeading,el('p','Referencia de diseño BIAN','ct-bian-hint'));
    const es=translated(domain,reference);
    if(!reference&&!context&&operations.length){
      const pickerLabel=el('label',`Operación · ${operations.length} disponibles`,'ct-bian-operation-picker'),picker=el('select');picker.setAttribute('aria-label','Operación BIAN');
      operations.forEach((o,index)=>picker.append(new Option(`${o.operationId} · ${o.method} ${o.path}`,String(index))));picker.value=String(operations.indexOf(operation));
      picker.onchange=()=>{showDetail(domain,undefined,operations[Number(picker.value)],returnFocus);detail.querySelector<HTMLSelectElement>('.ct-bian-operation-picker select')?.focus({preventScroll:true});};pickerLabel.append(picker);detail.append(pickerLabel);
    }
    if(reference)detail.append(el('p',referenceMatches(reference)?'Coincide con el catálogo local fijado.':'La referencia guardada difiere del catálogo local; se muestra sin sustituirla.','ct-bian-hint'));
    if(!domain.operations.length)detail.append(el('p','Este artefacto oficial no publica operaciones en paths. No se han inventado endpoints.','ct-bian-empty'));
    if(operation){
      const row=el('section','','ct-bian-operation');row.append(el('h4',operation.operationId),el('code',`${operation.method} ${operation.path}`));
      const official=el('details','','ct-bian-operation-original');official.append(el('summary','Original oficial en inglés'),el('p',operation.summary));
      if(operation.description!==operation.summary)official.append(el('p',operation.description));
      if(operation.tags.length)official.append(el('p',operation.tags.join(' · '),'ct-bian-meta'));row.append(official);
      detail.append(row);
      const choosing=el('section','','ct-bian-choosing');choosing.append(el('h4','Antes de elegir'),el('p','Confirma producto, tipo de cliente y etapa del proceso.','ct-bian-hint'));
      const actionText=translate.checked?actionHelp[operation.action]?.es:undefined;choosing.append(el('p',`Acción: ${operation.action}${actionText?' · '+actionText:''}`,'ct-bian-hint'));detail.append(choosing);
      if(context){const explanation=el('details','','ct-bian-ai-explanation'),limits=el('details');explanation.append(el('summary','Explicación generada · no oficial'),el('p',context.reason));limits.append(el('summary','Límites de la sugerencia'),el('p',context.limitations));explanation.append(limits);detail.append(explanation);}
      if(insert&&(!reference||referenceMatches(reference))){const add=button('Agregar al lienzo',()=>{try{const ref=reference??makeBianReference(catalog,domain,operation,manifest.sources.find(s=>s.path===domain.source)!.sha256);insert(ref);notice.textContent=`Referencia BIAN agregada: ${domain.title} · ${operation.operationId}. No se ha generado un contrato.`;}catch(error){notice.textContent=error instanceof Error?error.message:String(error);}notice.hidden=false;});add.classList.add('ct-bian-add');add.setAttribute('aria-label',`Agregar endpoint BIAN ${domain.id} ${operation.operationId}`);detailActions.append(add);detailActions.hidden=false;}
    }
    const domainInfo=el('details','','ct-bian-domain-info');domainInfo.open=!es;domainInfo.append(el('summary','Sobre el dominio y la fuente'));
    if(es){domainInfo.append(el('p',es[0],'ct-bian-label'),el('p','Traducción resumida de apoyo · propia, no oficial','ct-bian-hint'));if(es[1])domainInfo.append(el('p',es[1]));}
    const original=el('details','','ct-bian-original');original.open=!es;original.append(el('summary','Dominio · definición oficial en inglés'),el('p',domain.description||'La fuente no incluye una definición de este dominio.'));domainInfo.append(original);
    if(!domain.description)detail.append(el('p','La fuente no incluye una definición de este dominio.','ct-bian-hint'));
    domainInfo.append(el('p',`Artefacto ${domain.version} · ${domain.id}.yaml${reference?' · referencia guardada en esta figura':''}`,'ct-bian-meta'),sourceLink(domain.source,'Fuente oficial del dominio (enlace externo)',reference?.commit));
    if(reference){const revision=el('details','','ct-bian-original');revision.append(el('summary','Revisión de la referencia guardada'),el('p',`BIAN y contribuidores · ${reference.license} · extracto de referencia. Commit ${reference.commit} · SHA-256 de la fuente ${reference.sourceSha256}.`));domainInfo.append(revision);}
    detail.append(domainInfo);
    scroll.scrollTop=0;title.focus({preventScroll:true});
  }
  function render(){
    notice.hidden=true;notice.textContent='';
    response=engine.search(purpose.value,action.value);clearDetail();results.replaceChildren();
    expansion.textContent=response.expansions.length?`Ayuda local: ${response.expansions.map(e=>`${e.term} → ${e.alternatives.join(' / ')}`).join(' · ')}`:'';expansion.hidden=!expansion.textContent;
    status.textContent=`${response.matches.length} dominios${response.terms.length?' con coincidencias':' disponibles'}${response.truncated?' · Se usan los primeros 32 términos.':''}.`;
    if(!response.matches.length)results.append(el('p','Sin coincidencias. Prueba otro término, un nombre en inglés o cambia la acción. La búsqueda es léxica y su vocabulario español es limitado.','ct-bian-empty'));
    appendResults(0);scroll.scrollTop=0;listScroll.scrollTop=0;setMode(mode,false);
  }
  function appendResults(start:number){
    results.querySelector('.ct-bian-more')?.remove();
    for(const match of response.matches.slice(start,limit)){
      const domain=match.domain,row=el('div','','ct-bian-result'),b=button(domain.title,()=>showDetail(domain,undefined,undefined,b));b.className='ct-bian-domain';b.dataset.domainId=domain.id;b.setAttribute('aria-pressed','false');row.append(b);
      const es=translated(domain);if(es)row.append(el('p',es[0],'ct-bian-label'));
      row.append(el('p',es?.[1]||domain.description||'Definición ausente en la fuente.'));
      if(response.terms.length){const missing=response.terms.filter(t=>!match.matchedTerms.includes(t)),coverage=el('details','','ct-bian-coverage');coverage.append(el('summary','Coincidencias de búsqueda'),el('p',`Coincide con: ${match.matchedTerms.join(', ')} · ${match.matchedTerms.length}/${response.terms.length} términos${missing.length?' · Sin cubrir: '+missing.join(', '):''}`,'ct-bian-hint'));row.append(coverage);}
      if(!domain.operations.length)row.append(el('p','Sin operaciones publicadas en paths.','ct-bian-hint'));results.append(row);
    }
    if(response.matches.length>limit){const more=button('Mostrar más dominios',()=>{const start=limit;limit+=30;appendResults(start);results.querySelectorAll<HTMLButtonElement>('.ct-bian-domain')[start]?.focus();});more.classList.add('ct-bian-more');results.append(more);}
  }
  function update(){assistant.invalidate();mode='catalog';clearTimeout(timer);limit=30;render();}
  purpose.oninput=()=>{assistant.invalidate();clearTimeout(timer);timer=setTimeout(update,120);};action.onchange=update;
  translate.onchange=()=>{clearTimeout(timer);if(selected)showDetail(selected,saved,focusedOperation,detailReturnFocus,aiContext);else render();};
  render();
  function showReference(ref:BianReference){status.textContent='Referencia BIAN guardada · consulta de una operación.';showDetail({...ref.domain,version:ref.release,source:ref.source,operations:[ref.operation]},ref);}
  return {element,focus(){purpose.focus();},pause(){assistant.invalidate();if(mode==='ai')setMode('catalog');},
    selectReference(raw:string,design:boolean){
      assistant.invalidate();setMode('catalog');clearTimeout(timer);
      try{
        if(!design){showReference(readBianReference(raw));return;}
        const ref=JSON.parse(raw);
        const domain=catalog.domains.find(item=>item.id===ref.domain);
        const operation=domain?.operations.find(item=>item.method===ref.method&&item.path===ref.path);
        const source=manifest.sources.find(item=>item.path===ref.source);
        if(domain&&operation&&source&&ref.commit===catalog.commit&&ref.release===catalog.release&&ref.source===domain.source&&ref.action===operation.action){
          showReference(makeBianReference(catalog,domain,operation,source.sha256));return;
        }
        if(typeof ref.domain!=='string'||typeof ref.method!=='string'||typeof ref.path!=='string')throw Error('Referencia BIAN inválida.');
        clearDetail();workspace.dataset.detailOpen='true';empty.hidden=true;detail.hidden=false;
        detail.append(el('p','Referencia guardada fuera del catálogo local fijado.'),el('p',`${ref.domain} · ${ref.method} ${ref.path}`));
      }catch(error){clearDetail();workspace.dataset.detailOpen='true';empty.hidden=true;detail.hidden=false;const alert=el('p',error instanceof Error?error.message:String(error));alert.setAttribute('role','alert');detail.append(alert);}
    },clearReference(){render();},reset(){assistant.invalidate();clearTimeout(timer);purpose.value='';action.value='';mode='catalog';limit=30;help.open=false;render();}};
}
