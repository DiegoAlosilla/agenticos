import {parseArgs} from 'node:util';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readJson, projectRoot} from './io.js';
import {initSession, submitRole, answerSession, nextTask} from './orchestration.mjs';
import {writeOrchestrationDiagram} from './orchestration-diagram.mjs';
import {openBrowser} from './delivery.js';

const usage = `Uso: npm run orchestrate -- init|next|status|submit|answer|diagram
  init --session runs/<sesion> --input runs/<brief.json>
  next|status --session runs/<sesion>
  submit --session runs/<sesion> --role discovery|architecture|contract|reviewer --revision N --input runs/<entrega.json> [--repo <catalogo>]
  answer --session runs/<sesion> --revision N --input runs/<respuesta.json>
  diagram [--out runs/orchestration-diagram] [--open]`;

async function main() {
  const {positionals: [command, ...extra], values} = parseArgs({allowPositionals: true, options: {
    session: {type: 'string'}, input: {type: 'string'}, role: {type: 'string'}, revision: {type: 'string'},
    repo: {type: 'string'}, out: {type: 'string'}, open: {type: 'boolean'}, help: {type: 'boolean'},
  }});
  if (values.help) { console.log(usage); return; }
  if (extra.length) throw new Error(usage);
  if (command === 'diagram') {
    const result = await writeOrchestrationDiagram(values.out ?? path.join(projectRoot, 'runs', 'orchestration-diagram'));
    console.log(JSON.stringify(result, null, 2));
    if (values.open) await openBrowser(pathToFileURL(result.html).href);
    return;
  }
  if (!values.session) throw new Error(usage);
  const input = async () => {
    if (!values.input) throw new Error('Indica --input <archivo.json>.');
    return readJson(values.input);
  };
  let result;
  if (command === 'init') result = await initSession(values.session, await input());
  else if (command === 'next' || command === 'status') result = await nextTask(values.session);
  else if (command === 'submit') result = await submitRole(values.session, {revision: Number(values.revision), role: values.role, data: await input()}, {repo: values.repo});
  else if (command === 'answer') result = await answerSession(values.session, {revision: Number(values.revision), answer: (await input()).answer});
  else throw new Error(usage);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
