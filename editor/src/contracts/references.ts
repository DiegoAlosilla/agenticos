import {ContractError, object, text, type Json, type JsonObject, type VersionLine} from './types';
export const escapeToken = (value: string) => value.replace(/~/g, '~0').replace(/\//g, '~1');
export function pointerTarget(document: JsonObject, ref: string): Json {
  if (!ref.startsWith('#')) throw new ContractError('EXTERNAL_REFERENCE', `Referencia externa no soportada: ${ref}`);
  let fragment: string;
  try { fragment = decodeURIComponent(ref.slice(1)); }
  catch { throw new ContractError('INVALID_REFERENCE', `Fragmento URI inválido: ${ref}`); }
  if (fragment !== '' && !fragment.startsWith('/')) throw new ContractError('UNSUPPORTED_ANCHOR', `Anchor no soportado: ${ref}. Utilice un JSON Pointer interno.`);
  let target: Json = document;
  for (const token of fragment === '' ? [] : fragment.slice(1).split('/')) {
    if (/~(?![01])/u.test(token)) throw new ContractError('INVALID_REFERENCE', `Escape JSON Pointer inválido: ${ref}`);
    const key = token.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!target || typeof target !== 'object' || !Object.hasOwn(target, key) ||
        (Array.isArray(target) && !/^(0|[1-9]\d*)$/.test(key))) {
      throw new ContractError('MISSING_REFERENCE', `Referencia interna inexistente: ${ref}`);
    }
    target = (target as JsonObject)[key];
  }
  return target;
}
export function resolveObject(document: JsonObject, value: Json, line: VersionLine, allowSummary=false): JsonObject {
  const seen = new Set<string>();
  let current = object(value);
  const annotations: JsonObject = {};
  while (typeof current.$ref === 'string') {
    const ref = current.$ref;
    if (seen.has(ref)) throw new ContractError('CIRCULAR_REFERENCE', `Ciclo entre objetos de referencia: ${ref}`);
    if (seen.size >= 64) throw new ContractError('REFERENCE_DEPTH', 'La cadena de referencias supera 64 saltos.');
    seen.add(ref);
    if (line === '3.1') for (const key of allowSummary?['summary','description']:['description']) {
      if (!Object.hasOwn(annotations, key) && Object.hasOwn(current, key)) annotations[key] = current[key];
    }
    current = object(pointerTarget(document, ref), ref);
  }
  return {...current, ...annotations};
}

type Mode = 'object' | 'schema' | 'map' | 'link';
interface Visit {value: Json; pointer: string; mode: Mode; childMode?: Mode}
export interface ReferenceScan {cycles: string[]; legacyRefs: string[]; objectRefs: string[]; schemas: Json[]}

// Walk OpenAPI structure, not user example payloads or extension data. Property-map
// names such as '$ref' or 'example' remain data keys; their values are schemas.
export function scanReferences(document: JsonObject, line: VersionLine): ReferenceScan {
  const stack: Visit[] = [{value: document, pointer: '#', mode: 'object'}];
  const graph = new Map<string, string[]>();
  const legacyRefs: string[] = [];
  const objectRefs: string[] = [];
  const schemas: Json[] = [];
  while (stack.length) {
    const item = stack.pop()!;
    const {value, pointer, mode} = item;
    if (!value || typeof value !== 'object') {if (mode === 'schema') schemas.push(value); continue;}
    const edges: string[] = [];
    graph.set(pointer, edges);
    if (mode !== 'map' && !Array.isArray(value)) {
      const node = value as JsonObject;
      if (mode === 'schema') {
        schemas.push(node);
        if (line === '3.1') {
          for (const key of ['$id','$anchor','$dynamicAnchor','$dynamicRef']) if (Object.hasOwn(node,key)) {
            throw new ContractError('UNSUPPORTED_SCHEMA_REFERENCE', `${key} no soportado por el resolvedor local inicial.`, pointer);
          }
          const dialect = text(node.$schema);
          if (dialect && !['https://json-schema.org/draft/2020-12/schema','https://spec.openapis.org/oas/3.1/dialect/base'].includes(dialect)) {
            throw new ContractError('UNSUPPORTED_DIALECT', `Dialecto JSON Schema no soportado: ${dialect}`,pointer);
          }
        }
      }
      if (typeof node.$ref === 'string') {
        const target=pointerTarget(document,node.$ref);
        if(mode==='schema'&&(!(target&&typeof target==='object'&&!Array.isArray(target))&&!(line==='3.1'&&typeof target==='boolean'))){
          throw new ContractError('INVALID_REFERENCE_TARGET',`La referencia de esquema no apunta a un Schema Object válido: ${node.$ref}`,pointer);
        }
        edges.push('#' + decodeURIComponent(node.$ref.slice(1)));
        if(mode==='object'||mode==='link')objectRefs.push(pointer);
        if (line !== '3.1') {legacyRefs.push(pointer); continue;}
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if(mode==='link'&&['parameters','requestBody'].includes(key))continue;
      if (mode !== 'map' && !Array.isArray(value) && (key.startsWith('x-') ||
          ['example','default','enum','const','value'].includes(key) || (mode === 'schema' && key === 'examples'))) continue;
      if (!child || typeof child !== 'object') continue;
      let childMode: Mode = Array.isArray(value) ? mode : (mode === 'map' ? item.childMode! : mode);
      let nextChildMode: Mode | undefined;
      if (mode !== 'map' && !Array.isArray(value)) {
        if (key === 'schema' || (key === 'schemas' || key === 'definitions')) childMode = key === 'schema' ? 'schema' : 'map';
        if (['schemas','definitions'].includes(key)) nextChildMode = 'schema';
        if (mode === 'schema' && ['properties','patternProperties','$defs','dependentSchemas'].includes(key)) {childMode='map';nextChildMode='schema';}
        if (mode === 'object' && ['paths','webhooks','callbacks','parameters','responses','headers','content','examples','securitySchemes','securityDefinitions','requestBodies','pathItems','links'].includes(key) && !Array.isArray(child)) {
          childMode='map';nextChildMode='object';
          if(key==='links')nextChildMode='link';
        }
      }
      const next = pointer + '/' + escapeToken(key);
      edges.push(next);
      stack.push({value:child,pointer:next,mode:childMode,childMode:nextChildMode});
    }
  }
  const colors = new Map<string, number>();
  const cycles = new Set<string>();
  for (const root of graph.keys()) {
    if (colors.has(root)) continue;
    const pending: {pointer:string; exit:boolean}[] = [{pointer:root,exit:false}];
    while (pending.length) {
      const node = pending.pop()!;
      if (node.exit) {colors.set(node.pointer,2);continue;}
      const color = colors.get(node.pointer);
      if (color === 1) {cycles.add(node.pointer);continue;}
      if (color === 2) continue;
      colors.set(node.pointer,1);
      pending.push({...node,exit:true});
      for (const edge of graph.get(node.pointer) ?? []) pending.push({pointer:edge,exit:false});
    }
  }
  return {cycles:[...cycles],legacyRefs,objectRefs,schemas};
}
