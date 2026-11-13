// Native editable cells only: no images, custom shapes, or contract interpretation.
import type {OperationRef} from '../model/types';
declare const mxUtils:any;
declare const mxPoint:any;
const role='contractVisualRole';
const containerStyle='rounded=0;whiteSpace=wrap;html=0;fillColor=#ffff99;strokeColor=#808040;fontColor=#000000;fontSize=12;verticalAlign=top;spacingTop=8;spacingLeft=26;spacingRight=26;container=1;collapsible=0;recursiveResize=0;';
const componentStyle='shape=component;jettyWidth=10;jettyHeight=5;whiteSpace=wrap;html=0;fillColor=#ffff99;strokeColor=#808040;fontColor=#000000;fontSize=12;';

export function contractCell(graph:any,cell:any):any {
  for(let current=cell;current;current=graph.getModel().getParent(current)){
    if(graph.getAttributeForCell(current,'contractState',''))return current;
    if(!graph.getAttributeForCell(current,role,''))break;
  }
  return cell;
}
function header(title:string,classification:string){
  return `«${classification==='UX'?'APIUX':classification==='BS'?'APIBS':'API'}»\n${title}`;
}
export function componentLabel(graph:any,cell:any,title:string,method:string,path:string,classification:string,purpose=''):void {
  graph.cellLabelChanged(cell,header(title,classification)+(purpose?`\n${purpose}`:''));
  for(const child of cell.children??[]){
    if(graph.getAttributeForCell(child,role,'')==='operation')graph.cellLabelChanged(child,`«${method||'HTTP'}»\n${path||'/pendiente'}`);
  }
}
// Each bulk endpoint owns its reference and belongs to an explicit API parent.
export function makeApiFigure(graph:any,title:string,values:Element[],x:number,y:number):any {
  const columns=values.length;
  const value=mxUtils.createXmlDocument().createElement('UserObject');value.setAttribute('label',header(title,''));value.setAttribute(role,'api');
  const parent=graph.insertVertex(graph.getDefaultParent(),null,value,x,y,columns*240+40,180,containerStyle);
  values.forEach((value,index)=>{const ref=JSON.parse(value.getAttribute('contractRef')!);value.setAttribute(role,'operation');value.setAttribute('label',`«${ref.method}»\n${ref.path}`);
    graph.insertVertex(parent,null,value,30+index*240,64,220,74,componentStyle);
  });
  const iconValue=mxUtils.createXmlDocument().createElement('UserObject');iconValue.setAttribute(role,'decoration');
  const icon=graph.insertVertex(parent,null,iconValue,1,0,18,22,componentStyle+'resizable=0;movable=0;editable=0;connectable=0;',true);
  const geometry=icon.geometry.clone();geometry.offset=new mxPoint(-28,10);graph.getModel().setGeometry(icon,geometry);icon.setConnectable(false);
  return parent;
}
// Existing bulk API parents have no operation reference of their own. Resolve
// only their explicit children and require one unambiguous API/revision pair.
export function selectionContractTarget(graph:any,selected:any):{api:boolean;ref:OperationRef}|undefined {
  let cell=selected;
  while(cell&&graph.getAttributeForCell(cell,role,'')==='decoration')cell=graph.getModel().getParent(cell);
  if(!cell)return;
  const api=graph.getAttributeForCell(cell,role,'')==='api';
  const owner=contractCell(graph,cell),raw=graph.getAttributeForCell(owner,'contractRef','');
  if(raw)return {api,ref:JSON.parse(raw)};
  if(!api)return;
  const references=(cell.children??[]).filter((child:any)=>graph.getAttributeForCell(child,'contractState','')==='linked')
    .map((child:any)=>JSON.parse(graph.getAttributeForCell(child,'contractRef','')));
  if(!references.length)return;
  const ref=references[0];
  if(references.some((other:any)=>other.apiId!==ref.apiId||other.revisionId!==ref.revisionId))throw new Error('El contenedor tiene referencias de varias APIs o revisiones. Seleccione un endpoint.');
  return {api:true,ref};
}
export function makeComponentFigure(graph:any,cell:any,title:string,method:string,path:string,classification='',purpose=''):void {
  const model=graph.getModel();
  model.beginUpdate();
  try{
    if(graph.getAttributeForCell(cell,role,'')==='api')return;
    graph.setAttributeForCell(cell,'authorLabel',graph.convertValueToString(cell));
    graph.setAttributeForCell(cell,role,'api');
    model.setStyle(cell,containerStyle);
    const geometry=cell.geometry.clone();geometry.width=Math.max(360,geometry.width);geometry.height=Math.max(170,geometry.height);model.setGeometry(cell,geometry);
    const value=mxUtils.createXmlDocument().createElement('UserObject');value.setAttribute(role,'operation');
    const operation=graph.insertVertex(cell,null,value,70,68,geometry.width-140,74,componentStyle);
    graph.setAttributeForCell(operation,'contractPurpose',purpose);
    const iconValue=mxUtils.createXmlDocument().createElement('UserObject');iconValue.setAttribute(role,'decoration');
    const icon=graph.insertVertex(cell,null,iconValue,1,0,18,22,componentStyle+'resizable=0;movable=0;editable=0;connectable=0;',true);
    const iconGeometry=icon.geometry.clone();iconGeometry.offset=new mxPoint(-28,10);model.setGeometry(icon,iconGeometry);icon.setConnectable(false);
    componentLabel(graph,cell,title,method,path,classification,purpose);
  }finally{model.endUpdate();}
}
