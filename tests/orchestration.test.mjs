import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir, mkdtemp, readFile, appendFile, readdir} from 'node:fs/promises';
import {projectRoot} from '../src/io.js';
import {initSession, loadSession, submitRole, nextTask, answerSession} from '../src/orchestration.mjs';
import {writeOrchestrationDiagram, orchestrationMap} from '../src/orchestration-diagram.mjs';
import {example, review} from '../scripts/orchestration-example.mjs';

let base;
before(async () => {
  const parent = path.join(projectRoot, 'runs', 'orchestration-tests');
  await mkdir(parent, {recursive: true});
  base = await mkdtemp(path.join(parent, 'suite-'));
});
async function session(policy) {
  const dir = await mkdtemp(path.join(base, 'session-'));
  const state = await initSession(dir, {request: 'Requerimiento ficticio para pruebas de orquestación.', ...(policy && {policy})});
  return {dir, state};
}
async function toReview(policy, mutate) {
  let {dir, state} = await session(policy);
  const {discovery, proposal} = example();
  if (mutate) mutate(discovery, proposal);
  for (const [role, data] of [['discovery', discovery], ['architecture', proposal], ['contract', proposal]]) {
    state = await submitRole(dir, {revision: state.revision, role, data});
  }
  assert.equal(state.status, 'reviewer');
  return {dir, state, proposal};
}

test('genera artefactos reales, revisa la misma versión y conserva revisiones', async () => {
  const {dir, state} = await toReview();
  const reviewed = await submitRole(dir, {revision: state.revision, role: 'reviewer', data: review(state)});
  assert.equal(reviewed.status, 'ready');
  const next = await nextTask(dir);
  assert.equal(next.role, null);
  const contract = await readFile(path.join(dir, next.context.artifact.directory, 'contracts/offer-ux.openapi.yaml'), 'utf8');
  assert.match(contract, /offerId/);
  assert.equal((await readdir(dir)).filter(name => /^r\d+$/.test(name)).length, 5);
  assert.equal((await loadSession(dir)).revision, 5);
});

test('rechaza turno incorrecto, revisión obsoleta y creación duplicada sin avanzar', async () => {
  const {dir, state} = await session();
  const {discovery} = example();
  await assert.rejects(submitRole(dir, {revision: 1, role: 'contract', data: {}}), /Turno incorrecto/);
  await assert.rejects(submitRole(dir, {revision: 0, role: 'discovery', data: discovery}), /obsoleta/);
  await assert.rejects(initSession(dir, {request: 'Otra'}), /ya existe/);
  assert.equal((await loadSession(dir)).digest, state.digest);
});

test('una pregunta bloqueante espera respuesta y conserva la línea base anterior', async () => {
  const {dir} = await session();
  const {discovery} = example();
  discovery.questions = [{id: 'Q-001', question: '¿Quién conserva el estado?', blocking: true}];
  let state = await submitRole(dir, {revision: 1, role: 'discovery', data: discovery});
  assert.equal(state.status, 'awaiting_user');
  assert.equal((await nextTask(dir)).role, null);
  state = await answerSession(dir, {revision: 2, answer: 'El usuario define que no habrá persistencia.'});
  discovery.questions = [];
  state = await submitRole(dir, {revision: state.revision, role: 'discovery', data: discovery});
  assert.equal(state.baselineVersion, 2);
  assert.equal(state.answers.length, 1);
  assert.equal(state.status, 'architecture');
});

test('trazabilidad exige cobertura y referencias válidas', async () => {
  const {dir} = await session();
  const {discovery, proposal} = example();
  await submitRole(dir, {revision: 1, role: 'discovery', data: discovery});
  proposal.traceability = [];
  await assert.rejects(submitRole(dir, {revision: 2, role: 'architecture', data: proposal}), /sin cobertura/);
  assert.equal((await loadSession(dir)).revision, 2);
});

test('Contract devuelve cambios de arquitectura y decisiones de negocio', async () => {
  const {dir} = await session();
  const {discovery, proposal} = example();
  await submitRole(dir, {revision: 1, role: 'discovery', data: discovery});
  await submitRole(dir, {revision: 2, role: 'architecture', data: proposal});
  const changed = structuredClone(proposal);
  changed.spec.stages[0].calls.push({layer: 'Business', purpose: 'Persistir', pending: 'Elegir contrato'});
  await assert.rejects(submitRole(dir, {revision: 3, role: 'contract', data: changed}), /afecta arquitectura/);
  let state = await submitRole(dir, {revision: 3, role: 'contract', data: {handoff: {target: 'architecture', reason: 'Definir persistencia.'}}});
  assert.equal(state.status, 'architecture');
  state = await submitRole(dir, {revision: state.revision, role: 'architecture', data: {handoff: {target: 'discovery', reason: 'El usuario debe decidir retención.'}}});
  assert.equal(state.status, 'awaiting_user');
});

test('un error OpenAPI no pasa al revisor y puede corregirse', async () => {
  const {dir} = await session();
  const {discovery, proposal} = example();
  await submitRole(dir, {revision: 1, role: 'discovery', data: discovery});
  await submitRole(dir, {revision: 2, role: 'architecture', data: proposal});
  const invalid = structuredClone(proposal);
  invalid.spec.stages[0].operation.responses = {};
  let state = await submitRole(dir, {revision: 3, role: 'contract', data: invalid});
  assert.equal(state.status, 'contract');
  assert.equal(state.validationFindings[0].code, 'BUILD_INVALID');
  assert.equal(state.artifact, undefined);
  state = await submitRole(dir, {revision: state.revision, role: 'contract', data: proposal});
  assert.equal(state.status, 'reviewer');
  assert.deepEqual(state.validationFindings, []);
});

