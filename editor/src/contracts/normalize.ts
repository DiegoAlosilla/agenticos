import {array, object, text, ContractError, type Json, type JsonObject, type VersionLine,
  type OperationView, type ParameterView, type RequestView, type ResponseView} from './types';
import type {Revision} from '../model/types';
import {escapeToken, resolveObject} from './references';
const methods = ['get','post','put','delete','patch','head','options','trace'];
const has = (node: JsonObject, key: string) => Object.hasOwn(node,key);
const strings = (value: Json | undefined) => array(value).map(item => text(item));
const optionalObject = (value: Json | undefined): JsonObject => value === undefined ? {} : object(value);

function parameters(document: JsonObject, values: Json | undefined, line: VersionLine, pointer: string): ParameterView[] {
  const seen = new Set<string>();
  return array(values).map((value,index) => {
    const definition = resolveObject(document,value,line);
    const name=text(definition.name), location=text(definition.in);
    const allowed=line==='2.0'?['path','query','header','body','formData']:['path','query','header','cookie'];
    const key=JSON.stringify([location,name]);
    if (!name || !allowed.includes(location)) throw new ContractError('INVALID_PARAMETER', 'Parámetro sin nombre o ubicación válida.',pointer);
    if (seen.has(key)) throw new ContractError('DUPLICATE_PARAMETER', `Parámetro duplicado: ${location} ${name}`,pointer);
    seen.add(key);
    if (location==='path' && definition.required!==true) throw new ContractError('INVALID_PARAMETER', `El parámetro path ${name} debe ser requerido.`,pointer);
    if (line!=='2.0' && has(definition,'schema')===has(definition,'content')) throw new ContractError('INVALID_PARAMETER', `El parámetro ${name} necesita exactamente schema o content.`,pointer);
    if (line==='2.0' && !has(definition,location==='body'?'schema':'type')) throw new ContractError('INVALID_PARAMETER', `Parámetro Swagger ${name} incompleto.`,pointer);
    return {name,location,required:definition.required===true,definition,pointer:`${pointer}/${index}`};
  });
}
function effectiveParameters(document: JsonObject, inherited: Json | undefined, own: Json | undefined, line: VersionLine, pointer: string): ParameterView[] {
  const merged=new Map<string,ParameterView>();
  for (const parameter of [...parameters(document,inherited,line,pointer+'/../parameters'),...parameters(document,own,line,pointer+'/parameters')]) {
    merged.set(JSON.stringify([parameter.location,parameter.name]),parameter);
  }
  return [...merged.values()];
}
function media(document: JsonObject, content: Json | undefined, line: VersionLine): Record<string,JsonObject> {
  return Object.fromEntries(Object.entries(optionalObject(content)).map(([type,value]) => {
    const definition=object(value);
    const examples=has(definition,'examples') ? Object.fromEntries(Object.entries(object(definition.examples)).map(([name,example])=>[name,resolveObject(document,example,line,true)])) : undefined;
    return [type,examples?{...definition,examples}:definition];
  }));
}
function request(document: JsonObject, operation: JsonObject, params: ParameterView[], line: VersionLine): RequestView | undefined {
  if (line!=='2.0') {
    if (!has(operation,'requestBody')) return;
    const body=resolveObject(document,operation.requestBody,line);
    if (!has(body,'content')) throw new ContractError('INVALID_REQUEST', 'RequestBody referenciado sin content.');
    const content=media(document,body.content,line);
    return {kind:'content',required:body.required===true,description:text(body.description),content,mediaTypes:Object.keys(content)};
  }
  const bodies=params.filter(parameter=>parameter.location==='body');
  const fields=params.filter(parameter=>parameter.location==='formData');
  if (bodies.length>1 || (bodies.length && fields.length)) throw new ContractError('INVALID_REQUEST', 'Swagger admite un body o parámetros formData, no ambos.');
  const mediaTypes=strings(has(operation,'consumes')?operation.consumes:document.consumes);
  if (bodies.length) return {kind:'body',required:bodies[0].required,description:text(bodies[0].definition.description),schema:bodies[0].definition.schema,mediaTypes};
  if (fields.length) return {kind:'form',required:fields.some(field=>field.required),description:'',fields,mediaTypes};
}
function responses(document: JsonObject, operation: JsonObject, line: VersionLine): ResponseView[] {
  const values=Object.entries(optionalObject(operation.responses)).filter(([code])=>!code.startsWith('x-'));
  if (!values.length) throw new ContractError('INVALID_RESPONSES', 'La operación necesita al menos una respuesta.');
  return values.map(([code,value])=> {
    if (code!=='default' && !(line==='2.0'?/^[1-5]\d\d$/:/^[1-5](?:\d\d|XX)$/).test(code)) throw new ContractError('INVALID_RESPONSE_CODE', `Código de respuesta no admitido en ${line}: ${code}`);
    const response=resolveObject(document,value,line);
    if (typeof response.description!=='string') throw new ContractError('INVALID_RESPONSES', `La respuesta ${code} requiere description.`);
    const content=line==='2.0'?{}:media(document,response.content,line);
    const headers=Object.fromEntries(Object.entries(optionalObject(response.headers)).filter(([name])=>line==='2.0'||name.toLowerCase()!=='content-type').map(([name,definition])=>[name,resolveObject(document,definition,line)]));
    return {code,description:response.description,content,headers,
      mediaTypes:line==='2.0'?strings(has(operation,'produces')?operation.produces:document.produces):Object.keys(content),
      ...(has(response,'schema')?{schema:response.schema}:{}), ...(has(response,'examples')?{examples:response.examples}:{})};
  });
}
function security(document: JsonObject, operation: JsonObject, line: VersionLine): OperationView['security'] {
  const origin=has(operation,'security')?'operation':has(document,'security')?'global':'none';
  const requirements=array(origin==='operation'?operation.security:document.security).map(value=>object(value));
  const schemes=line==='2.0'?optionalObject(document.securityDefinitions):optionalObject(optionalObject(document.components).securitySchemes);
  const effective: Record<string,JsonObject>=Object.create(null);
  for (const requirement of requirements) for (const name of Object.keys(requirement)) {
    if (!has(schemes,name)) throw new ContractError('MISSING_SECURITY_SCHEME', `Esquema de seguridad no disponible: ${name}`);
    effective[name]=resolveObject(document,schemes[name],line);
    if (typeof effective[name].type!=='string') throw new ContractError('INVALID_SECURITY_SCHEME', `Esquema de seguridad inválido: ${name}`);
  }
  return {origin,requirements,schemes:effective};
}

