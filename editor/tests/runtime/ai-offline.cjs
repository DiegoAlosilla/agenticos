// Test-only: retain real fetch for loopback Ollama; block every external Node destination.
const originalFetch=globalThis.fetch;
require('./offline.cjs');
globalThis.fetch=function(input,options){
  const url=new URL(typeof input==='string'?input:input.url);
  if(url.protocol!=='http:'||url.hostname!=='127.0.0.1')throw Error('OFFLINE_TEST: fetch externo prohibido');
  return originalFetch(input,{...options,redirect:'error'});
};
