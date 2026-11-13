import path from 'node:path';
import {atomicWrite, writeJson} from './io.js';
import {sessionPath} from './orchestration.mjs';
import {renderDrawio} from './drawio.mjs';

export const orchestrationMap = {
  name: 'Agenticos · De la petición a un diseño revisado', source: 'context',
  nodes: [
    ['entry', 'Petición del usuario', 'Historia, reglas y respuestas', 'external', 40, 85],
    ['skill', 'Skill canal-diseno', 'AGENTS.md → protocolo', 'service', 360, 85],
    ['coordinator', 'Coordinador Node.js', 'Estado, revisión, turno y límites', 'service', 680, 85],
    ['store', 'Sesión en runs/', 'r000001… · estado + evidencias', 'database', 1000, 85],
    ['discovery', 'Discovery-agent', 'Entrevista y criterios de aceptación', 'service', 40, 335],
    ['architecture', 'Architecture-agent', 'Responsabilidades, flujo y estado', 'service', 360, 335],
    ['contract', 'Contract-agent', 'Interfaces y mapeos de datos', 'service', 680, 335],
    ['reviewer', 'Reviewer-agent', 'Semántica, cobertura y hallazgos', 'service', 1000, 335],
    ['catalog', 'Catálogo Git + BIAN', 'search · operation · bian (lectura)', 'database', 40, 585],
    ['build', 'Generador + validadores', 'buildChannel(spec) · OpenAPI', 'service', 360, 585],
    ['artifacts', 'Entrega de la revisión', 'spec · OpenAPI · Draw.io · SHA-256', 'database', 680, 585],
    ['result', 'Resultado', 'ready / draft / needs_attention', 'external', 1000, 585],
  ].map(([id, name, detail, type, x, y]) => ({id, name, detail, type, x, y})),
  edges: [], flows: [],
};
function flow(id, name, steps) {
  orchestrationMap.flows.push({id, name, steps: steps.map(([source, target, label, detail], index) => {
    const edgeId = `${id}-${index + 1}`;
    orchestrationMap.edges.push({id: edgeId, source, target, label, detail, protocol: 'Host / CLI local', animated: true, kind: 'sync'});
    return edgeId;
  })});
}
flow('principal', '01 · Recorrido principal', [
  ['entry', 'skill', '1. Interpretar la petición', 'AGENTS.md activa canal-diseno. La skill carga el protocolo y los archivos de rol; no es un proceso autónomo.'],
  ['skill', 'coordinator', '2. Iniciar la sesión', 'El host ejecuta npm run orchestrate -- init. El CLI crea una sesión; next devuelve el rol y su contexto.'],
  ['coordinator', 'store', '3. Guardar la solicitud original', 'Cada entrega crea una revisión inmutable con huella y referencia a la revisión anterior. Los datos de sesión permanecen en runs/.'],
  ['coordinator', 'discovery', '4. Ejecutar Discovery', 'El host aplica discovery.agent.md: entrevista progresiva, requisitos, decisiones, criterios y preguntas. Puede ejecutar el rol en contexto separado si dispone de subagentes.'],
  ['discovery', 'entry', '5. Aclarar decisiones de negocio', 'Las preguntas bloqueantes pasan a awaiting_user. Solo una respuesta real del usuario permite retomar el descubrimiento.'],
  ['entry', 'coordinator', '6. Registrar respuestas', 'answer guarda la respuesta. Discovery consolida la línea base y submit valida su estructura antes de habilitar Architecture.'],
  ['coordinator', 'architecture', '7. Diseñar responsabilidades y flujo', 'Architecture recibe la línea base, define límites y escenarios y enlaza requisitos, decisiones, etapas y criterios.'],
  ['architecture', 'catalog', '8. Consultar evidencia', 'El host usa channel search / operation / bian. Las operaciones reutilizadas conservan commit, método, ruta y SHA-256; las ausentes siguen pendientes.'],
  ['architecture', 'coordinator', '9. Entregar el modelo', 'submit --role architecture guarda spec y trazabilidad. El coordinador comprueba referencias y cobertura estructural.'],
  ['coordinator', 'contract', '10. Detallar interfaces', 'Contract refina operation, components, security y mapping. Un cambio en la estructura del flujo se deriva a Architecture.'],
  ['contract', 'coordinator', '11. Entregar contratos propuestos', 'El host entrega JSON mediante submit --role contract con la revisión esperada. Las entregas obsoletas o fuera de turno se rechazan.'],
  ['coordinator', 'build', '12. Validar y generar', 'El script llama buildChannel. Verifica esquemas OpenAPI, referencias Git, huellas y escenarios. Un error devuelve la tarea a Contract.'],
  ['build', 'artifacts', '13. Congelar los artefactos', 'La misma spec produce OpenAPI y Draw.io. El manifiesto registra las huellas de los archivos de esa revisión.'],
  ['coordinator', 'reviewer', '14. Revisar el diseño', 'Reviewer recibe la petición original, respuestas, línea base, trazas y artefactos. Contrasta cada criterio y reporta evidencia; no cambia reglas de negocio.'],
  ['reviewer', 'coordinator', '15. Entregar la revisión', 'submit verifica baselineVersion, artifactDigest, cobertura y cierres de hallazgos previos. La revisión semántica sigue siendo responsabilidad del agente.'],
  ['coordinator', 'result', '16. Clasificar el resultado', 'Sin bloqueantes y sin pendientes: ready. Con supuestos, decisiones abiertas o hallazgos menores: draft. El host presenta y abre los archivos.'],
]);
flow('correction', '02 · Corrección técnica', [
  ['reviewer', 'coordinator', '1. Reportar una discrepancia', 'El hallazgo incluye código estable, destino, evidencia, severidad, responsable y condición de cierre.'],
  ['coordinator', 'architecture', '2. Corregir responsabilidades', 'Si hay un bloqueante de arquitectura, se revisa primero el modelo. Las observaciones permanecen abiertas hasta una nueva revisión.'],
  ['architecture', 'coordinator', '3. Registrar nueva propuesta', 'La entrega crea otra revisión. Los artefactos previos permanecen disponibles y ya no sirven para aprobar la propuesta nueva.'],
  ['coordinator', 'contract', '4. Ajustar interfaces', 'Contract adapta los contratos al modelo corregido. También puede derivar a Architecture si descubre una dependencia imposible.'],
  ['contract', 'coordinator', '5. Entregar ajustes', 'El coordinador comprueba la revisión esperada y la estructura de la arquitectura.'],
  ['coordinator', 'build', '6. Repetir validaciones', 'Solo se revisan artefactos generados desde la versión corregida.'],
  ['build', 'artifacts', '7. Generar nuevas huellas', 'La revisión anterior no se sobrescribe.'],
  ['coordinator', 'reviewer', '8. Verificar el cierre', 'El revisor debe explicar con evidencia el cierre de cada bloqueante anterior.'],
]);
flow('decision', '03 · Decisión del usuario', [
  ['contract', 'coordinator', '1. Detectar ambigüedad de negocio', 'handoff a discovery explica la decisión que falta; los agentes no inventan una regla para hacer pasar la revisión.'],
  ['coordinator', 'entry', '2. Esperar la respuesta', 'Estado awaiting_user. next no asigna trabajo dependiente mientras falta una respuesta.'],
  ['entry', 'coordinator', '3. Registrar una decisión real', 'El host usa answer con el contenido recibido. La respuesta queda en el historial.'],
  ['coordinator', 'discovery', '4. Revisar la línea base', 'Discovery consolida una nueva versión; Architecture y Contract deben regenerar sus entregas.'],
]);
flow('limit', '04 · Límite de iteraciones', [
  ['reviewer', 'coordinator', '1. Repetir un bloqueante', 'El coordinador cuenta códigos y destinos estables, rondas y entregas. Los límites son configurables al crear la sesión.'],
  ['coordinator', 'store', '2. Conservar evidencia', 'Se preservan el hallazgo, los intentos, los artefactos y la causa de la detención.'],
  ['coordinator', 'result', '3. Detener la ejecución', 'needs_attention evita un bucle infinito. No equivale a éxito; el host presenta el problema y espera una decisión para reabrir.'],
]);