export function normalizeOperations(document: JsonObject, revision: Revision, line: VersionLine, sourceVersion: string): OperationView[] {
  const result: OperationView[]=[];
  const operationIds=new Set<string>();
  for (const [path,rawItem] of Object.entries(optionalObject(document.paths))) {
    if (path.startsWith('x-')) continue;
    const original=object(rawItem);
    if (has(original,'$ref') && Object.keys(original).some(key=>key!=='$ref'&&!key.startsWith('x-'))) throw new ContractError('AMBIGUOUS_PATH_REFERENCE', `Path Item con $ref y campos adyacentes no soportado: ${path}`);
    const item=resolveObject(document,original,line,true);
    for (const method of methods) {
      if (!has(item,method)) continue;
      if (line==='2.0' && method==='trace') throw new ContractError('UNSUPPORTED_METHOD','Swagger 2.0 no define TRACE.');
      const operation=object(item[method]);
      const operationId=text(operation.operationId);
      if (operationId && operationIds.has(operationId)) throw new ContractError('DUPLICATE_OPERATION_ID', `operationId duplicado dentro del contrato: ${operationId}`);
      if (operationId) operationIds.add(operationId);
      const params=effectiveParameters(document,item.parameters,operation.parameters,line,`#/paths/${escapeToken(path)}/${method}`);
      const placeholders=new Set(Array.from(path.matchAll(/\{([^{}]+)\}/g),match=>match[1]));
      const pathParams=params.filter(parameter=>parameter.location==='path');
      if ([...placeholders].some(name=>!pathParams.some(parameter=>parameter.name===name)) || pathParams.some(parameter=>!placeholders.has(parameter.name))) {
        throw new ContractError('PATH_PARAMETER_MISMATCH', `Parámetros path no coinciden con ${method.toUpperCase()} ${path}. Cada {variable} necesita un parámetro in: path y required: true.`,`#/paths/${escapeToken(path)}/${method}/parameters`);
      }
      result.push({ref:{apiId:revision.apiId,revisionId:revision.revisionId,method:method.toUpperCase(),path,...(operationId?{operationId}:{})},
        title:text(object(document.info).title), summary:text(operation.summary), description:text(operation.description),sourceVersion,
        parameters:params.filter(parameter=>!['body','formData'].includes(parameter.location)),
        request:request(document,operation,params,line), responses:responses(document,operation,line), security:security(document,operation,line),raw:operation});
    }
  }
  return result;
}
