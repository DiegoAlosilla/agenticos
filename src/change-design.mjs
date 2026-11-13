import {mkdir, mkdtemp, readFile, realpath, rename, rm} from 'node:fs/promises';
import path from 'node:path';
import {stringify} from 'yaml';
import {contractsCore} from './channel-catalog.mjs';
import {renderDrawio} from './drawio.mjs';
import {atomicWrite, hash, writeJson} from './io.js';

const verbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'];
const kinds = ['api', 'service', 'cache', 'database', 'event'];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function requiredText(value, field, limit = 500) {
  check(typeof value === 'string' && value.trim() && value.length <= limit, `Revisa ${field}.`);
  return value.trim();
}

function list(value, field, min, max) {
  check(Array.isArray(value) && value.length >= min && value.length <= max, `Revisa ${field} (${min}–${max} elementos).`);
  return value;
}

function snapshot(file, bytes) {
  const sha256 = hash(bytes);
  return {apiId: 'service-change', revisionId: `sha256:${sha256}`, sha256,
    format: /\.json$/i.test(file) ? 'json' : 'yaml', snapshot: new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes)};
}

export async function buildChange(contractFile, input) {
  const core = await contractsCore();
  const bytes = await readFile(contractFile);
  const baseline = snapshot(contractFile, bytes);
  const current = core.readContract(baseline);
  check(input?.version === 1 && input.baselineSha256 === baseline.sha256, 'La spec debe ser versión 1 y corresponder al SHA-256 del contrato base.');
  const title = requiredText(input.title, 'title', 120);
  const {method, path: route, mode, operation} = input.change ?? {};
  check(verbs.includes(method) && typeof route === 'string' && /^\/[^\s]*$/u.test(route) && route.length <= 200, 'Indica método y ruta OpenAPI.');
  check(mode === 'add' || mode === 'replace', 'change.mode debe ser add o replace.');
  check(operation && typeof operation === 'object' && !Array.isArray(operation), 'Incluye la operación OpenAPI completa en change.operation.');
  const before = current.operations.find(item => item.ref.method.toUpperCase() === method && item.ref.path === route);
  check(mode === 'add' ? !before : before, `La operación ${method} ${route} ${mode === 'add' ? 'ya existe' : 'no existe'}.`);
  const verb = method.toLowerCase();
  const pathItem = current.document.paths?.[route];
  check(!pathItem?.$ref, 'La ruta usa un Path Item referenciado. Prepara una propuesta que resuelva esa referencia antes de continuar.');
  const proposed = {...current.document, paths: {...current.document.paths, [route]: {...pathItem, [verb]: operation}}};
  const yaml = stringify(proposed);
  const revision = snapshot('openapi.proposed.yaml', Buffer.from(yaml));
  const updated = core.readContract(revision);
  const after = updated.operations.find(item => item.ref.method.toUpperCase() === method && item.ref.path === route);
  check(after, 'La operación propuesta no quedó en el contrato.');

  const decisions = list(input.decisions, 'decisions', 1, 30).map((text, i) => ({id: `D${i + 1}`, text: requiredText(text, 'decisión')}));
  const pending = list(input.pending ?? [], 'pending', 0, 30).map(text => requiredText(text, 'pendiente'));
  const components = new Map([['endpoint', {id: 'endpoint', status: 'new'}]]);
  for (const node of list(input.components, 'components', 1, 12)) {
    const id = node?.id;
    check(typeof id === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(id) && !components.has(id), `Identificador de componente inválido o repetido: ${id}.`);
    check(kinds.includes(node.kind) && ['existing', 'new'].includes(node.status), `Revisa tipo y estado del componente ${id}.`);
    components.set(id, {id, kind: node.kind, status: node.status, label: requiredText(node.label, `nombre de ${id}`, 75)});
  }
  const pages = {}, scenarioIds = new Set();
  const endpoints = list(input.scenarios, 'scenarios', 1, 12).map(scenario => {
    const id = scenario?.id;
    check(typeof id === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(id) && !scenarioIds.has(id), `Identificador de escenario inválido o repetido: ${id}.`);
    scenarioIds.add(id);
    const pageId = `__change-${id}`;
    const pageName = requiredText(scenario.title, 'título de escenario', 80);
    const response = requiredText(scenario.response, 'respuesta HTTP', 7);
    check(after.responses.some(item => item.code === response), `La respuesta ${response} de ${id} no figura en el contrato.`);
    const used = new Set();
    const steps = list(scenario.steps, `${id}.steps`, 2, 50).map(step => {
      check(components.has(step?.from) && components.has(step?.to) && step.from !== step.to, `Revisa las conexiones de ${id}.`);
      check(['request', 'response'].includes(step.direction), `Revisa la dirección del paso en ${id}.`);
      used.add(step.from);
      used.add(step.to);
      return {from: step.from, to: step.to, direction: step.direction, label: requiredText(step.label, 'etiqueta del paso', 95)};
    });
    check(steps[0].to === 'endpoint' && steps[0].direction === 'request' && steps.at(-1).from === 'endpoint' &&
      steps.at(-1).to === steps[0].from && steps.at(-1).direction === 'response', `El escenario ${id} debe empezar con una solicitud al endpoint y terminar con su respuesta al solicitante.`);
    steps.at(-1).label = `HTTP ${response} · ${steps.at(-1).label}`;
    const dependencies = [...used].filter(key => key !== 'endpoint').map(key => components.get(key));
    const positions = {[pageId]: [390, 110], [steps[0].from]: [30, 110]};
    dependencies.filter(node => node.id !== steps[0].from).forEach((node, i) => { positions[node.id] = [760 + (i % 2) * 355, 110 + Math.floor(i / 2) * 160]; });
    const cellId = key => key === 'endpoint' ? pageId : key;
    const vertices = Object.fromEntries([...used].map(key => [cellId(key), {height: key === 'endpoint' ? 155 : 100,
      fill: components.get(key).status === 'new' ? '#fff2cc' : '#ffffff'}]));
    const routeLines = route.match(/.{1,32}/gsu).join('\n');
    pages[pageId] = {positions, vertices};
    return {id: pageId, pageName, label: `${mode === 'add' ? 'Operación nueva' : 'Cambio propuesto'}\n${method} ${routeLines}`, operationRef: after.ref,
      decisions, dependencies, steps: steps.map(step => ({...step, from: cellId(step.from), to: cellId(step.to)})), findings: [], response};
  });
  const content = renderDrawio({design: true, endpoints, registry: {version: 2, revisions: [revision]}}, {layout: {pages, nodeWidth: 285}});
  const spec = [`# ${title}`, '', `Propuesta · ${method} ${route}`, '', `Contrato base · ${current.title} ${current.declaredVersion} · SHA-256 \`${baseline.sha256}\``, '',
    '## Decisiones y criterios', '', ...decisions.map(item => `- **${item.id}** ${item.text}`), '', '## Escenarios', '',
    ...endpoints.map(item => `- **${item.pageName}** · HTTP ${item.response} · ${item.steps.length} pasos`), '', '## Pendientes', '',
    ...(pending.length ? pending.map(item => `- ${item}`) : ['- Ninguno registrado.']), ''].join('\n');
  return {yaml, content, spec};
}

export async function writeChange(contractFile, input, out) {
  const {yaml, content, spec} = await buildChange(contractFile, input);
  await mkdir(path.resolve(out), {recursive: true});
  const root = await realpath(out);
  const staging = await mkdtemp(path.join(root, '.change-'));
  const output = path.join(root, `propuesta-${path.basename(staging).slice('.change-'.length)}`);
  try {
    await writeJson(path.join(staging, 'spec.json'), input);
    await atomicWrite(path.join(staging, 'spec.md'), spec);
    await atomicWrite(path.join(staging, 'openapi.proposed.yaml'), yaml);
    await atomicWrite(path.join(staging, 'change.drawio'), content);
    await rename(staging, output);
  } catch (error) {
    if (path.dirname(staging) === root && path.basename(staging).startsWith('.change-')) await rm(staging, {recursive: true, force: true});
    throw error;
  }
  return {output, content};
}
