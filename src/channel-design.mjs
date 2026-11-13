import {mkdir, mkdtemp, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import {stringify} from 'yaml';
import {atomicWrite, hash, lockRun, writeJson} from './io.js';
import {renderDrawio} from './drawio.mjs';
import {channelBian, channelCatalog, contractsCore} from './channel-catalog.mjs';

const verbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'];
const idPattern = /^[a-z][a-z0-9-]{0,79}$/;
const nodeWidth = 280;
const callSpacing = 310;
const bandX = 22;
const channelRows = ['Frontend', 'APIM', 'MS en AKS', 'Business / Capa Producto'];

function fitLabel(label) {
  const lines = [];
  const measure = character => /[ilI1 .,:;|!'/{}]/u.test(character) ? 6 : /[\p{Script=Han}\p{Extended_Pictographic}WM@%]/u.test(character) ? 16 : 10;
  for (const paragraph of label.split(/\r?\n/)) {
    let line = '', width = 0;
    for (const token of paragraph.match(/[^\s/_.-]+[\/_.-]?|./gu) ?? []) {
      const characters = [...token];
      const tokenWidth = characters.reduce((total, character) => total + measure(character), 0);
      if (line && width + tokenWidth > 222) {
        lines.push(line.trimEnd());
        line = '';
        width = 0;
      }
      for (const character of characters) {
        if (!line && character === ' ') continue;
        const size = measure(character);
        if (width + size > 222) {
          lines.push(line.trimEnd());
          line = '';
          width = 0;
        }
        line += character;
        width += size;
      }
    }
    lines.push(line.trimEnd());
  }
  return {label: lines.join('\n'), height: Math.max(100, lines.length * 19 + 30)};
}

function implementation(value, fallback, field) {
  if (value == null) return fallback;
  requireValue(['new', 'existing'].includes(value), `${field} debe ser new o existing.`);
  return value;
}

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

function text(value, label, max = 3000) {
  requireValue(typeof value === 'string' && value.trim() && value.length <= max, `Completa ${label} (máximo ${max} caracteres).`);
  return value.trim();
}

function array(value, label, max, min = 0) {
  requireValue(Array.isArray(value) && value.length >= min && value.length <= max, `${label} debe tener entre ${min} y ${max} elementos.`);
  return value;
}

function uniqueId(value, seen, label) {
  requireValue(typeof value === 'string' && idPattern.test(value) && !seen.has(value), `Identificador de ${label} inválido o repetido: ${value}.`);
  seen.add(value);
  return value;
}

function bullets(items) {
  return items.length ? items.map(item => `- ${item}`) : ['- Ninguno registrado.'];
}

export async function buildChannel(input, {repo, ref} = {}) {
  requireValue(input?.version === 1, 'La spec debe declarar version: 1.');
  const project = text(input.project, 'project', 120), frontend = text(input.frontend, 'frontend', 120);
  const goal = text(input.goal, 'goal');
  const questions = array(input.pending ?? [], 'pending', 60).map(item => text(item, 'pendiente'));
  const decisions = array(input.decisions, 'decisions', 60, 1).map((item, i) => ({id: `D${i + 1}`, text: text(item, 'decisión')}));
  const bian = await channelBian();
  const core = await contractsCore();
  const services = new Map(), serviceIds = new Set(), stageIds = new Set(), registry = new Map(), resolved = new Map();
  const contracts = new Map();
  let catalog;
  if (ref) requireValue(ref === input.catalogCommit, '--ref debe coincidir con catalogCommit de la spec.');
  for (const service of array(input.services, 'services', 12, 1)) {
    const id = uniqueId(service?.id, serviceIds, 'servicio UX');
    services.set(id, {title: text(service.title, `${id}.title`, 120), responsibility: text(service.responsibility, `${id}.responsibility`),
      status: implementation(service.status, 'new', `${id}.status`), components: service.components, security: service.security, paths: {}});
  }

  for (const stage of array(input.stages, 'stages', 25, 1)) {
    const id = uniqueId(stage?.id, stageIds, 'etapa');
    const title = text(stage.title, `${id}.title`, 120), purpose = text(stage.purpose, `${id}.purpose`);
    const service = services.get(stage.service);
    requireValue(service, `Servicio UX desconocido en ${id}.`);
    const frontendStatus = implementation(stage.frontendStatus, 'existing', `${id}.frontendStatus`);
    const apimStatus = implementation(stage.apimStatus, 'new', `${id}.apimStatus`);
    const stageDecisions = [{id, text: purpose}, ...array(stage.rules ?? [], `${id}.rules`, 20).map((rule, i) => ({id: `${id}-${i + 1}`, text: text(rule, 'regla')}))];
    const method = stage.operation?.method, route = stage.operation?.path;
    requireValue(verbs.includes(method) && typeof route === 'string' && /^\/[a-zA-Z0-9_{}./-]+$/.test(route) && route.length <= 160, `Método o ruta UX inválidos en ${id}.`);
    const bianRef = stage.bian ? bian.find(stage.bian) : null;
    if (!bianRef) questions.push(`${title}: confirmar dominio y operación BIAN.`);
    else requireValue(route.split('/').at(-1)?.toLowerCase() === bianRef.action.toLowerCase(), `La ruta UX de ${id} debe terminar en la acción BIAN ${bianRef.action}.`);
    const responses = stage.operation.responses;
    requireValue(responses && typeof responses === 'object' && !Array.isArray(responses) && Object.keys(responses).length, `Declara las respuestas acordadas de ${id}.`);
    const success = stage.success;
    requireValue(typeof success === 'string' && /^2[0-9][0-9]$/.test(success) && Object.hasOwn(responses, success), `Declara el código de éxito de ${id}.`);
    const pathItem = service.paths[route] ??= {};
    const verb = method.toLowerCase();
    requireValue(!pathItem[verb], `Operación UX duplicada en ${stage.service}: ${method} ${route}.`);
    pathItem[verb] = {operationId: id.replace(/-([a-z0-9])/g, (_, letter) => letter.toUpperCase()), summary: title, description: purpose,
      ...(bianRef && {'x-bian-reference': bianRef}),
      ...(stage.operation.parameters && {parameters: stage.operation.parameters}),
      ...(stage.operation.requestBody && {requestBody: stage.operation.requestBody}),
      ...(stage.operation.security && {security: stage.operation.security}), responses};
    const calls = [];
    for (const call of array(stage.calls ?? [], `${id}.calls`, 12)) {
      const label = text(call?.purpose, `${id}.calls.purpose`, 160);
      requireValue(['Business', 'Producto'].includes(call.layer), `Capa desconocida en ${id}: ${call.layer}.`);
      if (call.pending) {
        requireValue(!call.contract, `La dependencia pendiente ${label} no puede incluir una referencia confirmada.`);
        const pending = text(call.pending, `${id}.calls.pending`);
        questions.push(`${title}: ${pending}`);
        calls.push({label, layer: call.layer, pending, status: implementation(call.status, 'pending', `${id}.calls.status`)});
        continue;
      }
      const reference = call.contract;
      requireValue(typeof input.catalogCommit === 'string' && /^[a-f0-9]{40,64}$/.test(input.catalogCommit), 'Para confirmar consumos guarda el catalogCommit devuelto por la búsqueda.');
      requireValue(typeof reference?.file === 'string' && verbs.includes(reference.method) && typeof reference.path === 'string', `Falta contrato exacto para ${label}.`);
      catalog ??= await channelCatalog(repo, input.catalogCommit);
      const {contract, selected} = await catalog.operation(reference.file, reference.method, reference.path);
      requireValue(reference.sha256 === contract.revision.sha256, `La huella de ${reference.file} no coincide con el contrato elegido.`);
      registry.set(contract.revision.sha256, registry.get(contract.revision.sha256) ?? contract.revision);
      const active = registry.get(contract.revision.sha256);
      const operationRef = {...selected.ref, apiId: active.apiId, revisionId: active.revisionId};
      const outcome = text(call.outcome, `respuesta esperada de ${label}`, 160);
      const mapping = array(call.mapping ?? [], `${id}.calls.mapping`, 30).map(item => `${text(item?.from, 'campo fuente', 120)} → ${text(item?.to, 'campo destino', 120)}`);
      calls.push({label, layer: call.layer, reference, operationRef, outcome, mapping, service: contract.title, version: contract.declaredVersion});
    }
    resolved.set(id, {id, title, purpose, serviceId: stage.service, service, frontendStatus, apimStatus, method, route, bianRef, calls, success, responses, decisions: stageDecisions});
  }

  for (const [id, service] of services) {
    requireValue(Object.keys(service.paths).length, `El servicio UX ${id} no tiene operaciones.`);
    const snapshot = stringify({openapi: '3.1.0', info: {title: service.title, version: '0.1.0', description: service.responsibility},
      'x-design-status': 'proposed', paths: service.paths, ...(service.components && {components: service.components}), ...(service.security && {security: service.security})});
    const sha256 = hash(snapshot);
    const revision = {apiId: `channel-${id}`, revisionId: `sha256:${sha256}`, sha256, format: 'yaml', snapshot};
    const parsed = core.readContract(revision);
    for (const stage of resolved.values()) {
      if (stage.serviceId === id) stage.operationRef = parsed.operations.find(op => op.ref.method.toUpperCase() === stage.method && op.ref.path === stage.route).ref;
    }
    contracts.set(`${id}.openapi.yaml`, snapshot);
    registry.set(sha256, revision);
  }
  requireValue([...registry.values()].reduce((size, item) => size + Buffer.byteLength(item.snapshot), 0) <= core.MAX_DOCUMENT_BYTES, 'Los contratos vinculados superan el límite de 15 MiB del diagrama.');

  const defaultScenario = [{id: 'principal', title: 'Recorrido principal', steps: [...resolved.keys()].map(stage => ({stage}))}];
  const scenarioIds = new Set(), used = new Set();
  const endpoints = array(input.scenarios ?? defaultScenario, 'scenarios', 20, 1).map(scenario => {
    const id = uniqueId(scenario?.id, scenarioIds, 'escenario'), title = text(scenario.title, `${id}.title`, 120);
    const page = {id, pageName: title, dependencies: [], findings: [], steps: [], decisions};
    const positions = {}, vertices = {}, ports = [], labelOffsets = [];
    const rows = channelRows.map(label => ({label, cells: [], height: 100}));
    const place = (row, cell, x, status) => {
      const {label, height} = fitLabel(cell.label);
      rows[row].cells.push({id: cell.id, x});
      rows[row].height = Math.max(rows[row].height, height);
      const fill = {new: '#fff2cc', existing: '#ffffff', pending: 'none'}[status];
      vertices[cell.id] = {height, fill, pending: Boolean(cell.pending)};
      cell.label = label;
      cell.metadata = {...cell.metadata, implementationStatus: status};
      return cell;
    };
    const last = array(scenario.steps, `${id}.steps`, 25, 1).length - 1;
    const step = (from, to, direction, label, fromPort, toPort, offset) => {
      page.steps.push({from, to, direction, label});
      ports.push([...fromPort, ...toPort]);
      labelOffsets.push(offset);
    };
    let x = bandX + 48;
    for (const [i, item] of scenario.steps.entries()) {
      const stage = resolved.get(item?.stage);
      requireValue(stage, `Etapa desconocida en ${id}: ${item?.stage}.`);
      used.add(stage.id);
      const code = item.response ?? stage.success;
      requireValue(Object.hasOwn(stage.responses, code), `Respuesta ${code} no declarada en ${stage.id}.`);
      const ux = i === 0 ? id : `__ux-${i}`, client = `__frontend-${i}`, gateway = `__apim-${i}`;
      const label = `${i + 1}. ${stage.title}\nUX · ${stage.service.title}\n${stage.method} ${stage.route}`;
      const metadata = {contractClassification: 'UX', ...(stage.bianRef && {designBian: stage.bianRef})};
      const count = item.callCount ?? stage.calls.length;
      requireValue(Number.isInteger(count) && count >= 0 && count <= stage.calls.length, `callCount inválido en ${id}/${stage.id}.`);
      const outcomes = array(item.callOutcomes ?? [], `${id}.callOutcomes`, count).map(outcome => text(outcome, 'respuesta alternativa', 160));
      const center = x + Math.max(0, count - 1) * callSpacing / 2;
      const vertex = place(2, {id: ux, label, kind: 'service', operationRef: stage.operationRef, decisions: stage.decisions, metadata}, center, stage.service.status);
      if (i === 0) Object.assign(page, {label: vertex.label, metadata: {...vertex.metadata, designChannel: '1'}, operationRef: vertex.operationRef, decisions: [...decisions, ...stage.decisions]});
      else page.dependencies.push(vertex);
      page.dependencies.push(place(0, {id: client, label: `${i + 1}. ${stage.title}\n${frontend}`, kind: 'api'}, center, stage.frontendStatus),
        place(1, {id: gateway, label: `APIM\n${stage.method} ${stage.route}`, kind: 'api'}, center, stage.apimStatus));
      step(client, gateway, 'request', 'Solicitar', [0.34, 1], [0.34, 0], [-22, 0]);
      step(gateway, ux, 'request', 'Enrutar a AKS', [0.34, 1], [0.34, 0], [-22, 0]);
      const slot = 1 / (2 * count + 1);
      for (const [j, call] of stage.calls.slice(0, count).entries()) {
        const target = `__dependency-${i}-${j}`;
        const meta = {contractClassification: call.layer};
        if (call.reference) meta.contractSource = {commit: input.catalogCommit, ...(catalog.repository && {repository: catalog.repository}), ...call.reference};
        if (call.pending) Object.assign(meta, {contractState: 'pending', authorPurpose: call.label});
        page.dependencies.push(place(3, {id: target, kind: 'service', operationRef: call.operationRef, pending: call.pending, metadata: meta,
          label: call.pending ? `${call.layer} · Pendiente\n${call.label}` : `${call.layer} · ${call.service}\n${call.reference.method} ${call.reference.path}`,
          decisions: [{id: `${stage.id}-consumo-${j + 1}`, text: call.pending ?? [call.label, ...call.mapping].join(' · ')}]}, x + j * callSpacing, call.status ?? 'existing'));
        step(ux, target, 'request', call.pending ? `Pendiente · ${call.label}` : call.label, [(2 * j + 1) * slot, 1], [0.38, 0], [-20, 0]);
        if (call.outcome) step(target, ux, 'response', outcomes[j] ?? call.outcome, [0.62, 0], [(2 * j + 2) * slot, 1], [20, 0]);
      }
      step(ux, gateway, 'response', `HTTP ${code}`, [0.66, 0], [0.66, 1], [22, 0]);
      step(gateway, client, 'response', `HTTP ${code}`, [0.66, 0], [0.66, 1], [22, 0]);
      if (i < last) step(client, `__frontend-${i + 1}`, 'request', 'Siguiente etapa', [1, 0.5], [0, 0.5], [0, -10]);
      x += (Math.max(1, count) - 1) * callSpacing + nodeWidth + 125;
    }
    requireValue(page.steps.length <= 500, `El escenario ${id} excede los 500 pasos del reproductor.`);
    let y = 20;
    const bands = rows.map((row, index) => {
      const band = {id: `__band-${index}`, label: row.label, x: bandX, y, width: x - bandX - 75, height: row.height + 63};
      for (const cell of row.cells) {
        positions[cell.id] = [cell.x, y + 48];
        vertices[cell.id].height = row.height;
      }
      y += band.height + 18;
      return band;
    });
    return {page, layout: {positions, ports, labelOffsets, bands, vertices}};
  });
  requireValue(used.size === resolved.size, 'Cada etapa debe aparecer en algún escenario.');

  const pages = Object.fromEntries(endpoints.map(({page, layout}) => [page.id, layout]));
  const content = renderDrawio({design: true, endpoints: endpoints.map(({page}) => page), registry: {version: 2, revisions: [...registry.values()]}}, {
    layout: {pages, nodeWidth},
  });
  const flow = [...resolved.values()].flatMap(stage => [
    `### ${stage.title}`, '', `${stage.purpose}`, '', `- UX · ${stage.service.title} · \`${stage.method} ${stage.route}\``,
    stage.bianRef ? `- BIAN ${stage.bianRef.release} · ${stage.bianRef.domain} · \`${stage.bianRef.method} ${stage.bianRef.path}\` · [fuente](https://github.com/bian-official/public/blob/${stage.bianRef.commit}/${encodeURI(stage.bianRef.source)})` : '- BIAN pendiente.',
    `- Respuestas UX · ${Object.entries(stage.responses).map(([code, response]) => `${code} ${response.description}`).join(' · ')}`,
    ...stage.decisions.slice(1).map(rule => `- ${rule.text}`),
    ...stage.calls.flatMap(call => call.pending ? [`- ${call.layer} · ${call.label} · pendiente: ${call.pending}`] : [
      `- ${call.layer} · ${call.service} ${call.version} · \`${call.reference.method} ${call.reference.path}\` · \`${call.reference.file}\` · SHA-256 \`${call.reference.sha256}\``,
      ...call.mapping.map(item => `  - ${item}`),
    ]), '',
  ]);
  const spec = [`# ${project}`, '', `**Diseño propuesto**${questions.length ? ' · con decisiones pendientes' : ''}`, '', goal, '', `Frontend · ${frontend}`, '',
    ...(catalog ? [`Revisión del catálogo · ${catalog.repository ? `[\`${catalog.commit}\`](${catalog.repository}/tree/${catalog.commit})` : `\`${catalog.commit}\``}`, ''] : []), '## Servicios de canal', '', ...bullets([...services.values()].map(service => `**${service.title}** · ${service.responsibility}`)), '',
    '## Decisiones acordadas', '', ...bullets(decisions.map(item => item.text)), '', '## Flujo y contratos', '', ...flow,
    '## Escenarios', '', ...bullets((input.scenarios ?? defaultScenario).map(scenario => `${scenario.title} · ${scenario.steps.map(item => `${resolved.get(item.stage).title}${item.response ? ` (${item.response})` : ''}`).join(' → ')}`)), '',
    '## Pendientes', '', ...bullets(questions), ''].join('\n');
  return {content, spec, contracts, pending: questions.length};
}

export async function writeChannel(input, out, options) {
  const result = await buildChannel(input, options);
  const root = path.resolve(out);
  const release = await lockRun(root);
  let stage;
  try {
    stage = await mkdtemp(path.join(root, '.channel-'));
    await mkdir(path.join(stage, 'contracts'));
    for (const [name, yaml] of result.contracts) await atomicWrite(path.join(stage, 'contracts', name), yaml);
    await writeJson(path.join(stage, 'spec.json'), input);
    await atomicWrite(path.join(stage, 'spec.md'), result.spec);
    await atomicWrite(path.join(stage, 'channel.drawio'), result.content);
    const output = path.join(root, `propuesta-${path.basename(stage).slice('.channel-'.length)}`);
    await rename(stage, output);
    stage = undefined;
    return {...result, output};
  } finally {
    try {
      if (stage && path.dirname(stage) === root && path.basename(stage).startsWith('.channel-')) await rm(stage, {recursive: true, force: true});
    } finally { await release(); }
  }
}
