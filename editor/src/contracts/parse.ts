import {parseDocument,isMap,LineCounter} from 'yaml';
import {ContractError, object, type Json, type JsonObject, type VersionLine} from './types';
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
export const utf8Size = (text: string) => new TextEncoder().encode(text).byteLength;

export function parseSnapshot(snapshot: string, format: 'json' | 'yaml'): JsonObject {
  if (utf8Size(snapshot) > MAX_FILE_BYTES) throw new ContractError('FILE_TOO_LARGE', 'El contrato supera 5 MiB.');
  if(/^\s*(?:<!doctype\s+html|<html\b)/i.test(snapshot))throw new ContractError('INVALID_FILE','El archivo contiene una página HTML. Descargue el contenido Raw del YAML/JSON, no la página del repositorio.');
  let document: Json;
  try {
    if (format === 'json') document = JSON.parse(snapshot.replace(/^\uFEFF/, ''));
    else {
      const lineCounter=new LineCounter();
      const parsed = parseDocument(snapshot, {version: '1.2', uniqueKeys: true, merge: false, strict: true,prettyErrors:false,lineCounter});
      if(!isMap(parsed.contents)){
          const position=lineCounter.linePos(parsed.contents?.range?.[0]??0);
          throw new Error(`La raíz debe ser un mapa de claves y valores (línea ${position.line}, columna ${position.col}). Revise los dos puntos de las claves, por ejemplo «openapi: 3.1.0». No se ha modificado el archivo.`);
      }
      if(parsed.errors.length||parsed.warnings.length){
        // Parser messages may quote most of a damaged file. Show bounded,
        // actionable locations without copying document contents into the alert.
        const issues=[...parsed.errors,...parsed.warnings];
        const labels:Record<string,string>={BAD_INDENT:'Indentación incorrecta',UNEXPECTED_TOKEN:'Símbolo inesperado',DUPLICATE_KEY:'Clave repetida',MISSING_CHAR:'Falta un separador o cierre',MULTILINE_IMPLICIT_KEY:'Clave incompleta; revise los dos puntos'};
        const locations=issues.slice(0,1).map(issue=>{
          const position=lineCounter.linePos(issue.pos[0]);
          return `${labels[issue.code]??issue.code}: línea ${position.line}, columna ${position.col}`;
        }).join('; ');
        throw new Error(`${locations}. Revise la sintaxis, los dos puntos y la indentación.${issues.length>1?' Los avisos posteriores pueden ser consecuencia de este primer problema.':''} No se ha modificado el archivo.`);
      }
      document = parsed.toJS({maxAliasCount: 50});
    }
  } catch (error) {
    throw new ContractError('INVALID_FILE', `Archivo ${format.toUpperCase()} inválido: ${error instanceof Error ? error.message : String(error)}`);
  }
  checkBudget(document);
  return object(document);
}
function checkBudget(document: Json) {
  const stack: {value: Json; depth: number; ancestors: object[]}[] = [{value: document, depth: 0, ancestors: []}];
  let count = 0;
  let expandedBytes=0;
  while (stack.length) {
    const {value, depth, ancestors} = stack.pop()!;
    if (++count > 200000 || depth > 64) throw new ContractError('COMPLEXITY_LIMIT', 'El contrato supera 64 niveles o 200000 nodos.');
    if(typeof value==='string')expandedBytes+=utf8Size(value);
    if(value&&typeof value==='object'&&!Array.isArray(value))expandedBytes+=Object.keys(value).reduce((total,key)=>total+utf8Size(key),0);
    if(expandedBytes>MAX_DOCUMENT_BYTES)throw new ContractError('COMPLEXITY_LIMIT','Los datos expandidos superarían 15 MiB.');
    if (typeof value === 'number' && !Number.isFinite(value)) throw new ContractError('INVALID_FILE', 'YAML debe representar datos JSON finitos.');
    if (value && typeof value === 'object') {
      if (ancestors.includes(value)) throw new ContractError('YAML_ALIAS_CYCLE', 'Un alias YAML crea un ciclo de objetos; utilice $ref interno para esquemas recursivos.');
      const lineage = [...ancestors, value];
      for (const child of Object.values(value)) stack.push({value: child, depth: depth + 1, ancestors: lineage});
    } else if (value !== null && !['boolean','number','string'].includes(typeof value)) {
      throw new ContractError('INVALID_FILE', 'El documento contiene un valor no representable en JSON.');
    }
  }
}
export function detectVersion(document: JsonObject): {line: VersionLine; sourceVersion: string} {
  if (document.swagger !== undefined && document.openapi !== undefined) throw new ContractError('AMBIGUOUS_VERSION', 'El archivo declara swagger y openapi a la vez.');
  if (document.swagger === '2.0') return {line: '2.0', sourceVersion: '2.0'};
  if (typeof document.openapi === 'string' && /^3\.(0|1)\.\d+$/.test(document.openapi)) {
    return {line: document.openapi.startsWith('3.1.') ? '3.1' : '3.0', sourceVersion: document.openapi};
  }
  throw new ContractError('UNSUPPORTED_VERSION', `Versión no soportada: ${document.openapi ?? document.swagger ?? 'ausente'}. Use OpenAPI 3.1.x, 3.0.x o Swagger 2.0.`);
}
