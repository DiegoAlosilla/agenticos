import {catalogElement} from '../catalog/view';
import {readContract} from '../contracts/import';
import type {ContractModel,OperationView} from '../contracts/types';
import {readRegistry,REF_ATTRIBUTE,REGISTRY_ATTRIBUTE,findRevision} from '../persistence/registry';
import {contractCell,makeComponentFigure,makeApiFigure,componentLabel} from './component-figure';
import type {EndpointDock} from './endpoint-dock';
declare const mxUtils: any;
export function registerCatalog(ui:any,report:(error:unknown)=>void,dock:EndpointDock):void {
  const graph=ui.editor.graph,model=graph.getModel();
  function valueFor(operation:OperationView,classification:string){
    const value=mxUtils.createXmlDocument().createElement('UserObject');
    value.setAttribute('label',`${operation.title}\n${operation.ref.method} ${operation.ref.path}\n${operation.summary}`);
    value.setAttribute(REF_ATTRIBUTE,JSON.stringify(operation.ref));value.setAttribute('contractState','linked');
    if(classification)value.setAttribute('contractClassification',classification);
    return value;
  }
  function insert(operation:OperationView,classification:string,x?:number,y?:number){
    try{
      findRevision(readRegistry(ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE)),operation.ref);
      const point=x===undefined||y===undefined?graph.getFreeInsertPoint():{x,y};
      model.beginUpdate();
      let cell;
      try{cell=graph.insertVertex(graph.getDefaultParent(),null,valueFor(operation,classification),point.x,point.y,300,110,
        'rounded=1;whiteSpace=wrap;html=0;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=14;');
        makeComponentFigure(graph,cell,operation.title,operation.ref.method,operation.ref.path,classification);
      }finally{model.endUpdate();}
      dock.selectInserted(cell);
    }catch(error){report(error);}
  }
  function link(cell:any,operation:OperationView,classification:string){
    if(!model.contains(cell)){report(new Error('La figura pendiente ya no está en la página actual.'));return;}
    const before=graph.convertValueToString(cell);
    const plannedMethod=graph.getAttributeForCell(cell,'plannedMethod',''),plannedPath=graph.getAttributeForCell(cell,'plannedPath','');
    const container=document.createElement('div');container.style.padding='12px';
    const title=document.createElement('h3');title.textContent='Vincular operación pendiente';
    const previous=document.createElement('p');previous.textContent=`Previsto: ${plannedMethod||'sin método'} ${plannedPath||'sin ruta'}`;
    const next=document.createElement('p');next.textContent=`Contrato: ${operation.title} · ${operation.ref.method} ${operation.ref.path}`;
    const difference=document.createElement('p');difference.textContent=plannedMethod!==operation.ref.method||plannedPath!==operation.ref.path?'El método o la ruta difieren. Se conservarán el propósito, las notas, la geometría y las conexiones.':'El método y la ruta coinciden. Se conservará el trabajo de la figura.';
    const accept=document.createElement('button');accept.textContent='Vincular';accept.className='geBtn';
    accept.onclick=()=>{
      try{
        if(!model.contains(cell)||graph.convertValueToString(cell)!==before)throw new Error('La figura cambió. Vuelva a seleccionar la operación.');
        findRevision(readRegistry(ui.fileNode.getAttribute(REGISTRY_ATTRIBUTE)),operation.ref);
        const initial=graph.getAttributeForCell(cell,'authorInitialLabel','');
        const purpose=before===initial?graph.getAttributeForCell(cell,'authorPurpose',''):before;
        model.beginUpdate();
        try{
          graph.setAttributeForCell(cell,'authorLabel',before);
          graph.setAttributeForCell(cell,REF_ATTRIBUTE,JSON.stringify(operation.ref));graph.setAttributeForCell(cell,'contractState','linked');
          if(classification)graph.setAttributeForCell(cell,'contractClassification',classification);
          if(graph.getAttributeForCell(cell,'contractVisualRole','')==='api')componentLabel(graph,cell,operation.title,operation.ref.method,operation.ref.path,classification,purpose);
          else graph.cellLabelChanged(cell,`${operation.title}\n${operation.ref.method} ${operation.ref.path}\n${purpose}`);
        }finally{model.endUpdate();}
        ui.hideDialog();graph.setSelectionCell(cell);dock.reveal();
      }catch(error){report(error);}
    };
    const cancel=document.createElement('button');cancel.textContent='Cancelar';cancel.className='geBtn';cancel.onclick=()=>ui.hideDialog();
    container.append(title,previous,next,difference,cancel,accept);ui.showDialog(container,580,250,true,true);
  }
  function insertAll(contract:ContractModel){
    try{
      const registry=readRegistry(ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE));
      // Validate and prepare all values before the first editor mutation.
      const values=contract.operations.map(operation=>{findRevision(registry,operation.ref);return valueFor(operation,'');});
      if(!values.length)return;
      const point=graph.getFreeInsertPoint();let cell;
      model.beginUpdate();
      try{cell=makeApiFigure(graph,contract.title,values,point.x,point.y);}finally{model.endUpdate();}
      dock.selectInserted(cell);
    }catch(error){report(error);}
  }
  function show(linkMode=false){
    try{
      if(!linkMode){dock.showCatalog();return;}
      const node=ui.fileNode,cell=contractCell(graph,graph.getSelectionCell());
      if(linkMode&&(!cell||graph.getAttributeForCell(cell,'contractState','')!=='pending'))throw new Error('Seleccione una operación pendiente para vincular.');
      const contracts=readRegistry(node?.getAttribute(REGISTRY_ATTRIBUTE)).revisions.map(readContract);
      const content=catalogElement(contracts,{
        preview:(contract,operation)=>dock.preview(contract,operation),
        insert:(operation,classification)=>{if(ui.fileNode!==node){report(new Error('El documento cambió. Abra nuevamente el catálogo.'));return;}linkMode?link(cell,operation,classification):insert(operation,classification);},
        bindDrag:(element,operation,classification)=>mxUtils.makeDraggable(element,graph,(_graph:any,_evt:any,_target:any,x:number,y:number)=>{
          if(ui.fileNode!==node){report(new Error('El documento cambió.'));return;}insert(operation,classification(),x,y);
        })
      },linkMode);
      dock.showCatalog(content,linkMode);
      content.querySelector('input')?.focus();
    }catch(error){report(error);}
  }
  dock.configure({insert,insertAll,bindDrag:(element,operation,classification)=>mxUtils.makeDraggable(element,graph,(_graph:any,_evt:any,_target:any,x:number,y:number)=>insert(operation,classification(),x,y))});
  ui.actions.addAction('contractsCatalog',()=>show());ui.actions.addAction('contractsLink',()=>show(true));
  ui.actions.addAction('contractsPending',()=>{
    const container=document.createElement('div');container.style.padding='12px';
    const inputs:{name:string;label:string;placeholder:string}[]=[{name:'method',label:'Método previsto',placeholder:'GET'},{name:'path',label:'Ruta prevista',placeholder:'/pendiente'},{name:'purpose',label:'Propósito de la operación',placeholder:'Validar una solicitud ficticia'}];
    const fields=inputs.map(item=>{const label=document.createElement('label');label.textContent=item.label;const input=document.createElement('input');input.setAttribute('aria-label',item.label);input.placeholder=item.placeholder;input.style.cssText='display:block;width:100%;margin:4px 0 12px;box-sizing:border-box;';label.append(input);container.append(label);return input;});
    const create=document.createElement('button');create.className='geBtn';create.textContent='Crear pendiente';
    create.onclick=()=>{
      const [method,path,purpose]=fields.map(input=>input.value.trim());
      const label=`Pendiente de contrato\n${method.toUpperCase()} ${path}\n${purpose}`;
      const value=mxUtils.createXmlDocument().createElement('UserObject');
      for(const [key,data]of Object.entries({label,contractState:'pending',plannedMethod:method.toUpperCase(),plannedPath:path,authorPurpose:purpose,authorInitialLabel:label}))value.setAttribute(key,data);
      const point=graph.getFreeInsertPoint();
      model.beginUpdate();let cell;
      try{
        cell=graph.insertVertex(graph.getDefaultParent(),null,value,point.x,point.y,300,110,'rounded=1;whiteSpace=wrap;html=0;fillColor=#fff2cc;strokeColor=#d6b656;');
        makeComponentFigure(graph,cell,'Pendiente de contrato',method.toUpperCase(),path,'',purpose);
        graph.setAttributeForCell(cell,'authorInitialLabel',graph.convertValueToString(cell));
      }finally{model.endUpdate();}
      ui.hideDialog();graph.setSelectionCell(cell);
    };
    container.append(create);ui.showDialog(container,460,320,true,true);fields[0].focus();
  });
}
