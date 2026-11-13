import {readRegistry,findRevision,REGISTRY_ATTRIBUTE,REF_ATTRIBUTE} from '../persistence/registry';
import {contractCell} from './component-figure';
import {DRAFTS_ATTRIBUTE,DRAFT_REF_ATTRIBUTE,readDrafts,readDraftRef,findDraft} from '../persistence/drafts';
export function installCopyGuard(ui:any,report:(error:unknown)=>void){
  const graph=ui.editor.graph;
  let draftSource:any,copiedDrafts=new Map<string,string>();
  const exportable=graph.getExportableCells;
  graph.getExportableCells=function(cells:any[]){
    // A selected inner endpoint travels with its owning container and reference.
    const result=exportable.call(this,[...new Set(cells.map(cell=>contractCell(graph,cell)))]);
    draftSource=ui.fileNode;copiedDrafts=new Map();
    const pending=[...result];while(pending.length){const cell=pending.pop();if(cell?.children)pending.push(...cell.children);const raw=cell?.value?.getAttribute?.(DRAFT_REF_ATTRIBUTE);if(raw){const ref=readDraftRef(raw);copiedDrafts.set(ref.apiId,JSON.stringify(findDraft(readDrafts(ui.fileNode?.getAttribute(DRAFTS_ATTRIBUTE)),ref)));}}
    return result;
  };
  const previous=graph.importCells;
  graph.importCells=function(cells:any[],...args:any[]){
    try{
      const pending=[...cells];
      while(pending.length){
        const cell=pending.pop();if(!cell)continue;
        if(cell.children)pending.push(...cell.children);
        const raw=cell.value?.getAttribute?.(REF_ATTRIBUTE);
        if(raw){
          try{findRevision(readRegistry(ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE)),JSON.parse(raw));}
          catch{throw new Error('Copia bloqueada: el documento destino no contiene el contrato vinculado. Comparta el archivo .drawio completo o añada la operación desde el catálogo del destino.');}
        }
        const draft=cell.value?.getAttribute?.(DRAFT_REF_ATTRIBUTE);
        if(draft){try{const ref=readDraftRef(draft),api=findDraft(readDrafts(ui.fileNode?.getAttribute(DRAFTS_ATTRIBUTE)),ref);if(draftSource!==ui.fileNode&&copiedDrafts.get(ref.apiId)!==JSON.stringify(api))throw new Error('Diseño distinto o procedencia de clipboard desconocida.');}
          catch{throw new Error('Copia bloqueada: el documento destino no contiene el borrador de esta figura. Comparta el archivo .drawio completo.');}}
      }
      return previous.apply(graph,[cells,...args]);
    }catch(error){report(error);return [];}
  };
}
