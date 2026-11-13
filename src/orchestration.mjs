import path from 'node:path';
import {mkdir, mkdtemp, readdir, realpath, rename, rm, readFile} from 'node:fs/promises';
import {projectRoot, hash, lockRun, readJson, writeJson, atomicWrite} from './io.js';
import {buildChannel} from './channel-design.mjs';

export const roles = ['discovery', 'architecture', 'contract', 'reviewer'];
export const qualityTopics = ['security', 'data', 'idempotency', 'concurrency', 'timeouts', 'partial-failure', 'observability', 'performance'];
const blocking = finding => ['blocker', 'major'].includes(finding.severity);
const fingerprint = finding => `${finding.owner}:${finding.code}:${finding.target}`;
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const string = (value, field) => requireValue(typeof value === 'string' && value.trim().length > 0, `Completa ${field}.`);
const list = (value, field) => { requireValue(Array.isArray(value), `${field} debe ser una lista.`); return value; };
const unique = (items, field) => {
  const seen = new Set();
  for (const item of items) {
    string(item.id, `${field}.id`);
    requireValue(!seen.has(item.id), `ID repetido en ${field}: ${item.id}.`);
    seen.add(item.id);
  }
};

export async function sessionPath(value) {
  const root = path.join(projectRoot, 'runs');
  await mkdir(root, {recursive: true});
  const target = path.resolve(value);
  const inside = (base, candidate) => {
    const relative = path.relative(base, candidate);
    return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  requireValue(inside(root, target), 'La sesión debe estar dentro de runs/.');
  let ancestor = target;
  while (true) {
    try {
      const resolved = await realpath(ancestor), actualRoot = await realpath(root);
      requireValue(resolved === actualRoot || inside(actualRoot, resolved), 'La sesión no puede salir de runs/ mediante enlaces.');
      return target;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      ancestor = path.dirname(ancestor);
    }
  }
}

const revisionName = revision => `r${String(revision).padStart(6, '0')}`;
const stateHash = state => { const {digest, ...data} = state; return hash(JSON.stringify(data)); };

export async function loadSession(dir) {
  const root = await sessionPath(dir);
  const names = (await readdir(root)).filter(name => /^r\d{6}$/.test(name)).sort();
  requireValue(names.length, 'Sesión no inicializada.');
  let previous = null;
  for (const [index, name] of names.entries()) {
    const state = await readJson(path.join(root, name, 'state.json'));
    requireValue(state.revision === index + 1 && name === revisionName(state.revision), 'Secuencia de revisiones incompleta.');
    requireValue(state.digest === stateHash(state) && state.parentDigest === (previous?.digest ?? null), 'La integridad de la sesión no coincide.');
    previous = state;
  }
  return previous;
}

async function commit(root, state, event, writer) {
  const revision = (state.revision ?? 0) + 1;
  const next = {...state, revision, parentDigest: state.digest ?? null, updatedAt: new Date().toISOString(), event};
  delete next.digest;
  const temp = await mkdtemp(path.join(root, '.revision-'));
  try {
    if (writer) await writer(temp, next);
    next.digest = stateHash(next);
    await writeJson(path.join(temp, 'state.json'), next);
    await rename(temp, path.join(root, revisionName(revision)));
    return next;
  } catch (error) {
    await rm(temp, {recursive: true, force: true});
    throw error;
  }
}

export async function initSession(dir, input) {
  const root = await sessionPath(dir), release = await lockRun(root);
  try {
    requireValue(!(await readdir(root)).some(name => /^r\d{6}$/.test(name)), 'La sesión ya existe.');
    string(input.request, 'request');
    const policy = {maxReviewRounds: 3, maxRepeatedFindings: 2, maxAttempts: 16, ...input.policy};
    for (const [key, value] of Object.entries(policy)) requireValue(Number.isInteger(value) && value >= 1 && value <= 100, `Límite inválido: ${key}.`);
    return await commit(root, {schemaVersion: 1, request: input.request, status: 'discovery', policy,
      answers: [], attempts: 0, reviewRounds: 0, findingsHistory: [], openFindings: [], validationFindings: [], reviews: []}, {type: 'initialized', actor: 'user'});
  } finally { await release(); }
}

function validateDiscovery(data) {
  const requirements = list(data.requirements, 'requirements');
  requireValue(requirements.length > 0, 'Incluye al menos un requerimiento.');
  unique(requirements, 'requirements');
  const criteria = [];
  for (const req of requirements) {
    string(req.statement, 'requirement.statement');
    string(req.source, 'requirement.source');
    requireValue(['confirmed', 'assumed', 'pending', 'contradictory'].includes(req.status), 'Estado de requerimiento inválido.');
    requireValue(list(req.acceptance, 'acceptance').length > 0, `Faltan criterios de ${req.id}.`);
    for (const criterion of req.acceptance) {
      for (const key of ['id', 'given', 'when', 'then']) string(criterion[key], `acceptance.${key}`);
      criteria.push(criterion);
    }
  }
  unique(criteria, 'acceptance');
  unique(list(data.decisions, 'decisions'), 'decisions');
  for (const decision of data.decisions) { string(decision.statement, 'decision.statement'); string(decision.rationale, 'decision.rationale'); }
  unique(list(data.questions, 'questions'), 'questions');
  for (const question of data.questions) {
    string(question.question, 'question');
    requireValue(typeof question.blocking === 'boolean', 'Declara question.blocking.');
  }
  const quality = list(data.quality, 'quality');
  for (const topic of qualityTopics) {
    const items = quality.filter(item => item.topic === topic);
    requireValue(items.length === 1, `Declara una evaluación de calidad para ${topic}.`);
    requireValue(['addressed', 'pending', 'not-applicable'].includes(items[0].status), `Estado de calidad inválido: ${topic}.`);
    string(items[0].rationale, `quality.${topic}.rationale`);
  }
}

function validateTraceability(baseline, spec, traces) {
  list(spec.services, 'spec.services'); list(spec.stages, 'spec.stages'); list(spec.scenarios, 'spec.scenarios');
  list(traces, 'traceability');
  for (const trace of traces) {
    const req = baseline.requirements.find(item => item.id === trace.requirementId);
    const stage = spec.stages.find(item => item.id === trace.stageId);
    const scenario = spec.scenarios.find(item => item.id === trace.scenarioId);
    requireValue(req && stage && scenario, 'Trazabilidad con requisito, etapa o escenario desconocido.');
    requireValue(scenario.steps.some(step => step.stage === stage.id), 'El escenario no recorre la etapa vinculada.');
    requireValue(list(trace.criterionIds, 'criterionIds').length > 0, 'Vincula al menos un criterio.');
    requireValue(trace.criterionIds.every(id => req.acceptance.some(item => item.id === id)), 'Criterio ajeno al requisito.');
    requireValue(list(trace.decisionIds, 'decisionIds').length > 0 && trace.decisionIds.every(id => baseline.decisions.some(item => item.id === id)), 'Vincula decisiones existentes.');
  }
  for (const req of baseline.requirements) for (const criterion of req.acceptance) {
    requireValue(traces.some(trace => trace.requirementId === req.id && trace.criterionIds.includes(criterion.id)), `Criterio sin cobertura: ${criterion.id}.`);
  }
  for (const stage of spec.stages) requireValue(traces.some(trace => trace.stageId === stage.id), `Etapa sin justificación: ${stage.id}.`);
  for (const service of spec.services) requireValue(spec.stages.some(stage => stage.service === service.id), `Servicio sin etapas: ${service.id}.`);
}

// Contract may refine interfaces and mappings, but must return structural changes to Architecture.
function architectureShape(spec) {
  const copy = structuredClone(spec);
  for (const service of copy.services ?? []) { delete service.components; delete service.security; }
  for (const stage of copy.stages ?? []) {
    delete stage.operation;
    for (const call of stage.calls ?? []) delete call.mapping;
  }
  return JSON.stringify(copy);
}

async function checkArtifacts(root, artifact) {
  requireValue(artifact && /^r\d{6}\/artifacts$/.test(artifact.directory), 'Falta una entrega validada.');
  for (const [file, expected] of Object.entries(artifact.files)) {
    requireValue(hash(await readFile(path.join(root, artifact.directory, file))) === expected, `Artefacto modificado después de validar: ${file}.`);
  }
  requireValue(hash(JSON.stringify(artifact.files)) === artifact.digest, 'Manifiesto de artefactos inválido.');
}

function findings(data) {
  unique(list(data, 'findings'), 'findings');
  const keys = new Set();
  for (const finding of data) {
    for (const field of ['id', 'code', 'target', 'claim', 'evidence', 'closure']) string(finding[field], `finding.${field}`);
    requireValue(roles.includes(finding.owner), 'Responsable de hallazgo inválido.');
    requireValue(finding.owner !== 'reviewer', 'El revisor no puede asignarse la corrección.');
    requireValue(['blocker', 'major', 'minor', 'info'].includes(finding.severity), 'Severidad inválida.');
    requireValue(!keys.has(fingerprint(finding)), 'Hallazgo duplicado.'); keys.add(fingerprint(finding));
  }
}

function invalidate(state) { delete state.artifact; delete state.validation; }
function route(state, open) {
  if (open.some(item => item.owner === 'discovery')) state.status = 'awaiting_user';
  else state.status = open.some(item => item.owner === 'architecture') ? 'architecture' : 'contract';
}

export async function submitRole(dir, {revision, role, data}, options = {}) {
  const root = await sessionPath(dir), release = await lockRun(root);
  try {
    const state = await loadSession(root);
    requireValue(state.revision === revision, 'Entrega obsoleta: vuelve a consultar next.');
    requireValue(roles.includes(role) && state.status === role, `Turno incorrecto: se espera ${state.status}.`);
    state.attempts++;
    let writer;
    if (data.handoff) {
      const {target, reason} = data.handoff;
      string(reason, 'handoff.reason');
      requireValue((target === 'discovery' && role !== 'discovery') || (target === 'architecture' && ['contract', 'reviewer'].includes(role)), 'Derivación inválida.');
      state.handoff = {from: role, target, reason};
      state.status = target === 'discovery' ? 'awaiting_user' : target;
      invalidate(state);
    } else if (role === 'discovery') {
      validateDiscovery(data);
      state.baseline = structuredClone(data);
      state.baselineVersion = (state.baselineVersion ?? 0) + 1;
      delete state.spec; delete state.traceability; delete state.handoff;
      invalidate(state);
      state.status = data.questions.some(item => item.blocking) || data.requirements.some(item => ['pending', 'contradictory'].includes(item.status)) ? 'awaiting_user' : 'architecture';
    } else if (role === 'architecture' || role === 'contract') {
      validateTraceability(state.baseline, data.spec, data.traceability);
      if (role === 'contract') requireValue(architectureShape(data.spec) === architectureShape(state.spec), 'El cambio afecta arquitectura; usa handoff a architecture.');
      delete state.handoff;
      state.spec = structuredClone(data.spec);
      state.traceability = structuredClone(data.traceability);
      invalidate(state);
      if (role === 'architecture') state.status = 'contract';
      else {
        let built;
        try { built = await buildChannel(state.spec, options); }
        catch (error) {
          state.validationFindings = [{id: 'AUTO-BUILD', code: 'BUILD_INVALID', target: 'spec', owner: 'contract', severity: 'blocker',
            claim: 'La generación o validación automática falló.', evidence: error.message, closure: 'Corregir la spec o derivar el cambio; buildChannel debe finalizar correctamente.'}];
          state.status = 'contract';
        }
        if (built) {
          state.validationFindings = [];
          state.validation = {passed: true, pending: built.pending};
          state.status = 'reviewer';
          writer = async (temp, next) => {
            const artifacts = new Map([['spec.json', `${JSON.stringify(state.spec, null, 2)}\n`], ['spec.md', built.spec], ['channel.drawio', built.content],
              ['traceability.json', `${JSON.stringify(state.traceability, null, 2)}\n`], ...[...built.contracts].map(([name, content]) => [`contracts/${name}`, content])]);
            const files = {};
            for (const [file, content] of artifacts) { await atomicWrite(path.join(temp, 'artifacts', file), content); files[file] = hash(content); }
            next.artifact = {directory: `${revisionName(next.revision)}/artifacts`, files, digest: hash(JSON.stringify(files))};
          };
        }
      }
    } else if (role === 'reviewer') {
      await checkArtifacts(root, state.artifact);
      requireValue(data.artifactDigest === state.artifact.digest, 'La revisión no corresponde a los artefactos vigentes.');
      requireValue(data.baselineVersion === state.baselineVersion, 'La revisión no corresponde a la línea base vigente.');
      findings(data.findings);
      const criteria = state.baseline.requirements.flatMap(req => req.acceptance.map(item => item.id));
      const coverage = list(data.coverage, 'coverage');
      requireValue(coverage.length === criteria.length && new Set(coverage.map(item => item.criterionId)).size === criteria.length, 'Revisa cada criterio exactamente una vez.');
      for (const item of coverage) {
        requireValue(criteria.includes(item.criterionId) && ['pass', 'fail'].includes(item.result), 'Cobertura inválida.');
        string(item.evidence, 'coverage.evidence');
        if (item.result === 'fail') requireValue(data.findings.some(finding => finding.id === item.findingId && blocking(finding)), 'Un criterio fallido requiere un hallazgo bloqueante.');
      }
      for (const previous of state.openFindings.filter(blocking)) {
        const current = data.findings.find(item => fingerprint(item) === fingerprint(previous));
        if (!current || !blocking(current)) requireValue(list(data.resolutions ?? [], 'resolutions').some(item => item.findingId === previous.id && typeof item.evidence === 'string' && item.evidence.trim()), `Explica el cierre de ${previous.id}.`);
      }
      state.reviewRounds++;
      state.openFindings = structuredClone(data.findings);
      state.reviews.push({revision: revision + 1, baselineVersion: state.baselineVersion, ...structuredClone(data)});
      const open = data.findings.filter(blocking);
      const keys = open.map(fingerprint);
      const repeated = keys.some(key => 1 + state.findingsHistory.filter(round => round.includes(key)).length >= state.policy.maxRepeatedFindings);
      state.findingsHistory.push(keys);
      if (open.length) {
        route(state, open);
        if (state.reviewRounds >= state.policy.maxReviewRounds || repeated) {
          state.status = 'needs_attention';
          state.stopReason = repeated ? 'Hallazgo bloqueante repetido.' : 'Límite de rondas de revisión alcanzado.';
        }
      } else {
        const pending = state.validation.pending || state.baseline.questions.length || state.baseline.requirements.some(item => item.status !== 'confirmed') || state.baseline.quality.some(item => item.status === 'pending') || data.findings.some(item => item.severity === 'minor');
        state.status = pending ? 'draft' : 'ready';
      }
    }
    if (state.attempts >= state.policy.maxAttempts && !['ready', 'draft', 'needs_attention'].includes(state.status)) {
      state.status = 'needs_attention'; state.stopReason = 'Límite de entregas automáticas alcanzado.';
    }
    return await commit(root, state, {type: 'submitted', actor: role, input: data}, writer);
  } finally { await release(); }
}

export async function answerSession(dir, {revision, answer}) {
  const root = await sessionPath(dir), release = await lockRun(root);
  try {
    const state = await loadSession(root);
    requireValue(state.revision === revision, 'Respuesta obsoleta: consulta status.');
    requireValue(['awaiting_user', 'needs_attention', 'draft', 'ready'].includes(state.status), 'No hay una consulta o reapertura pendiente.');
    string(answer, 'answer');
    state.answers.push({answer, revision: revision + 1});
    state.status = 'discovery'; state.attempts = 0; state.reviewRounds = 0; state.findingsHistory = [];
    delete state.stopReason; invalidate(state);
    return await commit(root, state, {type: 'user_answer', actor: 'user', answer});
  } finally { await release(); }
}

export async function nextTask(dir) {
  const root = await sessionPath(dir), state = await loadSession(root);
  if (state.artifact) await checkArtifacts(root, state.artifact);
  return {session: root, revision: state.revision, status: state.status, role: roles.includes(state.status) ? state.status : null,
    instruction: roles.includes(state.status) ? `agents/${state.status}.agent.md` : null,
    context: {request: state.request, answers: state.answers, baseline: state.baseline, baselineVersion: state.baselineVersion,
      spec: state.spec, traceability: state.traceability, artifact: state.artifact, validation: state.validation,
      findings: [...state.openFindings, ...state.validationFindings], handoff: state.handoff, stopReason: state.stopReason},
    dispatch: 'El host ejecuta el rol indicado y entrega JSON con submit. Este CLI no invoca un modelo ni ejecuta comandos recibidos en los artefactos.'};
}
