import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const projectRoot = path.resolve(import.meta.dirname, '..');
export const hash = value => createHash('sha256').update(value).digest('hex');
export const readJson = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export async function atomicWrite(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, data, 'utf8');
  try { await fs.rename(temp, file); } catch (error) { await fs.rm(temp, { force: true }); throw error; }
}
export const writeJson = (file, data) => atomicWrite(file, `${JSON.stringify(data, null, 2)}\n`);
export async function lockRun(dir) {
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, '.lock');
  let handle;
  try { handle = await fs.open(file, 'wx'); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Ejecución ocupada: ${file}. Si el proceso murió, comprueba su PID y retira solo ese archivo.`);
    throw error;
  }
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  return async () => { await handle.close(); await fs.rm(file, { force: true }); };
}