function drawio() {
  const nodes = orchestrationMap.nodes;
  const endpoints = orchestrationMap.flows.map(flow => ({id: 'entry', pageName: flow.name, label: 'Petición del usuario\nHistoria, reglas y respuestas',
    decisions: [], findings: [], dependencies: nodes.filter(node => node.id !== 'entry').map(node => ({id: node.id, label: `${node.name}\n${node.detail}`,
      kind: node.type === 'database' ? 'database' : 'service', decisions: []})),
    steps: flow.steps.map(id => orchestrationMap.edges.find(edge => edge.id === id)).map((edge, index) => ({from: edge.source, to: edge.target, direction: 'request', label: edge.label.replace(/^\d+\.\s*/, ''), displayLabel: String(index + 1), decisions: [{id: edge.id, text: edge.detail}]})),
  }));
  // Each page shares a layout, while its auditFlow encodes a different playable scenario.
  return renderDrawio({design: true, registry: {version: 2, revisions: []}, endpoints: endpoints.map((endpoint, index) => ({...endpoint, id: `entry-${index}`,
    steps: endpoint.steps.map(step => ({...step, from: step.from === 'entry' ? `entry-${index}` : step.from, to: step.to === 'entry' ? `entry-${index}` : step.to}))}))},
  {layout: {nodeWidth: 270, pages: Object.fromEntries(endpoints.map((_, index) => [`entry-${index}`, {
    positions: Object.fromEntries(nodes.map(node => [node.id === 'entry' ? `entry-${index}` : node.id, [node.x, node.y]])),
    bands: [{id: 'host-band', label: 'Control', x: 10, y: 25, width: 1300, height: 180},
      {id: 'agent-band', label: 'Agentes', x: 10, y: 275, width: 1300, height: 180},
      {id: 'tool-band', label: 'Herramientas', x: 10, y: 525, width: 1300, height: 180}],
  }]))}});
}

