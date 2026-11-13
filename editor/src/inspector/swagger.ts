import SwaggerUI from 'swagger-ui-dist/swagger-ui-bundle.js';
import swaggerCss from '../../node_modules/swagger-ui-dist/swagger-ui.css?raw';
import type {ContractModel,OperationView} from '../contracts/types';
import {el} from '../ui/styles';

// Swagger's plugin API uses Immutable collections and React internally. Keep that
// boundary here: neither the contract model nor the editor adapter imports them.
type SwaggerSystem=any;
export function createSwaggerInspector(actions?:{insert:(operation:OperationView)=>void;bindDrag?:(element:HTMLElement,operation:OperationView)=>void;close?:()=>void;insertAll?:(contract:ContractModel)=>void}){
  const element=el('div','','ct ct-swagger-document');element.setAttribute('role','document');element.setAttribute('aria-label','Documentación del contrato');
  const preview=el('p','','ct-preview-note');preview.hidden=true;
  const heading=el('h2','','ct-swagger-selection'),note=el('p','Swagger UI · Solo documentación','ct-note');
  const toolbar=el('div','','ct-swagger-toolbar');toolbar.append(note);
  const toolbarActions=el('div','','ct-swagger-toolbar-actions');
  const addAll=el('button','＋ Agregar todos','geBtn ct-add-all');addAll.type='button';addAll.title='Agregar todos los endpoints de esta API a un contenedor';addAll.onclick=()=>{if(activeContract)actions?.insertAll?.(activeContract);};
  if(actions?.insertAll)toolbarActions.append(addAll);
  if(actions?.close){const close=el('button','×','ct-close-render');close.type='button';close.title='Cerrar contrato';close.setAttribute('aria-label','Cerrar contrato');close.onclick=actions.close;toolbarActions.append(close);}
  toolbar.append(toolbarActions);
  const scroll=el('div','','ct-swagger-scroll'),host=el('div');host.dataset.renderer='swagger-ui';
  const shadow=host.attachShadow({mode:'open'}),style=el('style');
  style.textContent=swaggerCss+`
    :host{display:block;min-width:0;container-type:inline-size;white-space:normal;color-scheme:light;color:#3b4151;background:white;font-family:Arial,sans-serif}
    .swagger-ui{font-size:13px}.swagger-ui .wrapper{padding:0 14px;max-width:none}
    .swagger-ui .info{margin:24px 0}.swagger-ui .info .title{font-size:28px;overflow-wrap:anywhere}
    .swagger-ui .opblock-tag{font-size:19px;padding:10px 4px}.swagger-ui .opblock-summary{flex-wrap:wrap}
    .swagger-ui .opblock-summary-path{font-size:14px;min-width:0;overflow-wrap:anywhere}
    .swagger-ui .opblock-summary-description{flex-basis:100%;padding:6px 0;font-size:12px}
    .swagger-ui .opblock-body pre{max-width:100%;overflow:auto}
    .swagger-ui .opblock-section-header{padding:10px 14px}.swagger-ui .parameters-col_name{width:32%}
    .swagger-ui .parameters-col_description{width:68%}.swagger-ui table{table-layout:fixed}
    .swagger-ui td,.swagger-ui th,.swagger-ui p,.swagger-ui .renderedMarkdown{overflow-wrap:anywhere}
    .swagger-ui .responses-inner,.swagger-ui .opblock-description-wrapper{padding:14px}
    .swagger-ui .response-col_status{width:42px}.swagger-ui .response-col_links{display:none}
    .swagger-ui select{max-width:100%}.swagger-ui .scheme-container{display:none}
    .swagger-ui .opblock .opblock-summary-method{min-width:64px}
    .swagger-ui .renderedMarkdown{white-space:pre-wrap;font-size:13px;line-height:1.5}
    .swagger-ui .opblock-body{overflow:hidden}.swagger-ui .model-box{overflow:auto;max-width:100%}
    .swagger-ui .model-example{max-width:100%}.swagger-ui .highlight-code{overflow:auto}
    .ct-swagger-actions{display:flex;align-items:center;gap:8px;margin:4px;flex-shrink:0}
    .swagger-ui .opblock-summary-control{min-width:0;flex:1}.swagger-ui .opblock-summary{gap:2px}
    /* Native button colors cross the shadow boundary through inherited tokens.
       Swagger keeps its own HTTP method colors and documentation surface. */
    .ct-add-operation{color-scheme:var(--ct-editor-scheme,light);display:inline-flex;align-items:center;gap:5px;font:550 12px/1.3 Arial,sans-serif;color:light-dark(var(--text-color),var(--dark-text-color));background:light-dark(var(--ge-panel-color),var(--ge-dark-panel-color));border:1px solid light-dark(var(--border-color),var(--dark-border-color));border-radius:3px;padding:7px 10px;cursor:pointer}.ct-add-operation::before{content:'+';font-size:17px;line-height:12px;font-weight:400}.ct-add-operation:hover{background:light-dark(var(--highlight-color),var(--dark-border-color))}.ct-add-operation:active{opacity:.75}.ct-add-operation:focus-visible{outline:2px solid light-dark(var(--focus-color),var(--dark-focus-color));outline-offset:2px}
    .ct-drag-operation{font:11px Arial,sans-serif;color:#3b4151;cursor:grab;padding:6px 3px}.ct-drag-operation:hover{text-decoration:underline}
    @container(max-width:480px){.swagger-ui .opblock-summary-control{flex-basis:100%}.ct-swagger-actions{margin-left:auto}}
  `;
  const mount=el('div');shadow.append(style,mount);scroll.append(host);
  const provenance=el('details','','ct-swagger-source');provenance.append(el('summary','Snapshot y seguridad efectiva'));
  const source=el('div');provenance.append(source);
  scroll.append(provenance);element.append(preview,heading,toolbar,scroll);
  let selection:OperationView|undefined,system:SwaggerSystem,key='',lastContract:ContractModel|undefined,activeContract:ContractModel|undefined,wholeContract=false;
  let pendingFocus:OperationView|undefined;
  function focusOperation(){
    if(!pendingFocus||!element.isConnected||!scroll.clientHeight)return;
    const operation=pendingFocus,summaries=shadow.querySelectorAll<HTMLElement>('.opblock-summary');
    const summary=Array.from(summaries).find(node=>node.getAttribute('data-contract-path')===operation.ref.path&&node.getAttribute('data-contract-method')?.toUpperCase()===operation.ref.method);
    const block=summary?.closest<HTMLElement>('.opblock');
    if(block?.classList.contains('is-open')){scroll.scrollTop+=block.getBoundingClientRect().top-scroll.getBoundingClientRect().top;pendingFocus=undefined;}
  }
  // Swagger resolves and commits asynchronously. Scroll only after the requested
  // expanded block exists; a single observer serves this reused renderer.
  new MutationObserver(focusOperation).observe(mount,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  const draggables=new WeakSet<HTMLElement>();
  const contractText=new Set<string>();
  const blocked=()=>{throw new Error('La documentación local no permite solicitudes de red.');};
  const plugin=(api:SwaggerSystem)=>({
    // Filter the operation list, NOT the input document. Cross-path refs and
    // inherited parameters still see the complete validated specification.
    statePlugins:{spec:{wrapActions:{requestResolvedSubtree:(original:any)=>(path:string[])=>{
      // No authorization UI: never ask Swagger to discover OIDC configuration.
      if(path[0]==='components'&&path[1]==='securitySchemes')return;
      return original(path);
    }},wrapSelectors:{taggedOperations:(original:any)=>(state:any,...args:any[])=>{
      if(!selection||wholeContract)return original(state,...args);
      let found=false;
      return original(state,...args).map((tag:any)=>{
        const operations=tag.get('operations').filter((op:any)=>!found&&op.get('path')===selection?.ref.path&&op.get('method')===selection?.ref.method.toLowerCase());
        if(operations.size)found=true;
        return tag.set('operations',operations);
      }).filter((tag:any)=>tag.get('operations').size>0);
    }}}},
    fn:{fetch:blocked,execute:blocked},
    components:{authorizeBtn:()=>null,authorizeOperationBtn:()=>null,Webhooks:()=>null},
    wrapComponents:{OperationSummary:(Original:any)=>class extends Original{
      render(){
        const summary=super.render(),props=this.props,operationProps=props.operationProps;
        const path=operationProps.get('path'),method=operationProps.get('method');
        const operation=activeContract?.operations.find(item=>item.ref.path===path&&item.ref.method.toLowerCase()===method);
        if(!actions||!operation)return summary;
        const controls=api.React.createElement('div',{className:'ct-swagger-actions',key:'contracts-actions',onClick:(event:Event)=>event.stopPropagation()},
          api.React.createElement('button',{type:'button',className:'ct-add-operation','aria-label':`Agregar al lienzo ${operation.ref.method} ${path} · ${activeContract!.title}`,onClick:()=>actions.insert(operation)},'Agregar al lienzo'),
          actions.bindDrag?api.React.createElement('span',{className:'ct-drag-operation','aria-label':`Arrastrar ${operation.ref.method} ${path} · ${activeContract!.title}`,ref:(node:HTMLElement|null)=>{if(node&&!draggables.has(node)){draggables.add(node);actions.bindDrag!(node,operation);}}},'Arrastrar'):null);
        // Keep Swagger's summary, copy button and expansion controls. Insert our
        // siblings before Copy, inside the same operation border, never in a button.
        const children=api.React.Children.toArray(summary.props.children);children.splice(1,0,controls);
        return api.React.cloneElement(summary,{'data-contract-path':path,'data-contract-method':method},...children);
      }
    },Markdown:(Original:any)=>(props:any)=>contractText.has(props.source)
      ?api.React.createElement('div',{className:'renderedMarkdown'},props.source)
      :api.React.createElement(Original,props)},
  });
  return {element,show(contract:ContractModel,operation?:OperationView,isPreview=false,showWholeContract=false){
    activeContract=contract;selection=operation;wholeContract=showWholeContract;preview.hidden=!isPreview;preview.textContent=isPreview?'Vista previa del catálogo · sin insertar una figura':'';
    pendingFocus=wholeContract?operation:undefined;
    addAll.disabled=!contract.operations.length;addAll.setAttribute('aria-label',`Agregar todos los endpoints · ${contract.title}`);
    heading.textContent=operation?`${operation.ref.method} ${operation.ref.path}`:contract.title;
    const next=JSON.stringify([contract.revision.apiId,contract.revision.revisionId,operation?.ref.method,operation?.ref.path,wholeContract]);
    const spec=structuredClone(contract.document);
    contractText.clear();
    const collect=(value:unknown):void=>{if(typeof value==='string')contractText.add(value);else if(value&&typeof value==='object')Object.values(value).forEach(collect);};collect(spec);
    if(!system){
      system=SwaggerUI({domNode:mount,spec,plugins:[plugin],docExpansion:operation&&!wholeContract?'full':'list',defaultModelsExpandDepth:-1,
        defaultModelExpandDepth:1,defaultModelRendering:'example',deepLinking:false,filter:false,
        supportedSubmitMethods:[],tryItOutEnabled:false,validatorUrl:null,queryConfigEnabled:false,
        persistAuthorization:false,requestInterceptor:blocked,withCredentials:false,syntaxHighlight:false,
        displayRequestDuration:false,showExtensions:false,showCommonExtensions:true});
    }else if(next!==key||contract!==lastContract){
      // One React root per editor, reused across selections, previews and files.
      // updateSpec also invalidates Swagger's resolved subtree cache.
      system.getConfigs().docExpansion=operation&&!wholeContract?'full':'list';
      system.specActions.updateSpec(JSON.stringify(spec));
      if(operation){const tag=Array.isArray(operation.raw.tags)&&operation.raw.tags.length?operation.raw.tags[0]:'default';
        system.layoutActions.show(['operations-tag',tag],true);
        system.layoutActions.show(['operations',tag,operation.raw.operationId||system.fn.opId(operation.raw,operation.ref.path,operation.ref.method.toLowerCase())],true);}
    }
    if(wholeContract){
      for(const item of contract.operations){const tags=Array.isArray(item.raw.tags)&&item.raw.tags.length?item.raw.tags:['default'];
        const expanded=Boolean(operation&&item.ref.method===operation.ref.method&&item.ref.path===operation.ref.path);
        for(const tag of tags){if(expanded)system.layoutActions.show(['operations-tag',tag],true);system.layoutActions.show(['operations',tag,item.raw.operationId||system.fn.opId(item.raw,item.ref.path,item.ref.method.toLowerCase())],expanded);}
      }
    }
    if(next!==key||contract!==lastContract){
      if(!operation)for(const item of contract.operations){
        const tags=Array.isArray(item.raw.tags)&&item.raw.tags.length?item.raw.tags:['default'];
        for(const tag of tags)system.layoutActions.show(['operations',tag,item.raw.operationId||system.fn.opId(item.raw,item.ref.path,item.ref.method.toLowerCase())],false);
      }
      // Resolve the path too: Swagger's operation-only request leaves referenced
      // path-level parameters unresolved when merging inherited parameters.
      for(const path of new Set((operation&&!wholeContract?[operation]:contract.operations).map(item=>item.ref.path)))system.specActions.requestResolvedSubtree(['paths',path]);
      scroll.scrollTop=0;provenance.open=false;
    }key=next;lastContract=contract;
    if(pendingFocus)requestAnimationFrame(focusOperation);
    source.replaceChildren(el('p',`OpenAPI ${contract.sourceVersion} · revisión ${contract.revision.revisionId}`),
      el('p',operation?(operation.security.requirements.length?`Seguridad ${operation.security.origin==='global'?'heredada':'de la operación'}: ${JSON.stringify(operation.security.requirements)}`:'La operación no exige seguridad en esta revisión.'):'Contrato completo. La seguridad puede variar por operación.'),
      el('p','Example Value puede ser generado por Swagger UI desde el esquema. Los ejemplos declarados y el snapshot permanecen intactos.'));
    let rendered=false;provenance.ontoggle=()=>{if(provenance.open&&!rendered){rendered=true;source.append(el('pre',contract.revision.snapshot));}};
    return element;
  }};
}
