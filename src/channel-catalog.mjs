import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {promisify} from 'node:util';
import {hash, projectRoot} from './io.js';

const exec = promisify(execFile);
const editor = path.join(projectRoot, 'editor');
const maxBlob = 5 * 1024 * 1024;
const git = (repo, args, maxBuffer = 4 * 1024 * 1024) => exec('git', ['-C', repo, ...args], {encoding: 'buffer', maxBuffer, timeout: 15000, windowsHide: true}).then(result => result.stdout);
const metadata = new Map();

export const defaultCatalogPath = () => process.env.CHANNEL_CONTRACTS_DIR || path.join(projectRoot, 'runs', 'business-contracts-demo');

function words(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export async function contractsCore() {
  return import('../editor/dist/contracts-core.mjs').catch(error => {
    if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    throw new Error('Prepara el núcleo con npm --prefix editor run build.');
  });
}

export async function channelCatalog(repo = defaultCatalogPath(), ref = 'HEAD') {
  const root = (await git(repo, ['rev-parse', '--show-toplevel'])).toString().trim();
  const commit = (await git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`])).toString().trim();
  const remote = (await git(root, ['config', '--get', 'remote.origin.url']).catch(() => Buffer.alloc(0))).toString().trim();
  const github = /^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/i.exec(remote);
  const repository = github && `https://github.com/${github[1]}`;
  const tree = (await git(root, ['ls-tree', '-r', '-l', '-z', commit])).toString().split('\0').filter(Boolean);
  const entries = new Map();
  for (const line of tree) {
    const match = /^(100644|100755) blob ([a-f0-9]+) +([0-9]+)\t([\s\S]+\.(?:json|ya?ml))$/i.exec(line);
    if (match) entries.set(match[4], {oid: match[2], size: Number(match[3])});
  }
  const core = await contractsCore();
  async function read(file) {
    const entry = entries.get(file);
    if (!entry) throw new Error(`Contrato ausente en ${commit}: ${file}`);
    if (entry.size > maxBlob) throw new Error('El contrato supera 5 MiB.');
    const bytes = await git(root, ['cat-file', 'blob', entry.oid], maxBlob + 1);
    const snapshot = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes);
    const sha256 = hash(bytes);
    return core.readContract({apiId: `business-${hash(file).slice(0, 24)}`, revisionId: `sha256:${sha256}`, sha256, format: /\.json$/i.test(file) ? 'json' : 'yaml', snapshot});
  }
  async function operation(file, method, route) {
    const contract = await read(file);
    const selected = contract.operations.find(op => op.ref.method.toUpperCase() === method && op.ref.path === route);
    if (!selected) throw new Error(`Operación ausente: ${file} · ${method} ${route}`);
    return {contract, selected};
  }
  async function index() {
    const operations = [], skipped = [];
    for (const file of entries.keys()) {
      try {
        const contract = await read(file);
        for (const op of contract.operations) {
          operations.push({file, title: contract.title, version: contract.declaredVersion, method: op.ref.method.toUpperCase(), path: op.ref.path,
            summary: op.summary, description: op.description.slice(0, 400), parameters: op.parameters.map(({name, location, required}) => ({name, location, required})),
            request: op.request?.mediaTypes, responses: op.responses.map(({code, description}) => ({code, description: description.slice(0, 140)})), sha256: contract.revision.sha256});
        }
      } catch (error) { skipped.push({file, reason: error.diagnostic?.code ?? 'CONTRATO_NO_LEGIBLE'}); }
    }
    return {operations, skipped};
  }
  async function search(query, limit = 15) {
    const cacheKey = JSON.stringify([root, commit]);
    if (!metadata.has(cacheKey)) {
      metadata.clear();
      metadata.set(cacheKey, index().catch(error => { metadata.delete(cacheKey); throw error; }));
    }
    const {operations, skipped} = await metadata.get(cacheKey);
    const terms = [...new Set(words(query.slice(0, 600)))];
    const matches = operations.map(op => {
      const names = new Set(words(`${op.title} ${op.path} ${op.method} ${op.summary}`));
      const details = new Set(words(`${op.description} ${op.parameters.map(p => p.name).join(' ')}`));
      const score = terms.reduce((sum, term) => sum + (names.has(term) ? 5 : details.has(term) ? 1 : 0), 0);
      return {op, score};
    }).filter(row => !terms.length || row.score).sort((a, b) => b.score - a.score);
    return {commit, ...(repository && {repository}), operations: matches.slice(0, limit).map(({op}) => op), total: matches.length, skipped};
  }
  return {commit, repository, read, operation, search};
}

let bianIndex;
export function channelBian() {
  bianIndex ??= loadBian();
  return bianIndex;
}

async function loadBian() {
  const [raw, manifest, {createBianSearch}] = await Promise.all([
    readFile(path.join(editor, 'data/bian/catalog.json')),
    readFile(path.join(editor, 'data/bian/manifest.json'), 'utf8').then(JSON.parse),
    import('../editor/dist/bian-assistant.mjs'),
  ]);
  const catalog = JSON.parse(raw);
  if (hash(raw) !== manifest.catalogSha256 || catalog.commit !== manifest.commit) throw new Error('La huella del catálogo BIAN no coincide.');
  const engine = createBianSearch(catalog);
  const reference = (domain, op) => ({domain: domain.id, method: op.method, path: op.path, action: op.action, summary: op.summary,
    commit: catalog.commit, release: catalog.release, source: domain.source});
  return {
    find(ref) {
      const domain = catalog.domains.find(item => item.id === ref?.domain);
      const op = domain?.operations.find(item => item.method === ref.method && item.path === ref.path);
      if (!op) throw new Error(`Operación BIAN ausente: ${JSON.stringify(ref)}`);
      return reference(domain, op);
    },
    search(query, action = '') {
      if (action && !engine.actions.includes(action)) throw new Error(`Acción BIAN desconocida: ${action}`);
      return engine.search(query, action).matches.slice(0, 6).flatMap(({domain, operations}) => operations.slice(0, 2).map(({operation}) => reference(domain, operation)));
    },
  };
}
