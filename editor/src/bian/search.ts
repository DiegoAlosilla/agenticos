import type {BianCatalog,BianDomain,BianOperation} from './types';

export const QUERY_LIMIT=600;
export const TERM_LIMIT=32;
export const SEARCH_HELP_VERSION='es-en-local/2';
// Local search aids only. Never replace the official titles or definitions.
const aids:Record<string,string[]>={
  consultar:['retrieve'],consulta:['retrieve'],consultas:['retrieve'],obtener:['retrieve'],recuperar:['retrieve'],
  crear:['create','initiate'],iniciar:['initiate'],abrir:['initiate'],apertura:['initiate'],
  actualizar:['update'],modificar:['update'],cambiar:['update'],ejecutar:['execute'],
  solicitar:['request'],solicitud:['request'],evaluar:['evaluate'],evaluacion:['evaluate'],
  registrar:['register','capture'],capturar:['capture'],notificar:['notify'],notificacion:['notify'],
  controlar:['control'],intercambiar:['exchange'],otorgar:['grant'],activar:['activate'],
  cuenta:['account'],cuentas:['account'],corriente:['current'],ahorro:['savings'],ahorros:['savings'],
  saldo:['balance'],saldos:['balance'],movimientos:['transaction'],transacciones:['transaction'],transaccion:['transaction'],
  cliente:['customer'],clientes:['customer'],persona:['party'],personas:['party'],
  prestamo:['loan'],prestamos:['loan'],credito:['credit','loan'],creditos:['credit','loan'],
  personal:['consumer'],personales:['consumer'],consumo:['consumer'],empresa:['corporate'],empresarial:['corporate'],corporativo:['corporate'],oferta:['offer'],ofertas:['offer'],
  pago:['payment'],pagos:['payment'],transferencia:['transfer'],transferencias:['transfer'],
  tarjeta:['card'],tarjetas:['card'],debito:['debit'],deposito:['deposit'],depositos:['deposit'],
  interes:['interest'],intereses:['interest'],comision:['fee'],comisiones:['fee'],
  riesgo:['risk'],riesgos:['risk'],fraude:['fraud'],seguro:['insurance'],seguros:['insurance'],
  consentimiento:['consent'],autorizacion:['authorization'],autorizar:['authorization','authorize'],identidad:['identity'],
  validar:['evaluate','verification'],verificar:['verification'],direccion:['address'],direcciones:['address'],
  efectivo:['cash'],cajero:['atm'],hipoteca:['mortgage'],hipotecas:['mortgage'],
  cobranza:['collection'],cobro:['collection'],cambio:['exchange'],divisas:['currency'],
};
const stops=new Set('a al algo ante con como cual de del desde el ella en es esta este hacer hara la las lo los mi para por que se sin su sus un una unos unas y o the an and of for to in on with will this endpoint api servicio informacion detalles'.split(' '));
function normalize(value:string):string{return value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function tokens(value:string):string[]{return normalize(value.replace(/([a-z])([A-Z])/g,'$1 $2')).match(/[a-z0-9]+/g)??[];}
function words(value:string):Set<string>{return new Set(tokens(value));}
interface QueryTerm{term:string;alternatives:string[];}
export interface BianMatch {domain:BianDomain;score:number;matchedTerms:string[];operations:{operation:BianOperation;score:number;matchedTerms:string[]}[];}
export interface SearchResult {matches:BianMatch[];expansions:{term:string;alternatives:string[]}[];truncated:boolean;terms:string[];}
export function createBianSearch(catalog:BianCatalog){
  const indexed=catalog.domains.map(domain=>({domain,title:words(`${domain.id} ${domain.title}`),definition:words(domain.description),operations:domain.operations.map(operation=>({operation,names:words(`${operation.action} ${operation.operationId} ${operation.path}`),definition:words(`${operation.summary} ${operation.description} ${operation.tags.join(' ')}`)}))}));
  const actions=[...new Set(catalog.domains.flatMap(domain=>domain.operations.map(operation=>operation.action)))].sort();
  function search(purpose:string,action=''):SearchResult{
    const allTerms=[...new Set(tokens(purpose.slice(0,QUERY_LIMIT)).filter(term=>!stops.has(term)))];
    const terms:QueryTerm[]=allTerms.slice(0,TERM_LIMIT).map(term=>({term,alternatives:[term,...(aids[term]??[])]}));
    const expansions=terms.filter(term=>aids[term.term]).map(term=>({term:term.term,alternatives:aids[term.term]}));
    const has=(set:Set<string>,term:QueryTerm)=>term.alternatives.some(alternative=>set.has(alternative)||set.has(alternative+'s'));
    const matches:BianMatch[]=[];
    for(const item of indexed){
      const domainTerms=terms.filter(term=>has(item.title,term)||has(item.definition,term));
      const operations=item.operations.filter(op=>!action||op.operation.action===action).map(op=>{
        const matched=terms.filter(term=>has(item.title,term)||has(item.definition,term)||has(op.names,term)||has(op.definition,term));
        // A domain's own name is stronger evidence than an incidental mention in a definition.
        const titleMatches=terms.filter(term=>has(item.title,term)).length;
        const score=matched.length*100+titleMatches*100+Math.round(titleMatches/Math.max(1,item.title.size)*20)+terms.reduce((total,term)=>total+(has(op.names,term)?6:0)+(has(op.definition,term)?2:0),0);
        return {operation:op.operation,score,matchedTerms:matched.map(term=>term.term)};
      }).sort((a,b)=>b.score-a.score||a.operation.path.split('/').length-b.operation.path.split('/').length||a.operation.path.localeCompare(b.operation.path)||a.operation.method.localeCompare(b.operation.method));
      if(!operations.length){
        const titleMatches=terms.filter(term=>has(item.title,term)).length;
        if(!action&&(!terms.length||domainTerms.length))matches.push({domain:item.domain,score:domainTerms.length*100+titleMatches*100+Math.round(titleMatches/Math.max(1,item.title.size)*20),matchedTerms:domainTerms.map(term=>term.term),operations:[]});
        continue;
      }
      if(terms.length&&operations[0].matchedTerms.length===0)continue;
      matches.push({domain:item.domain,score:operations[0].score+domainTerms.length,matchedTerms:operations[0].matchedTerms,operations});
    }
    matches.sort((a,b)=>b.score-a.score||a.domain.title.localeCompare(b.domain.title));
    return {matches,expansions,truncated:purpose.length>QUERY_LIMIT||allTerms.length>TERM_LIMIT,terms:terms.map(term=>term.term)};
  }
  return {actions,search};
}
