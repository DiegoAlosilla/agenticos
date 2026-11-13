import path from 'node:path';
import {mkdtemp, mkdir} from 'node:fs/promises';
import {projectRoot, writeJson} from '../src/io.js';
import {initSession, submitRole} from '../src/orchestration.mjs';
import {example, review} from './orchestration-example.mjs';

const base = path.join(projectRoot, 'runs', 'orchestration-demo');
await mkdir(base, {recursive: true});
const session = await mkdtemp(path.join(base, 'oferta-'));
const {discovery, proposal} = example();
const missingRequired = structuredClone(proposal);
delete missingRequired.spec.stages[0].operation.responses['201'].content['application/json'].schema.required;
const brief = {request: 'Demo ficticia: crear una oferta y devolver offerId obligatorio, sin persistencia ni datos personales.'};
await writeJson(path.join(session, 'inputs', 'brief.json'), brief);
let state = await initSession(session, brief);
const transitions = [{revision: state.revision, status: state.status}];
async function submit(role, data) {
  await writeJson(path.join(session, 'inputs', `${state.revision}-${role}.json`), data);
  state = await submitRole(session, {revision: state.revision, role, data});
  transitions.push({revision: state.revision, status: state.status});
}
await submit('discovery', discovery);
await submit('architecture', missingRequired);
await submit('contract', missingRequired);
await submit('reviewer', review(state, {fail: true}));
await submit('contract', proposal);
await submit('reviewer', review(state, {resolutions: [{findingId: 'REV-001', evidence: 'La nueva respuesta 201 declara required: [offerId].'}]}));
const summary = {kind: 'Demo sintética: entregas predeterminadas, sin invocación LLM.', session, transitions,
  status: state.status, artifacts: path.join(session, state.artifact.directory)};
await writeJson(path.join(session, 'demo-summary.json'), summary);
console.log(JSON.stringify(summary, null, 2));
