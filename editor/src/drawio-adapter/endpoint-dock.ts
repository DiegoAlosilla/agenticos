import {apiBrowser} from '../catalog/api-browser';
import type {CatalogHandlers} from '../catalog/view';
import {contractStyles,el} from '../ui/styles';
import {readContract} from '../contracts/import';
import type {ContractModel,OperationView} from '../contracts/types';
import {addRevision,readRegistry,findRevision,REF_ATTRIBUTE,REGISTRY_ATTRIBUTE} from '../persistence/registry';
import {DRAFTS_ATTRIBUTE,assertDraftDocumentBudget} from '../persistence/drafts';
import type {Revision} from '../model/types';
import {RegistryAttributeChange} from './registry-change';
import {contractCell,selectionContractTarget} from './component-figure';
import {BIAN_REF_ATTRIBUTE} from '../bian/reference';
import {insertBianFigure} from './bian-figure';
import {installAuditPanel} from './audit-panel';
import {bianBrowser} from '../catalog/bian-browser';

declare const mxEvent:any;
const labels={contracts:'Contratos',bian:'BIAN',flow:'Recorrido'};
type DockTab=keyof typeof labels;
export interface EndpointDock{
  configure:(handlers:CatalogHandlers)=>void;
  imported:(contract:ContractModel,duplicate:boolean)=>void;
  showCatalog:(content?:HTMLElement,linkMode?:boolean)=>void;
  preview:(contract:ContractModel,operation:OperationView)=>void;
  reveal:()=>void;
  selectInserted:(cell:any)=>void;
  refresh:()=>void;
}
export function installEndpointDock(ui:any):EndpointDock{
  contractStyles();const graph=ui.editor.graph,native=ui.formatContainer,format=ui.format;
  const root=el('aside','','ct-native-contracts');root.setAttribute('aria-label','Panel de contratos');
  const panels={contracts:el('div','','ct-dock-pane'),bian:el('div','','ct-dock-pane'),flow:el('div','','ct-dock-pane')};
  for(const key of Object.keys(panels) as DockTab[]){
    const panel=panels[key];panel.id=`ct-dock-${key}`;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',`ct-tab-${key}`);root.append(panel);
  }
  // The native sidebar permits INPUT/SELECT but cancels TEXTAREA mouse focus
  // and text selection. Extend its instance hook only for our text areas.
  const isSelectionAllowed=ui.isSelectionAllowed;
  ui.isSelectionAllowed=function(event:Event){
    const target=event.target;
    return target instanceof HTMLTextAreaElement&&root.contains(target)||isSelectionAllowed.call(this,event);
  };
  let handlers:CatalogHandlers={insert:()=>{},bindDrag:()=>{}};
  const browser=apiBrowser({insert:(...args)=>handlers.insert(...args),insertAll:contract=>handlers.insertAll?.(contract),bindDrag:(...args)=>handlers.bindDrag(...args)},()=>ui.actions.get('contractsImport').funct(),async(raw,match)=>{
    const node=ui.fileNode;
    if(!node)throw Error('Cree o abra un diagrama antes de consultar el contrato.');
    const revision=raw as Revision;
    const before=node.getAttribute(REGISTRY_ATTRIBUTE),current=readRegistry(before);
    const bytes=new TextEncoder().encode(revision.snapshot);
    const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(sha256!==revision.sha256||sha256!==match.sha256||revision.revisionId!==`sha256:${sha256}`)throw Error('El contrato descargado no coincide con la revisión consultada.');
    if(ui.fileNode!==node||node.getAttribute(REGISTRY_ATTRIBUTE)!==before)throw Error('El documento cambió durante la consulta.');
    const existing=current.revisions.find(item=>item.sha256===sha256);
    const contract=readContract(existing??revision);
    const operation=contract.operations.find(item=>item.ref.method.toUpperCase()===match.method&&item.ref.path===match.path);
    if(!operation)throw Error('La operación elegida no existe en el contrato.');
    if(!existing){
      const updated=addRevision({...current,version:2},revision);
      assertDraftDocumentBudget(node.getAttribute(DRAFTS_ATTRIBUTE),updated);
      const model=graph.getModel();model.beginUpdate();
      try{model.execute(new RegistryAttributeChange(node,JSON.stringify(updated)));}finally{model.endUpdate();}
    }
    browser.select(contract,operation,true);
  });panels.contracts.append(browser.element);
  let active:DockTab|undefined,customContent:HTMLElement|undefined,suppressSelection=false;
  let tabs=new Map<DockTab,HTMLElement>(),bian:ReturnType<typeof bianBrowser>|undefined,lastReference='';
  const audit=installAuditPanel(ui);panels.flow.append(audit.element);
  const provenance=el('p','','ct-contract-source');provenance.hidden=true;panels.contracts.append(provenance);
  function contractContent(content=browser.element as HTMLElement){panels.contracts.replaceChildren(content,provenance);}
  function bianPanel(){
    if(!bian){
      bian=bianBrowser(()=>{open('contracts');tabs.get('contracts')?.focus();},reference=>{
        const cell=insertBianFigure(ui,reference);
        suppressSelection=true;try{graph.setSelectionCell(cell);graph.scrollCellToVisible(cell);}finally{suppressSelection=false;}
      });
      panels.bian.append(bian.element);
    }
    return bian;
  }
  function showBianSelection(cell=graph.getSelectionCell()){
    const saved=cell&&graph.getAttributeForCell(cell,BIAN_REF_ATTRIBUTE,'');
    const design=cell&&graph.getAttributeForCell(cell,'designBian','');
    const key=saved?`saved:${saved}`:design?`design:${design}`:'';
    if(key===lastReference)return;
    lastReference=key;
    if(key)bianPanel().selectReference(saved||design,!saved);
    else bian?.clearReference();
  }
  let cachedRaw:string|null|undefined,cachedNode:any,contracts:ContractModel[]=[];
  const resizer=el('div','','ct-contracts-resizer');resizer.tabIndex=0;resizer.title='Arrastra para ajustar el ancho · Flechas para ajustar con teclado';resizer.setAttribute('role','separator');resizer.setAttribute('aria-label','Ancho del panel de contratos');resizer.setAttribute('aria-orientation','vertical');
  let preferredWidth:number|undefined;
  const bounds=()=>({min:Math.min(300,window.innerWidth-40),max:Math.min(1000,window.innerWidth-40)});
  function resize(width:number){preferredWidth=Math.round(Math.max(bounds().min,Math.min(bounds().max,width)));size();}
  resizer.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();const start=event.clientX,width=native.getBoundingClientRect().width;resizer.setPointerCapture(event.pointerId);
    resizer.onpointermove=move=>resize(width+start-move.clientX);
    const finish=()=>{resizer.onpointermove=null;};resizer.onpointerup=finish;resizer.onlostpointercapture=finish;
  };
  resizer.onkeydown=event=>{const width=native.getBoundingClientRect().width;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();resize(width+(event.key==='ArrowLeft'?20:-20));}else if(event.key==='Home'||event.key==='End'){event.preventDefault();resize(event.key==='Home'?bounds().min:bounds().max);}};

  function sync(){
    const raw=ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE)??null,node=ui.fileNode;
    if(raw===cachedRaw&&node===cachedNode)return;
    if(node!==cachedNode){browser.reset();bian?.reset();lastReference='';provenance.hidden=true;}
    cachedRaw=raw;cachedNode=node;
    try{contracts=readRegistry(raw).revisions.map(readContract);browser.setContracts(contracts);}
    catch(error){cachedRaw=undefined;contracts=[];browser.setContracts([]);contractContent(el('p',error instanceof Error?error.message:String(error),'ct-api-empty'));root.dataset.contractUnavailable='true';return;}
    delete root.dataset.contractUnavailable;
    if(!customContent)contractContent();
  }
  function size(){
    native.classList.toggle('ct-contracts-wide',Boolean(active));
    const {min,max}=bounds(),width=Math.round(Math.max(min,Math.min(max,preferredWidth??Math.min(560,Math.max(300,window.innerWidth*.4)))));
    native.style.setProperty('--ct-panel-width',`${width}px`);resizer.hidden=!active;
    resizer.setAttribute('aria-valuemin',String(min));resizer.setAttribute('aria-valuemax',String(max));resizer.setAttribute('aria-valuenow',String(width));
  }
  function apply(){
    // Swagger's white document is isolated; extension controls follow the editor.
    root.style.setProperty('--ct-editor-scheme',document.body.classList.contains('geDarkMode')?'dark':'light');
    ui.container.classList.toggle('ct-contracts-open',Boolean(active)&&ui.formatWidth>0);
    const current=active?tabs.get(active):undefined;
    const header=tabs.get('contracts')?.parentElement;
    if(!header)return;
    if(current){for(const item of Array.from(header.children))item.classList.toggle('geActiveFormatTitle',item===current);}
    for(const [key,tab] of tabs){tab.setAttribute('aria-selected',String(key===active));panels[key].hidden=key!==active;}
    root.hidden=!active;
    if(active){for(const child of Array.from(native.children) as HTMLElement[])if(child!==header&&child!==root&&child!==resizer)child.style.display='none';}
    size();
  }
  function pauseViews(){browser.pause();bian?.pause();audit.pause();}
  function open(key:DockTab='contracts'){
    if(active!==key)pauseViews();
    active=key;sync();
    if(key==='bian'){bianPanel();showBianSelection();}
    if(ui.formatWidth===0)ui.actions.get('format').funct();
    if(!tabs.get(key)?.isConnected)format.immediateRefresh();apply();
  }
  // Extend the instance's native refresh; keep the upstream file and tab handlers
  // intact. Its clear() destroys native panels, so detach our persistent view first.
  const refresh=format.immediateRefresh;
  format.immediateRefresh=function(...args:any[]){
    if(native.offsetWidth===0)return refresh.apply(this,args);
    const focused=document.activeElement instanceof HTMLElement&&root.contains(document.activeElement)?document.activeElement:null;
    const scrolls=Array.from(root.querySelectorAll<HTMLElement>('.ct-swagger-scroll,.ct-bian-scroll,.ct-bian-list-scroll,.ct-audit-panel')).map(element=>({element,top:element.scrollTop}));
    root.remove();resizer.remove();const result=refresh.apply(this,args);
    const header=native.querySelector('.geFormatTitleContainer');
    if(header){
      for(const title of Array.from(header.children) as HTMLElement[]){
        title.addEventListener('click',()=>{pauseViews();active=undefined;customContent=undefined;root.hidden=true;ui.container.classList.remove('ct-contracts-open');for(const tab of tabs.values()){tab.classList.remove('geActiveFormatTitle');tab.setAttribute('aria-selected','false');}size();format.refresh();});
      }
      tabs=new Map();header.classList.add('ct-dock-tabs');
      header.classList.toggle('ct-dock-two-native',header.children.length===2);
      header.setAttribute('role','tablist');header.setAttribute('aria-label','Panel lateral');
      for(const key of Object.keys(labels) as DockTab[]){
        const tab=el('div','','geFormatTitle');tab.append(el('div',labels[key]));tab.id=`ct-tab-${key}`;tab.title=labels[key];tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panels[key].id);tab.tabIndex=0;
        tab.onclick=()=>{if(key==='contracts'){customContent=undefined;contractContent();}open(key);if(key==='bian')bian?.focus();};
        tab.onkeydown=event=>{
          if(event.key==='Enter'||event.key===' '){event.preventDefault();tab.click();}
          if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
            const keys=Object.keys(labels) as DockTab[];
            const index=(keys.indexOf(key)+(event.key==='ArrowLeft'?keys.length-1:1))%keys.length;
            event.preventDefault();tabs.get(keys[index])?.focus();
          }
        };
        tabs.set(key,tab);header.append(tab);
      }
      native.append(root,resizer);apply();
      if(active)for(const {element,top} of scrolls)element.scrollTop=top;
      if(active&&focused?.isConnected)focused.focus({preventScroll:true});
    }
    return result;
  };
  graph.getModel().addListener(mxEvent.CHANGE,()=>sync());
  function selectionChanged(clicked?:any){
    if(suppressSelection)return;
    const cells=graph.getSelectionCells();if(cells.length!==1){showBianSelection(null);return;}
    const cell=clicked??cells[0];
    provenance.hidden=true;
    try{
      sync();
      if(active==='bian')showBianSelection(cell);
      const saved=graph.getAttributeForCell(cell,BIAN_REF_ATTRIBUTE,'');
      if(saved){if(!active||active==='contracts')open('bian');return;}
      const target=selectionContractTarget(graph,cell);
      if(!target){
        if(!active&&(graph.getAttributeForCell(cell,'auditEvidence','')||graph.getAttributeForCell(cell,'auditFlow','')))open('flow');
        return;
      }
      const contract=contracts.find(item=>item.revision.apiId===target.ref.apiId&&item.revision.revisionId===target.ref.revisionId);
      if(!contract)throw new Error('Contrato no disponible: falta la revisión en este documento.');
      const operation=target.api?undefined:contract.operations.find(item=>item.ref.method===target.ref.method&&item.ref.path===target.ref.path);
      if(!target.api&&!operation)throw new Error('Contrato no disponible: operación ausente.');
      customContent=undefined;browser.select(contract,operation,true);contractContent();
      const raw=graph.getAttributeForCell(cell,'contractSource','');
      if(raw){
        try{const source=JSON.parse(raw);if(typeof source.commit==='string'&&typeof source.file==='string'){provenance.textContent=`Contrato Git · ${source.commit} · ${source.file}`;provenance.hidden=false;}}catch{/* Swagger remains available for an unreadable source. */}
      }
      if(!active)open();
    }catch(error){customContent=undefined;contractContent(el('p',error instanceof Error?error.message:String(error),'ct-api-empty'));if(!active)open();}
  }
  graph.getSelectionModel().addListener(mxEvent.CHANGE,()=>selectionChanged());
  graph.addListener(mxEvent.CLICK,(_sender:any,event:any)=>{const cell=event.getProperty('cell');if(cell)selectionChanged(cell);});
  ui.editor.addListener('fileLoaded',()=>{customContent=undefined;cachedNode=undefined;sync();});
  ui.editor.addListener('pageSelected',()=>{sync();if(active==='bian')showBianSelection();});
  ui.addListener('formatWidthChanged',()=>{if(ui.formatWidth===0)pauseViews();ui.container.classList.toggle('ct-contracts-open',Boolean(active)&&ui.formatWidth>0);size();});
  window.addEventListener('resize',size);
  let dimensions='';new ResizeObserver(()=>{const next=`${ui.diagramContainer.clientWidth}:${ui.diagramContainer.clientHeight}`;if(next!==dimensions){dimensions=next;graph.sizeDidChange();}}).observe(ui.diagramContainer);
  sync();format.refresh();
  return {
    configure(next){handlers=next;},
    selectInserted(cell){suppressSelection=true;try{graph.setSelectionCell(cell);graph.scrollCellToVisible(cell);}finally{suppressSelection=false;}},
    imported(contract,duplicate){customContent=undefined;sync();browser.imported(contract,duplicate);provenance.hidden=true;contractContent();open();},
    showCatalog(content,linkMode=false){customContent=linkMode?content:undefined;provenance.hidden=true;contractContent(customContent);open();},
    preview(contract,operation){customContent=undefined;browser.select(contract,operation);provenance.hidden=true;contractContent();open();},
    reveal(){
      customContent=undefined;sync();contractContent();
      const cell=contractCell(graph,graph.getSelectionCell()),raw=cell&&graph.getAttributeForCell(cell,REF_ATTRIBUTE,'');
      if(raw){try{const ref=JSON.parse(raw),contract=contracts.find(item=>item.revision.apiId===ref.apiId&&item.revision.revisionId===ref.revisionId)??readContract(findRevision(readRegistry(ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE)),ref));const operation=contract.operations.find(item=>item.ref.method===ref.method&&item.ref.path===ref.path);if(!operation)throw Error('Contrato no disponible: operación ausente.');browser.select(contract,operation);}catch(error){contractContent(el('p',`Contrato no disponible: ${error instanceof Error?error.message:String(error)}`,'ct-api-empty'));}}
      open();
    },
    refresh(){cachedRaw=undefined;sync();},
  };
}
