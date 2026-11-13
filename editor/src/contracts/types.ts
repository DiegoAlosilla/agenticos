import type {OperationRef, Revision} from '../model/types';
export type Json = null | boolean | number | string | Json[] | JsonObject;
export interface JsonObject {[key: string]: Json}
export type VersionLine = '3.1' | '3.0' | '2.0';
export interface Diagnostic {code: string; message: string; pointer?: string; severity: 'warning' | 'error'; hint?:string}
export class ContractError extends Error {
  readonly diagnostic: Diagnostic;
  readonly issues: Diagnostic[];
  constructor(code: string, message: string, pointer?: string, issues?:Diagnostic[]) {
    super(message); this.name = 'ContractError';
    this.diagnostic = {code, message, pointer, severity: 'error'};
    this.issues=issues??[this.diagnostic];
  }
}
export interface ParameterView {
  name: string; location: string; required: boolean;
  definition: JsonObject; pointer: string;
}
export interface RequestView {
  kind: 'content' | 'body' | 'form'; required: boolean; description: string;
  content?: Record<string, JsonObject>; schema?: Json; fields?: ParameterView[];
  mediaTypes: string[];
}
export interface ResponseView {
  code: string; description: string; content: Record<string, JsonObject>;
  schema?: Json; mediaTypes: string[]; headers: Record<string, JsonObject>; examples?: Json;
}
export interface OperationView {
  ref: OperationRef; title: string; summary: string; description: string; sourceVersion: string;
  parameters: ParameterView[]; request?: RequestView; responses: ResponseView[];
  security: {origin: 'operation' | 'global' | 'none'; requirements: JsonObject[]; schemes: Record<string, JsonObject>};
  raw: JsonObject;
}
export interface ContractModel {
  line: VersionLine; sourceVersion: string; title: string; declaredVersion: string;
  document: JsonObject; operations: OperationView[]; diagnostics: Diagnostic[]; cycles: string[];
  revision: Revision;
}
export function object(value: Json | undefined, pointer = ''): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ContractError('INVALID_STRUCTURE', 'Se esperaba un objeto en ' + (pointer || '/'), pointer);
  }
  return value;
}
export function array(value: Json | undefined): Json[] {return value === undefined ? [] : value as Json[];}
export function text(value: Json | undefined): string {return typeof value === 'string' ? value : '';}
