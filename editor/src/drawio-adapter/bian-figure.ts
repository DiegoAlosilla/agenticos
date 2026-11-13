import {BIAN_REF_ATTRIBUTE,readBianReference} from '../bian/reference';
import type {BianReference} from '../bian/reference';
declare const mxUtils:any;
export function insertBianFigure(ui:any,reference:BianReference):any {
  if(!ui.fileNode)throw Error('Crea o abre un diagrama antes de agregar una referencia BIAN.');
  const raw=JSON.stringify(reference),ref=readBianReference(raw);
  const graph=ui.editor.graph,model=graph.getModel(),point=graph.getFreeInsertPoint();
  const value=mxUtils.createXmlDocument().createElement('UserObject');
  value.setAttribute('label',`«BIAN · Referencia»\n${ref.domain.title}\n${ref.operation.method} ${ref.operation.path}\n${ref.operation.operationId}`);
  value.setAttribute(BIAN_REF_ATTRIBUTE,raw);
  model.beginUpdate();let cell;
  try{cell=graph.insertVertex(graph.getDefaultParent(),null,value,point.x,point.y,360,130,'shape=component;whiteSpace=wrap;html=0;fontSize=12;');}finally{model.endUpdate();}
  return cell;
}
