import {prepareImport} from '../contracts/import';
import {ContractError} from '../contracts/types';
import {MAX_FILE_BYTES} from '../contracts/parse';
import {readRegistry,REGISTRY_ATTRIBUTE} from '../persistence/registry';
import {RegistryAttributeChange} from './registry-change';
import {DRAFTS_ATTRIBUTE,assertDraftDocumentBudget} from '../persistence/drafts';
import type {ContractModel} from '../contracts/types';
export function registerImport(ui: any, report: (error: unknown)=>void,completed:(contract:ContractModel,duplicate:boolean)=>void): void {
  ui.actions.addAction('contractsImport',()=>{
    const input=document.createElement('input');
    input.type='file';input.accept='.json,.yaml,.yml';
    input.onchange=async()=>{
      try {
        const file=input.files?.[0];if(!file)return;
        if(file.size>MAX_FILE_BYTES)throw new ContractError('FILE_TOO_LARGE','El contrato supera 5 MiB.');
        const format=/\.json$/i.test(file.name)?'json':/\.ya?ml$/i.test(file.name)?'yaml':undefined;
        if(!format)throw new ContractError('UNSUPPORTED_FORMAT','Seleccione un archivo .json, .yaml o .yml.');
        const node=ui.fileNode;
        if(!node)throw new Error('Cree o abra un diagrama antes de importar.');
        const before=node.getAttribute(REGISTRY_ATTRIBUTE);
        const current=readRegistry(before);
        const prepared=await prepareImport(new Uint8Array(await file.arrayBuffer()),format,current);
        if(ui.fileNode!==node||node.getAttribute(REGISTRY_ATTRIBUTE)!==before)throw new Error('El documento cambió durante la importación. Vuelva a seleccionar el contrato.');
        assertDraftDocumentBudget(node.getAttribute(DRAFTS_ATTRIBUTE),prepared.registry);
        if(!prepared.duplicate){
          const model=ui.editor.graph.getModel();model.beginUpdate();
          try {model.execute(new RegistryAttributeChange(node,JSON.stringify(prepared.registry)));}
          finally {model.endUpdate();}
        }
        completed(prepared.contract,prepared.duplicate);
      }catch(error){report(error);}
    };
    input.click();
  });
}