function html() {
  const data = JSON.stringify(orchestrationMap).replaceAll('<', '\\u003c');
  return `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Agenticos · Orquestación de diseño</title><style>
:root{font-family:Segoe UI,system-ui,sans-serif;color:#172b39;background:#f1f4f2}*{box-sizing:border-box}body{margin:0}header{padding:28px 36px 18px;border-bottom:1px solid #ced9d5;background:#fff}header p{margin:7px 0;color:#526774;max-width:950px;font-size:15px}h1{font-size:28px;letter-spacing:-.8px;margin:0}.eyebrow{font:700 11px Consolas,monospace;color:#007a66;letter-spacing:2px;margin-bottom:12px}nav{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}button,select{font:600 13px Segoe UI;padding:10px 15px;border:1px solid #b9ccc4;border-radius:7px;background:white;color:#203d35;cursor:pointer}button[aria-pressed=true],#play{background:#066954;color:white;border-color:#066954}button:focus-visible,select:focus-visible{outline:3px solid #d09d29;outline-offset:2px}main{display:grid;grid-template-columns:minmax(700px,1fr) 340px;gap:20px;padding:24px 30px}.canvas{background:white;border:1px solid #d8e1dc;border-radius:12px;overflow:auto}svg{display:block;width:100%;min-width:700px}.band{fill:#f7f9f8;stroke:#dbe3df}.lane{font:600 13px Segoe UI;fill:#526d60}.node rect{fill:white;stroke:#bed0c7;stroke-width:1.5}.node.active rect{stroke:#00785b;stroke-width:3;fill:#e8f7ee}.node.source rect{stroke:#c48720;stroke-width:2}.name{font:700 16px Segoe UI;fill:#193b2d}.detail{font:12px Segoe UI;fill:#50695d}.tag{font:700 10px Consolas;fill:#6c8076;letter-spacing:1px}#path{fill:none;stroke:#0a9671;stroke-width:3;stroke-dasharray:9 5;animation:flow 1s linear infinite}#path.paused{animation-play-state:paused}@keyframes flow{to{stroke-dashoffset:-28}}aside{background:#102f28;color:#ecf7f0;border-radius:12px;padding:24px;align-self:start;min-height:440px}aside h2{font-size:23px;line-height:1.25;margin:18px 0}aside p{font-size:16px;line-height:1.65;color:#c3dbcf}.counter{font:12px Consolas;letter-spacing:1px;color:#8ee1b3}.controls{display:flex;gap:7px;flex-wrap:wrap;margin:20px 0 8px}.controls button{font-size:12px;padding:10px}.progress{height:4px;background:#305346;border-radius:9px;margin-top:24px}.progress div{height:4px;background:#7ed6a1;transition:width .2s}.note{font-size:12px!important;color:#abc2b7!important;margin-top:25px}.footer{padding:0 34px 24px;color:#51665b;font-size:13px}a{color:inherit}@media(max-width:1100px){main{grid-template-columns:1fr;padding:15px}aside{min-height:0}header{padding:22px}h1{font-size:24px}}@media(prefers-reduced-motion:reduce){#path{animation:none}.progress div{transition:none}}
</style><header><div class="eyebrow">AGENTICOS / GUÍA DE EJECUCIÓN</div><h1>De la petición a un diseño revisado</h1><p>Cuatro roles, una especificación versionada y un coordinador que controla cada entrega. Explora el recorrido principal y sus alternativas.</p><nav aria-label="Escenarios" id="flows"></nav></header>
<main><section class="canvas" aria-label="Diagrama de orquestación"><svg viewBox="0 0 1320 750" role="img" aria-label="Agentes, skill, coordinador, herramientas y artefactos"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#0a9671"/></marker></defs><g id="bands"></g><path id="path" marker-end="url(#arrow)"/><g id="nodes"></g></svg></section>
<aside aria-live="polite"><div class="counter" id="counter"></div><h2 id="title"></h2><p id="description"></p><div class="progress"><div id="progress"></div></div><div class="controls"><button id="previous" aria-label="Paso anterior">← Anterior</button><button id="play">Reproducir</button><button id="next" aria-label="Paso siguiente">Siguiente →</button><button id="reset">Reiniciar</button></div><label for="speed">Tiempo por paso </label><select id="speed"><option value="5500">5,5 s</option><option value="9000">9 s</option><option value="2500">2,5 s</option></select><p class="note">Recorrido explicativo de la implementación. No ejecuta agentes ni representa una sesión en vivo. La skill guía al host; Node.js controla el estado.</p></aside></main>
<div class="footer">Verde: destino actual · Ámbar: origen · <a href="orchestration.drawio" download>Descargar Draw.io</a> · <a href="orchestration.arquiflow.json" download>Modelo ArquiFlow</a> · En el fork de Draw.io: selecciona la petición y abre Recorrido → Reproducir.</div>
<script>const model=${data};
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
function el(name,attrs,text){const e=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text)e.textContent=text;return e}
[['Entrada · skill · control de ejecución',25],['Roles ejecutados por el host de agentes',275],['Herramientas deterministas · archivos locales',525]].forEach(([label,y])=>{$('bands').append(el('rect',{x:10,y,width:1300,height:180,rx:10,class:'band'}),el('text',{x:30,y:y+28,class:'lane'},label))});
model.nodes.forEach(n=>{const g=el('g',{id:'node-'+n.id,class:'node',transform:'translate('+n.x+' '+n.y+')'});g.append(el('rect',{width:270,height:100,rx:8}),el('text',{x:15,y:22,class:'tag'},['discovery','architecture','contract','reviewer'].includes(n.id)?'AGENTE':n.id==='skill'?'INSTRUCCIONES':n.id==='coordinator'?'SCRIPT / CLI':'ENTRADA · HERRAMIENTA · ARCHIVO'),el('text',{x:15,y:48,class:'name'},n.name),el('text',{x:15,y:73,class:'detail'},n.detail));$('nodes').append(g)});
let selected=0,index=0,timer=null;
model.flows.forEach((f,i)=>{const b=document.createElement('button');b.textContent=f.name;b.onclick=()=>{stop();selected=i;index=0;render()};$('flows').append(b)});
function render(){const f=model.flows[selected],edge=model.edges.find(e=>e.id===f.steps[index]);const a=model.nodes.find(n=>n.id===edge.source),b=model.nodes.find(n=>n.id===edge.target);document.querySelectorAll('.node').forEach(e=>e.setAttribute('class','node'));$('node-'+a.id).classList.add('source');$('node-'+b.id).classList.add('active');let x1=a.x+135,y1=a.y+50,x2=b.x+135,y2=b.y+50;if(a.y===b.y){x1+=Math.sign(x2-x1)*135;x2-=Math.sign(x2-x1)*135}else{y1+=Math.sign(y2-y1)*50;y2-=Math.sign(y2-y1)*50}const mid=(y1+y2)/2;$('path').setAttribute('d','M '+x1+' '+y1+' C '+x1+' '+mid+', '+x2+' '+mid+', '+x2+' '+y2);$('counter').textContent='PASO '+String(index+1).padStart(2,'0')+' / '+f.steps.length;$('title').textContent=edge.label;$('description').textContent=edge.detail;$('progress').style.width=((index+1)/f.steps.length*100)+'%';[...$('flows').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===selected)));$('path').classList.toggle('paused',!timer)}
function stop(){clearInterval(timer);timer=null;$('play').textContent='Reproducir';$('path').classList.add('paused')}
function play(){if(timer){stop();return}if(index===model.flows[selected].steps.length-1)index=0;timer=setInterval(()=>{if(index>=model.flows[selected].steps.length-1){stop();return}index++;render()},Number($('speed').value));$('play').textContent='Pausar';render()}
$('play').onclick=play;$('next').onclick=()=>{stop();index=Math.min(index+1,model.flows[selected].steps.length-1);render()};$('previous').onclick=()=>{stop();index=Math.max(0,index-1);render()};$('reset').onclick=()=>{stop();index=0;render()};$('speed').onchange=()=>{if(timer){stop();play()}};render();
</script></html>`;
}

export async function writeOrchestrationDiagram(out) {
  const root = await sessionPath(out);
  const files = {html: path.join(root, 'index.html'), drawio: path.join(root, 'orchestration.drawio'), model: path.join(root, 'orchestration.arquiflow.json')};
  await atomicWrite(files.html, html());
  await atomicWrite(files.drawio, drawio());
  await writeJson(files.model, orchestrationMap);
  return files;
}
