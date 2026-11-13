import {readFile, writeFile, mkdir, rename, access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export async function bootstrap() {
  if (!/^24\.18\./.test(process.versions.node)) {
    throw new Error(`Se requiere Node 24.18.x; encontrado ${process.versions.node}.`);
  }
  const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  let dependenciesReady = true;
  for (const [name, version] of Object.entries({...manifest.dependencies, ...manifest.devDependencies})) {
    try {
      const installed = JSON.parse(await readFile(resolve(root, 'node_modules', name, 'package.json'), 'utf8'));
      if (installed.version !== version) dependenciesReady = false;
    } catch { dependenciesReady = false; }
  }
  if (!dependenciesReady) {
    console.log('Preparando dependencias exactas desde package-lock.json (requiere Internet)...');
    // Use cmd only for launching npm.cmd, never for filesystem mutations.
    const result = process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm ci --no-audit --no-fund'], {cwd: root, stdio: 'inherit'})
      : spawnSync('npm', ['ci', '--no-audit', '--no-fund'], {cwd: root, stdio: 'inherit'});
    if (result.status !== 0) throw new Error('npm ci falló; revise conectividad y lockfile.');
  }
  const pin = JSON.parse(await readFile(resolve(root, 'config/drawio-version.json'), 'utf8'));
  const runtime = resolve(root, '.runtime');
  const archive = resolve(runtime, `draw-v${pin.version}.war`);
  const webroot = resolve(runtime, `drawio-${pin.version}`);
  await mkdir(runtime, {recursive: true});
  let bytes;
  try { bytes = await readFile(archive); }
  catch {
    console.log(`Descargando Draw.io ${pin.version} desde la distribución oficial...`);
    const response = await fetch(pin.url, {signal: AbortSignal.timeout(180000)});
    if (!response.ok) throw new Error(`Descarga del editor: HTTP ${response.status}.`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (digest(bytes) !== pin.sha256) throw new Error('SHA-256 del editor incorrecto; descarga rechazada.');
    await writeFile(archive + '.partial', bytes);
    await rename(archive + '.partial', archive);
  }
  if (digest(bytes) !== pin.sha256) throw new Error('El archivo de runtime no coincide con la huella fijada. Elimine solo ese .war y vuelva a arrancar.');
  let prepared = false;
  try {
    prepared = (await readFile(resolve(webroot, '.verified'), 'utf8')) === pin.sha256;
    await access(resolve(webroot, 'index.html'));
  } catch { prepared = false; }
  if (!prepared) {
    console.log('Extrayendo distribución verificada (sin modificar su código)...');
    const {unzipSync} = await import('fflate');
    const files = unzipSync(bytes, {filter: entry => !entry.name.startsWith('WEB-INF/') && !entry.name.startsWith('META-INF/')});
    for (const [name, content] of Object.entries(files)) {
      const target = resolve(webroot, name);
      if (!target.startsWith(webroot + '/') && !target.startsWith(webroot + '\\')) throw new Error(`Ruta insegura en distribución: ${name}`);
      if (name.endsWith('/')) { await mkdir(target, {recursive: true}); continue; }
      await mkdir(dirname(target), {recursive: true});
      await writeFile(target, content);
    }
    await writeFile(resolve(webroot, '.verified'), pin.sha256);
  }
  return webroot;
}
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
