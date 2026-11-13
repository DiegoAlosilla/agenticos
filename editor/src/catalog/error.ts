import {ContractError} from '../contracts/types';
import {contractStyles,el} from '../ui/styles';
export function errorElement(error:unknown):HTMLDivElement{
  contractStyles();const root=el('div','','ct');root.style.cssText='height:100%;display:flex;flex-direction:column;';
  const head=el('header','','ct-head');head.append(el('p','REVISIÓN DEL CONTRATO','ct-kicker'),el('h2',error instanceof ContractError?'No se pudo importar o consultar el contrato':'No se pudo completar la acción'));root.append(head);
  const content=el('div','','ct-scroll');content.setAttribute('role','alert');content.tabIndex=0;root.append(content);
  if(error instanceof ContractError){content.append(el('p',`${error.diagnostic.code}: ${error.message}`,'ct-description'));
    if(error.issues.length>1||error.issues[0].pointer){const list=el('div','','ct-issues');for(const issue of error.issues){const row=el('section','','ct-issue');row.append(el('code',issue.pointer??'Documento'),el('h4',issue.message));if(issue.hint)row.append(el('p',issue.hint,'ct-note'));list.append(row);}content.append(list);}
    content.append(el('p','La importación rechazada no cambia el diagrama. Corrija los problemas y vuelva a seleccionar el archivo. Esta revisión puede detenerse antes de otras comprobaciones.','ct-note'));
  }else content.append(el('p',error instanceof Error?error.message:String(error)));
  return root;
}
