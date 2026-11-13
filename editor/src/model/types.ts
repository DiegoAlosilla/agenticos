export interface Revision {
  apiId: string;
  revisionId: string;
  sha256: string;
  format: 'json' | 'yaml';
  snapshot: string;
}
export interface OperationRef {
  apiId: string;
  revisionId: string;
  method: string;
  path: string;
  operationId?: string;
}
export interface Registry {version: 1 | 2; revisions: Revision[]}
export interface DemoDocumentation {
  api: string;
  version: string;
  summary: string;
  description: string;
  operation: unknown;
}
