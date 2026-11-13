import {stringify} from 'yaml';
import {readContract} from './import';
import type {DraftApi,DraftField,DraftIssue} from '../model/drafts';
import {writeDrafts} from '../persistence/drafts';
export function generateContract(api:DraftApi){
  writeDrafts({version:1,apis:[api]});
  const issues:DraftIssue[]=[];
  const add=(field:string,message:string,operationId?:string)=>issues.push({field,message,operationId});
  for(const key of ['title','version','description','server','tag'] as const)if(!api[key].trim())add(key,'Completa este dato de la API.');
  if(!api.operations.length)add('operations','Agrega al menos una operación.');
  const paths:Record<string,any>=Object.create(null),schemas:Record<string,any>=Object.create(null),opIds=new Set<string>();
  const primitive=(field:DraftField,at:string,operationId:string)=>{
    const result:any={type:field.type};if(field.description)result.description=field.description;
    if(!field.name.trim())add(at,'Indica el nombre del campo o parámetro.',operationId);
    if(field.example!==''){
      if(field.type==='string')result.example=field.example;
      else if(field.type==='boolean'){
        if(!['true','false'].includes(field.example))add(at,'El ejemplo booleano debe ser true o false.',operationId);else result.example=field.example==='true';
      }else{const value=Number(field.example);if(!field.example.trim()||!Number.isFinite(value)||(field.type==='integer'&&!Number.isInteger(value)))add(at,'El ejemplo debe corresponder al tipo numérico.',operationId);else result.example=value;}
    }
    return result;
  };
  for(const op of api.operations){
    for(const key of ['path','operationId','summary','description'] as const)if(!op[key].trim())add(key,'Completa este dato de la operación.',op.id);
    if(!op.path.startsWith('/')||/[?#\s]/.test(op.path))add('path','Usa una ruta que empiece por /, sin query, fragmento o espacios.',op.id);
    if(paths[op.path])add('path','Ya existe otra operación GET con esta ruta en la API.',op.id);
    if(opIds.has(op.operationId))add('operationId','El operationId público debe ser único en la API.',op.id);opIds.add(op.operationId);
    const parameters:any[]=[],seenParams=new Set<string>();
    for(const [i,p]of op.parameters.entries()){
      const at=`parameters.${i}`,key=`${p.location}:${p.location==='header'?p.name.toLowerCase():p.name}`;
      if(seenParams.has(key))add(at,'Parámetro duplicado por nombre y ubicación.',op.id);seenParams.add(key);
      if(p.location==='header'&&['authorization','accept','content-type'].includes(p.name.toLowerCase()))add(at,'Configura Authorization con Seguridad y Content-Type con el cuerpo; estos headers no son parámetros editables.',op.id);
      if(p.location==='path'&&!p.required)add(at,'Los parámetros de ruta deben ser obligatorios.',op.id);
      parameters.push({name:p.name,in:p.location,required:p.required,...(p.description?{description:p.description}:{}),schema:primitive(p,at,op.id)});
    }
    const placeholders=[...op.path.matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]);
    if(op.path.replace(/\{[^{}]+\}/g,'').match(/[{}]/))add('path','Parámetro de ruta con llaves incompletas.',op.id);
    for(const name of placeholders)if(!op.parameters.some(p=>p.location==='path'&&p.name===name))add('parameters',`Declara el parámetro de ruta ${name}.`,op.id);
    for(const p of op.parameters)if(p.location==='path'&&!placeholders.includes(p.name))add('parameters','Hay un parámetro de ruta que no aparece en el path.',op.id);
    if(!op.responses.some(r=>/^2\d\d$/.test(r.code)))add('responses','Declara al menos una respuesta de éxito 2XX concreta.',op.id);
    const responses:Record<string,any>=Object.create(null);
    for(const [i,r]of op.responses.entries()){
      const at=`responses.${i}`;
      if(!/^[1-5]\d\d$/.test(r.code))add(at,'Usa un estado HTTP concreto de tres dígitos entre 100 y 599.',op.id);
      if(Object.hasOwn(responses,r.code))add(at,'Estado HTTP duplicado en la operación.',op.id);
      if(!r.description.trim())add(at,'Describe la respuesta.',op.id);
      if(r.code==='204'&&(r.body!=='none'||r.fields.length))add(at,'La respuesta 204 no puede contener cuerpo ni campos.',op.id);
      if(r.body==='none'&&r.fields.length)add(at,'Retira los campos o elige un cuerpo de tipo objeto.',op.id);
      const response:any={description:r.description};
      if(r.body==='object'){
        if(!r.fields.length)add(at,'Agrega al menos un campo al objeto de respuesta.',op.id);
        const properties:Record<string,any>=Object.create(null),required:string[]=[];
        r.fields.forEach((f,j)=>{if(Object.hasOwn(properties,f.name))add(at,'Nombre de campo duplicado.',op.id);properties[f.name]=primitive(f,`${at}.fields.${j}`,op.id);if(f.required)required.push(f.name);});
        const schemaName=`Response_${op.id.replace(/-/g,'_')}_${i}`;
        schemas[schemaName]={type:'object',description:r.description,properties,...(required.length?{required}:{})};
        response.content={'application/json':{schema:{$ref:`#/components/schemas/${schemaName}`}}};
      }
      responses[r.code]=response;
    }
    paths[op.path]={get:{operationId:op.operationId,summary:op.summary,description:op.description,tags:[api.tag],...(parameters.length?{parameters}:{}),responses}};
  }
  const document:any={openapi:'3.0.1',info:{title:api.title,version:api.version,description:api.description},servers:[{url:api.server}],tags:[{name:api.tag}],'x-drawio-authoring-profile':api.profile,paths};
  if(Object.keys(schemas).length)document.components={schemas};
  if(api.security==='bearer'){document.components={...document.components,securitySchemes:{bearerAuth:{type:'http',scheme:'bearer',bearerFormat:'JWT'}}};document.security=[{bearerAuth:[]}];}
  const yaml=stringify(document,{lineWidth:0});
  let contract;
  if(!issues.length)try{contract=readContract({apiId:api.id,revisionId:'draft-preview',sha256:'draft-preview',format:'yaml',snapshot:yaml});}
  catch(error){add('document',error instanceof Error?error.message:String(error));}
  return {issues,document,yaml,contract};
}
