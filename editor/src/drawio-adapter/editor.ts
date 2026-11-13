import {createDemo} from '../contracts/demo';
import {readContract} from '../contracts/import';
import {addRevision, findRevision, readRegistry, REF_ATTRIBUTE, REGISTRY_ATTRIBUTE} from '../persistence/registry';
import {registerImport} from './import-action';
import {RegistryAttributeChange} from './registry-change';
import {registerCatalog} from './catalog-actions';
import {installCopyGuard} from './copy-guard';
import {contractCell,makeComponentFigure} from './component-figure';
import {errorElement} from '../catalog/error';
import {installEndpointDock} from './endpoint-dock';

// Unstable editor types stay at this boundary. Domain modules do not import them.
declare const mxResources: any;
declare const mxEvent: any;
declare const mxUtils: any;
declare const LocalFile: any;

export function install(ui: any): void {
  const graph = ui.editor.graph;
  const model = graph.getModel();
  mxResources.parse('contractsDemo=Insertar endpoint ficticio\ncontractsInspect=Panel de endpoint\ncontractsSave=Guardar prueba portable\ncontractsOpen=Abrir prueba portable\ncontractsImport=Importar contrato');
  const report = (error: unknown) => {
    const container=document.createElement('div');container.className='ct ct-dialog';const message=errorElement(error);
    const close=document.createElement('button');close.className='ct-button';close.textContent='OK';close.onclick=()=>ui.hideDialog();const footer=document.createElement('div');footer.className='ct-dialog-footer';footer.append(close);
    container.append(message,footer);ui.showDialog(container,Math.min(720,document.documentElement.clientWidth-50),Math.min(580,document.documentElement.clientHeight-80),true,true);message.querySelector<HTMLElement>('[role=alert]')?.focus();
  };
  mxResources.parse('contractsCatalog=Catálogo de contratos\ncontractsPending=Crear operación pendiente\ncontractsLink=Vincular contrato');
  const dock=installEndpointDock(ui);
  registerCatalog(ui,report,dock);
  registerImport(ui,report,(contract,duplicate)=>dock.imported(contract,duplicate));
  installCopyGuard(ui,report);
  function registry() { return readRegistry(ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE) ?? null); }
  ui.actions.addAction('contractsDemo', async () => {
    try {
      if (!ui.fileNode) throw new Error('Cree o abra un diagrama antes de insertar la prueba.');
      const node = ui.fileNode;
      const {revision, ref, docs} = await createDemo();
      if (ui.fileNode !== node) throw new Error('El documento cambió; vuelva a insertar la prueba.');
      const current = registry();
      const activeRevision=current.revisions.find(existing=>existing.sha256===revision.sha256)??revision;
      const activeRef={...ref,apiId:activeRevision.apiId,revisionId:activeRevision.revisionId};
      const updated = addRevision(current, activeRevision);
      model.beginUpdate();
      let cell;
      try {
        if (updated !== current) model.execute(new RegistryAttributeChange(node, JSON.stringify(updated)));
        const value = mxUtils.createXmlDocument().createElement('UserObject');
        value.setAttribute('label', `${docs.api}\n${ref.method} ${ref.path}\n${docs.summary}`);
        value.setAttribute('contractState', 'linked');
        value.setAttribute(REF_ATTRIBUTE, JSON.stringify(activeRef));
        // Each clone receives a fresh mxCell id; that id identifies the visual instance.
        cell = graph.insertVertex(graph.getDefaultParent(), null, value, 100, 100, 300, 110,
          'rounded=1;whiteSpace=wrap;html=0;fillColor=#dae8fc;strokeColor=#6c8ebf;fontSize=14;');
        makeComponentFigure(graph,cell,docs.api,ref.method,ref.path);
      } finally { model.endUpdate(); }
      graph.setSelectionCell(cell);
      graph.scrollCellToVisible(cell);
    } catch (error) { report(error); }
  });
  ui.actions.addAction('contractsInspect',()=>dock.reveal());
  mxResources.parse('contractsComponent=Usar figura de componente');
  ui.actions.addAction('contractsComponent',()=>{
    try{
      const cell=contractCell(graph,graph.getSelectionCell());
      if(!cell||!graph.getAttributeForCell(cell,'contractState',''))throw new Error('Seleccione una operación vinculada o pendiente.');
      const ref=graph.getAttributeForCell(cell,REF_ATTRIBUTE,'');
      const classification=graph.getAttributeForCell(cell,'contractClassification','');
      if(ref){
        const reference=JSON.parse(ref),contract=readContract(findRevision(registry(),reference));
        makeComponentFigure(graph,cell,contract.title,reference.method,reference.path,classification);
      }else makeComponentFigure(graph,cell,'Pendiente de contrato',graph.getAttributeForCell(cell,'plannedMethod',''),graph.getAttributeForCell(cell,'plannedPath',''),classification,graph.getAttributeForCell(cell,'authorPurpose',''));
      graph.setSelectionCell(cell);
    }catch(error){report(error);}
  });
  ui.actions.addAction('contractsSave', () => {
    // Preserve unknown registry versions verbatim. Native serializer owns the XML.
    const data = ui.getFileData(true);
    const url = URL.createObjectURL(new Blob([data], {type: 'application/xml'}));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'prueba-ficticia.drawio';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  ui.actions.addAction('contractsOpen', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.drawio,.xml';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) return;
        const load = async () => {
          try {
            const data = ui.validateFileData(await file.text());
            ui.fileLoaded(new LocalFile(ui, data, file.name, true));
            try { registry(); } catch (error) { report(error); }
          } catch (error) { report(error); }
        };
        if (ui.editor.modified && !ui.isDiagramEmpty()) ui.confirm('Abrir reemplazará el diagrama actual. Guarde sus cambios antes de continuar.', load);
        else await load();
      } catch (error) { report(error); }
    };
    input.click();
  });
  if (ui.menus && !ui.editor.isChromelessView()) {
    ui.menus.addPluginMenuItems('extras', ['-', 'contractsImport', 'contractsCatalog', 'contractsPending', 'contractsLink', 'contractsComponent', 'contractsDemo', 'contractsInspect', 'contractsSave', 'contractsOpen']);

  }
  ui.editor.addListener('fileLoaded', () => { try { registry(); } catch (error) { report(error); } });
}
