import type {ErrorObject} from 'ajv';
import type {Diagnostic,JsonObject} from './types';
import {pointerTarget,escapeToken} from './references';
function at(document:JsonObject,path:string):JsonObject{try{const v=pointerTarget(document,'#'+path);return v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{return {};}}
// Present independent structural problems, not every failed branch of oneOf.
// This formats validator output only; it does not change acceptance or data.
export function structureDiagnostics(errors:ErrorObject[],document:JsonObject):Diagnostic[]{
  const result:Diagnostic[]=[],seen=new Set<string>();
  for(const error of errors){
    const current=at(document,error.instancePath),params=error.params;
    if(['oneOf','anyOf','allOf','if'].includes(error.keyword)&&!error.schemaPath.includes('SchemaXORContent'))continue;
    if(error.keyword==='required'&&params.missingProperty==='$ref'&&!current.$ref)continue;
    if(error.schemaPath.includes('ParameterLocation/')&&params.missingProperty==='required'&&current.in!=='path')continue;
    const securityPath=error.instancePath.match(/^(\/components\/securitySchemes\/[^/]+)(?:\/.*)?$/)?.[1];
    if(securityPath){const scheme=at(document,securityPath),type=scheme.type;
      if((error.schemaPath.includes('APIKeySecurityScheme')&&type!=='apiKey')||(error.schemaPath.includes('HTTPSecurityScheme')&&type!=='http')||(error.schemaPath.includes('OpenIdConnectSecurityScheme')&&type!=='openIdConnect'))continue;
      const expected:Record<string,string[]>={http:['type','scheme'],apiKey:['type','name','in'],oauth2:['type','flows'],openIdConnect:['type','openIdConnectUrl']};
      if(error.keyword==='required'&&expected[String(type)]&&!expected[String(type)].includes(params.missingProperty))continue;
      if(error.keyword==='enum'&&error.instancePath.endsWith('/type')&&['http','apiKey','oauth2','openIdConnect'].includes(String(type)))continue;
    }
    let pointer='#'+error.instancePath,message='',hint='Revise este campo en el contrato original.';
    if(error.schemaPath.includes('SchemaXORContent')){message='Declare exactamente uno de estos campos: schema o content.';hint='schema describe el tipo; content describe el contenido por MIME.';}
    else if(error.keyword==='required'){message=`Falta el campo obligatorio «${params.missingProperty}».`;hint=params.missingProperty==='scheme'?'Para HTTP indique el esquema de autenticación, por ejemplo basic o bearer.':'Complete el objeto según su tipo OpenAPI.';}
    else if(error.keyword==='additionalProperties'){pointer+='/'+escapeToken(params.additionalProperty);message=`Propiedad no admitida: «${params.additionalProperty}».`;hint='Revise el nombre del campo y el tipo de objeto; no se corrige automáticamente.';}
    else if(error.keyword==='type')message=`Se esperaba un valor de tipo ${params.type}.`;
    else if(error.keyword==='enum')message=`Valor no admitido; opciones: ${JSON.stringify(params.allowedValues)}.`;
    else if(error.keyword==='format')message=`Formato ${params.format} no válido.`;
    else if(error.keyword==='pattern')message='El nombre o valor no cumple el patrón admitido.';
    else message=error.message||'Estructura no admitida.';
    const key=pointer+'|'+message;if(seen.has(key))continue;seen.add(key);
    result.push({code:'INVALID_OPENAPI',message,pointer,hint,severity:'error'});if(result.length>=50)break;
  }
  if(!result.length)result.push({code:'INVALID_OPENAPI',message:'El objeto no coincide con ninguna estructura admitida. Consulte la definición original.',pointer:'#'+(errors[0]?.instancePath??''),severity:'error'});
  return result;
}
