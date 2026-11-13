import type {ContractModel,OperationView} from '../contracts/types';
import {contractStyles,el,methodBadge} from '../ui/styles';
export interface CatalogHandlers{insert:(operation:OperationView,classification:string)=>void;insertAll?:(contract:ContractModel)=>void;bindDrag:(element:HTMLElement,operation:OperationView,classification:()=>string)=>void;preview?:(contract:ContractModel,operation:OperationView)=>void}
export function catalogElement(contracts:ContractModel[],handlers:CatalogHandlers,linkMode=false):HTMLDivElement{
  contractStyles();const root=el('div','','ct');root.style.cssText='height:100%;display:flex;flex-direction:column;';
  const head=el('header','','ct-head');head.append(el('p','CONTRATOS LOCALES','ct-kicker'),el('h3',linkMode?'Vincular una operación':'Catálogo de operaciones'));root.append(head);
  const tools=el('div','','ct-catalog-tools'),search=el('input');search.type='search';search.placeholder='Buscar API, ruta, método o descripción';search.setAttribute('aria-label','Buscar operaciones');
  const label=el('label','Capa de la nueva figura'),classification=el('select','','ct-select');classification.setAttribute('aria-label','Clasificación manual');
  for(const [value,text]of [['','Sin clasificación'],['UX','UX (manual)'],['BS','BS (manual)'],['otra','Otra (manual)']]){const option=el('option',text);option.value=value;classification.append(option);}label.append(classification);tools.append(search,label);root.append(tools);
  const status=el('p','','ct-note');status.setAttribute('role','status');tools.append(status);
  const list=el('div','','ct-scroll');list.setAttribute('role','list');list.setAttribute('aria-label','Operaciones de contratos');root.append(list);
  function render(){
    list.replaceChildren();let count=0;const query=search.value.toLocaleLowerCase();
    for(const contract of contracts){const operations=contract.operations.filter(operation=>[contract.title,operation.ref.method,operation.ref.path,operation.summary,operation.description].join(' ').toLocaleLowerCase().includes(query));if(!operations.length)continue;
      const group=el('section'),heading=el('div','','ct-api-head');heading.append(el('strong',contract.title),el('small',`API ${contract.declaredVersion} · ${contract.line==='2.0'?'Swagger':'OpenAPI'} ${contract.sourceVersion} · ${contract.revision.apiId.slice(0,8)}`));group.append(heading);
      for(const operation of operations){count++;const row=el('div','','ct-operation');row.setAttribute('role','listitem');const title=el('div','','ct-op-path');title.append(methodBadge(operation.ref.method),el('code',operation.ref.path));row.append(title,el('p',operation.summary||operation.description.split('\n')[0]||'Sin resumen declarado','ct-op-summary'));
        const actions=el('div','','ct-op-actions'),button=el('button',linkMode?'Elegir operación':'Añadir al lienzo','ct-button');button.setAttribute('aria-label',`${linkMode?'Vincular':'Añadir'} ${operation.ref.method} ${operation.ref.path} · ${contract.title}`);button.onclick=()=>handlers.insert(operation,classification.value);actions.append(button);
        if(!linkMode){if(handlers.preview){const preview=el('button','Consultar','ct-button');preview.setAttribute('aria-label',`Consultar ${operation.ref.method} ${operation.ref.path} · ${contract.title}`);preview.onclick=()=>handlers.preview!(contract,operation);actions.append(preview);}const drag=el('span','⠿ Arrastrar','ct-drag');drag.setAttribute('aria-label',`Arrastrar ${operation.ref.method} ${operation.ref.path} · ${contract.title}`);actions.append(drag);handlers.bindDrag(drag,operation,()=>classification.value);}row.append(actions);group.append(row);
      }list.append(group);
    }
    status.textContent=`${count} operaciones · ${contracts.length} contratos`;if(!count)list.append(el('p','Sin coincidencias. Pruebe con otro término o importe un contrato.','ct-empty'));
  }
  search.oninput=render;render();return root;
}
