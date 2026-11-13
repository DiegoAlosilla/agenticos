import rawSnapshot from '../../examples/contracts/clientes-ficticios.json?raw';
import type {DemoDocumentation, OperationRef, Revision} from '../model/types';

// Stage 0 only: a known, self-contained JSON fixture. This is NOT an OpenAPI parser.
export async function createDemo(): Promise<{revision: Revision; ref: OperationRef; docs: DemoDocumentation}> {
  const bytes = new TextEncoder().encode(rawSnapshot);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
  // Explicit fixture identity; a different revision must not change the logical API.
  const revision: Revision = {apiId: 'api-ficticia-clientes', revisionId: `sha256:${hash}`, sha256: hash, format: 'json', snapshot: rawSnapshot};
  const ref: OperationRef = {apiId: revision.apiId, revisionId: revision.revisionId, method: 'GET', path: '/clientes/{clienteId}', operationId: 'consultarClienteFicticio'};
  return {revision, ref, docs: readDemoDocumentation(revision, ref)};
}
export function readDemoDocumentation(revision: Revision, ref: OperationRef): DemoDocumentation {
  const doc = JSON.parse(revision.snapshot);
  if (!/^3\.0\.\d+$/.test(doc.openapi)) throw new Error('Esta prueba admite solo su snapshot ficticio OpenAPI 3.0.x.');
  const op = doc.paths?.[ref.path]?.[ref.method.toLowerCase()];
  if (!op) throw new Error('Contrato no disponible: operación ausente del snapshot.');
  return {api: doc.info.title, version: doc.info.version, summary: op.summary || '', description: op.description || '', operation: op};
}
