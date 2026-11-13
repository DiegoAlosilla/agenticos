import {parseArgs, promisify} from 'node:util';
import {execFile, spawn} from 'node:child_process';
import {mkdir, stat} from 'node:fs/promises';
import path from 'node:path';
import {channelBian, channelCatalog, defaultCatalogPath} from './channel-catalog.mjs';
import {writeChannel} from './channel-design.mjs';
import {loanDemo} from './channel-demo.mjs';
import {channelGuide} from './channel-guide.mjs';
import {openLocal} from './delivery.js';
import {projectRoot, readJson} from './io.js';

const exec = promisify(execFile);
const demoRepo = 'https://github.com/DiegoAlosilla/business-contracts-demo.git';
const demoPath = path.join(projectRoot, 'runs', 'business-contracts-demo');

async function ensureDemo() {
  if (await stat(path.join(demoPath, '.git')).catch(() => null)) return demoPath;
  await mkdir(path.dirname(demoPath), {recursive: true});
  await exec('git', ['clone', demoRepo, demoPath], {timeout: 120000, windowsHide: true});
  return demoPath;
}

function startEditor(repo) {
  return new Promise((resolve, reject) => {
    const cwd = path.join(projectRoot, 'editor');
    const env = {...process.env, CHANNEL_CONTRACTS_DIR: path.resolve(repo)};
    const processHandle = spawn(process.execPath, ['scripts/start.mjs'], {cwd, env, stdio: 'inherit'});
    processHandle.once('error', reject);
    processHandle.once('close', (code, signal) => code === 0 ? resolve() : reject(new Error(`El editor terminó con ${signal ?? `código ${code}`}.`)));
  });
}

async function main() {
  const {positionals: [command, ...extra], values} = parseArgs({allowPositionals: true, options: {repo: {type: 'string'}, ref: {type: 'string'},
    query: {type: 'string'}, action: {type: 'string'}, file: {type: 'string'}, method: {type: 'string'}, path: {type: 'string'},
    input: {type: 'string'}, out: {type: 'string'}, open: {type: 'boolean'}, 'editor-url': {type: 'string'}}});
  if (extra.length) throw new Error('Usa un solo comando.');
  const print = value => console.log(JSON.stringify(value, null, 2));
  const input = () => {
    if (!values.input) throw new Error('Indica --input <archivo.json>.');
    return readJson(values.input);
  };
  const repo = values.repo || defaultCatalogPath();
  if (command === 'editor') {
    const root = values.repo || process.env.CHANNEL_CONTRACTS_DIR || await ensureDemo();
    await startEditor(root);
  } else if (command === 'search' || command === 'operation') {
    if (repo === demoPath) await ensureDemo();
    const catalog = await channelCatalog(repo, values.ref);
    if (command === 'search') print(await catalog.search(values.query ?? '', 25));
    else {
      if (!values.file || !values.method || !values.path) throw new Error('Indica --file, --method y --path.');
      const {contract, selected} = await catalog.operation(values.file, values.method.toUpperCase(), values.path);
      print({commit: catalog.commit, ...(catalog.repository && {repository: catalog.repository}), file: values.file, title: contract.title, version: contract.declaredVersion, sha256: contract.revision.sha256, operation: selected});
    }
  } else if (command === 'bian') {
    print((await channelBian()).search(values.query ?? '', values.action));
  } else if (command === 'guide') {
    print(await channelGuide(await input()));
  } else if (command === 'build' || command === 'demo') {
    const selectedRepo = command === 'demo' ? await ensureDemo() : repo;
    const spec = command === 'demo' ? await loanDemo(selectedRepo) : await input();
    const {content, output, pending} = await writeChannel(spec, values.out || path.join(projectRoot, 'runs', 'channel'), {repo: selectedRepo, ref: values.ref});
    print({output, pending});
    if (values.open) await openLocal(content, {url: values['editor-url'], log: console.error});
  } else {
    throw new Error('Usa node src/channel-cli.mjs editor|search|operation|bian|guide|build|demo. Ver docs/channel-design.md.');
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