test('rechaza reseñas con digest o línea base obsoletos y criterios sin evidencia', async () => {
  const {dir, state} = await toReview();
  await assert.rejects(submitRole(dir, {revision: 4, role: 'reviewer', data: {...review(state), artifactDigest: 'anterior'}}), /artefactos vigentes/);
  await assert.rejects(submitRole(dir, {revision: 4, role: 'reviewer', data: {...review(state), baselineVersion: 0}}), /línea base vigente/);
  await assert.rejects(submitRole(dir, {revision: 4, role: 'reviewer', data: {...review(state), coverage: []}}), /cada criterio/);
  const failed = review(state); failed.coverage[0].result = 'fail';
  await assert.rejects(submitRole(dir, {revision: 4, role: 'reviewer', data: failed}), /hallazgo bloqueante/);
});

test('detecta alteración de artefactos después de validar', async () => {
  const {dir, state} = await toReview();
  await appendFile(path.join(dir, state.artifact.directory, 'channel.drawio'), '\n<!-- editado -->');
  await assert.rejects(nextTask(dir), /modificado/);
  await assert.rejects(submitRole(dir, {revision: 4, role: 'reviewer', data: review(state)}), /modificado/);
});

test('cierra un hallazgo solo con evidencia y conserva el artefacto anterior', async () => {
  let {dir, state, proposal} = await toReview(undefined, (_, proposal) => {
    delete proposal.spec.stages[0].operation.responses['201'].content['application/json'].schema.required;
  });
  const original = state.artifact.directory;
  state = await submitRole(dir, {revision: state.revision, role: 'reviewer', data: review(state, {fail: true})});
  assert.equal(state.status, 'contract');
  proposal.spec.stages[0].operation.responses['201'].content['application/json'].schema.required = ['offerId'];
  state = await submitRole(dir, {revision: state.revision, role: 'contract', data: proposal});
  await assert.rejects(submitRole(dir, {revision: state.revision, role: 'reviewer', data: review(state)}), /Explica el cierre/);
  state = await submitRole(dir, {revision: state.revision, role: 'reviewer', data: review(state, {resolutions: [{findingId: 'REV-001', evidence: 'schema.required ahora contiene offerId.'}]})});
  assert.equal(state.status, 'ready');
  assert.notEqual(original, state.artifact.directory);
  assert.match(await readFile(path.join(dir, original, 'contracts/offer-ux.openapi.yaml'), 'utf8'), /offerId/);
});

test('hallazgos recurrentes y límites de rondas detienen ciclos', async () => {
  for (const policy of [{maxRepeatedFindings: 2}, {maxReviewRounds: 1}]) {
    let {dir, state, proposal} = await toReview(policy);
    state = await submitRole(dir, {revision: state.revision, role: 'reviewer', data: review(state, {fail: true})});
    if (state.status !== 'needs_attention') {
      state = await submitRole(dir, {revision: state.revision, role: 'contract', data: proposal});
      state = await submitRole(dir, {revision: state.revision, role: 'reviewer', data: review(state, {fail: true})});
    }
    assert.equal(state.status, 'needs_attention');
    assert.equal((await nextTask(dir)).role, null);
  }
});

test('supuestos, pendientes y hallazgos menores cierran como draft', async () => {
  for (const variant of ['assumed', 'quality', 'bian', 'minor']) {
    const {dir, state} = await toReview(undefined, (discovery, proposal) => {
      if (variant === 'assumed') discovery.requirements[0].status = 'assumed';
      if (variant === 'quality') discovery.quality[0].status = 'pending';
      if (variant === 'bian') delete proposal.spec.stages[0].bian;
    });
    const data = review(state);
    if (variant === 'minor') data.findings = [{...review(state, {fail: true}).findings[0], severity: 'minor'}];
    assert.equal((await submitRole(dir, {revision: state.revision, role: 'reviewer', data})).status, 'draft');
  }
});

test('máximo de entregas detiene incluso handoffs sin revisión', async () => {
  const {dir} = await session({maxAttempts: 1});
  const state = await submitRole(dir, {revision: 1, role: 'discovery', data: example().discovery});
  assert.equal(state.status, 'needs_attention');
});

test('la cadena detecta alteraciones y las sesiones no salen de runs', async () => {
  await assert.rejects(initSession(path.join(projectRoot, 'outside-session'), {request: 'x'}), /dentro de runs/);
  const {dir} = await session();
  const file = path.join(dir, 'r000001', 'state.json');
  const content = JSON.parse(await readFile(file, 'utf8'));
  content.request = 'Alterado';
  const {writeFile} = await import('node:fs/promises');
  await writeFile(file, JSON.stringify(content));
  await assert.rejects(loadSession(dir), /integridad/);
});

test('entregas concurrentes no crean dos revisiones sobre la misma base', async () => {
  const {dir} = await session();
  const submission = {revision: 1, role: 'discovery', data: example().discovery};
  const results = await Promise.allSettled([submitRole(dir, submission), submitRole(dir, submission)]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await loadSession(dir)).revision, 2);
});

test('diagrama incluye cuatro recorridos y todas sus referencias existen', async () => {
  const files = await writeOrchestrationDiagram(path.join(base, 'diagram'));
  assert.equal(orchestrationMap.flows.length, 4);
  const nodes = new Set(orchestrationMap.nodes.map(node => node.id));
  for (const edge of orchestrationMap.edges) assert.ok(nodes.has(edge.source) && nodes.has(edge.target));
  for (const flow of orchestrationMap.flows) for (const id of flow.steps) assert.ok(orchestrationMap.edges.some(edge => edge.id === id));
  const xml = await readFile(files.drawio, 'utf8');
  assert.equal((xml.match(/auditFlow=/g) ?? []).length, 4);
  assert.match(await readFile(files.html, 'utf8'), /Reproducir/);
});
