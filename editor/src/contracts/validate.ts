import AjvDraft4 from 'ajv-draft-04';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {openapiV2, openapiV3} from '@apidevtools/openapi-schemas';
import openapiV31 from './schemas/openapi-3.1-2022-10-07.json';
import type {ValidateFunction} from 'ajv';
import {ContractError, type JsonObject, type VersionLine} from './types';
import {pointerTarget, resolveObject, type ReferenceScan} from './references';
import {utf8Size,MAX_DOCUMENT_BYTES} from './parse';
import {structureDiagnostics} from './diagnostics';
const validators = new Map<VersionLine, ValidateFunction>();
let modern: Ajv2020;
function validator(line: VersionLine): ValidateFunction {
  if (validators.has(line)) return validators.get(line)!;
  const options = {strict: false, allErrors: true, validateFormats: true};
  const ajv = line === '3.1' ? (modern ??= new Ajv2020(options)) : new AjvDraft4(options);
  addFormats(ajv);
  // Official OAS annotation format. We expose content type literally; this is
  // structural import validation, not a complete MIME grammar validator.
  ajv.addFormat('media-range',true);
  // The standalone OAS schema's dynamic #meta fallback is not resolved correctly
  // by Ajv. This distribution supports no custom schema dialect overrides, so a
  // static pointer to the same official schema node is equivalent here. User
  // Schema Objects remain untouched and are checked separately below.
  const modernSchema = JSON.parse(JSON.stringify(openapiV31, (key,value) =>
    value && typeof value === 'object' && value.$dynamicRef === '#meta'
      ? {$ref:'#/$defs/schema'} : value));
  // The dated official schema also predates the clarified Any-valued link
  // parameters and misspells Link.server as body. Match OAS 3.1.2 §4.8.20;
  // link literals/expressions are retained as data and never executed.
  modernSchema.$defs.link.properties.parameters={type:'object',additionalProperties:true};
  delete modernSchema.$defs.link.properties.body;
  modernSchema.$defs.link.properties.server={$ref:'#/$defs/server'};
  const validate = ajv.compile(line === '3.1' ? modernSchema : line === '3.0' ? openapiV3 : openapiV2);
  validators.set(line,validate);
  return validate;
}
export function validateStructure(document: JsonObject, line: VersionLine, scan: ReferenceScan) {
  const copy: JsonObject = JSON.parse(JSON.stringify(document));
  // Legacy Reference Object siblings are ignored by those specifications, while
  // the raw snapshot is retained. Do not apply this rule to 3.1 Schema Objects.
  for (const pointer of scan.legacyRefs) {
    const node = pointerTarget(copy,pointer) as JsonObject;
    for (const key of Object.keys(node)) if (key !== '$ref') delete node[key];
  }
  // Validate referenced non-schema objects in their actual use site too. A $ref
  // to an Info Object must never be presented as a valid Parameter/Response.
  let expandedBytes=0;
  for(const pointer of scan.objectRefs){
    const allowSummary=pointer.includes('/examples/')||pointer.startsWith('#/components/pathItems/')||/^#\/(paths|webhooks)\/[^/]+$/.test(pointer);
    const serialized=JSON.stringify(resolveObject(document,pointerTarget(document,pointer),line,allowSummary));
    expandedBytes+=utf8Size(serialized);
    if(expandedBytes>MAX_DOCUMENT_BYTES)throw new ContractError('COMPLEXITY_LIMIT','La expansión de referencias para validar supera 15 MiB.');
    const resolved=JSON.parse(serialized);
    const target=pointerTarget(copy,pointer) as JsonObject;
    for(const key of Object.keys(target))delete target[key];Object.assign(target,resolved);
  }
  const validate = validator(line);
  if (!validate(copy)) {
    const issues=structureDiagnostics(validate.errors??[],document);
    throw new ContractError('INVALID_OPENAPI', `Contrato ${line}: ${issues.length} problemas estructurales detectados. No se ha importado.`,issues[0]?.pointer,issues);
  }
  if (line === '3.1') {
    const dialect = document.jsonSchemaDialect;
    if (dialect !== undefined && !['https://spec.openapis.org/oas/3.1/dialect/base','https://json-schema.org/draft/2020-12/schema'].includes(String(dialect))) {
      throw new ContractError('UNSUPPORTED_DIALECT', `Dialecto JSON Schema no soportado: ${dialect}`);
    }
    for (const schema of scan.schemas) {
      const value = schema && typeof schema === 'object' && !Array.isArray(schema) ? {...schema} : schema;
      if (value && typeof value === 'object') delete (value as JsonObject).$schema;
      if (!modern.validateSchema(value as object | boolean)) throw new ContractError('INVALID_SCHEMA', 'Schema Object 3.1 inválido según JSON Schema 2020-12.');
    }
  }
}
