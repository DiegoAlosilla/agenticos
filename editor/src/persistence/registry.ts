import type {OperationRef, Registry, Revision} from '../model/types';
export const REGISTRY_ATTRIBUTE = 'contractsRegistry';
export const REF_ATTRIBUTE = 'contractRef';
export function readRegistry(raw: string | null): Registry {
  if (!raw) return {version: 1, revisions: []};
  const value = JSON.parse(raw);
  if (value.version !== 1 && value.version !== 2) throw new Error(`Formato de contratos no soportado: ${value.version}. Se conservan los metadatos sin reescribirlos.`);
  if (!Array.isArray(value.revisions) || value.revisions.some((r: Revision) => !r || typeof r.apiId !== 'string' || typeof r.revisionId !== 'string' || typeof r.snapshot !== 'string' || (r.format !== 'json' && (value.version !== 2 || r.format !== 'yaml')))) {
    throw new Error('Registro de contratos inválido.');
  }
  return value;
}
export function addRevision(registry: Registry, revision: Revision): Registry {
  if (registry.revisions.some(r => r.revisionId === revision.revisionId && r.apiId === revision.apiId)) return registry;
  return {...registry, revisions: [...registry.revisions, revision]};
}
export function findRevision(registry: Registry, ref: OperationRef): Revision {
  const revision = registry.revisions.find(r => r.apiId === ref.apiId && r.revisionId === ref.revisionId);
  if (!revision) throw new Error('Contrato no disponible: falta la revisión en este documento.');
  return revision;
}
