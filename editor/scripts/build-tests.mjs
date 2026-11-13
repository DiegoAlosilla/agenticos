import {build} from 'esbuild';
await build({entryPoints:['src/bian/assistant.ts'],outfile:'dist/bian-assistant.mjs',bundle:true,platform:'node',format:'esm',target:'node24'});
await build({entryPoints:['src/contracts/index.ts'],outfile:'dist/contracts-core.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
await build({entryPoints:['src/persistence/registry.ts'],outfile:'dist/registry-core.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
await build({entryPoints:['src/persistence/drafts.ts'],outfile:'dist/drafts-core.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
await build({entryPoints:['src/contracts/generate.ts'],outfile:'dist/generation-core.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
await build({entryPoints:['src/bian/search.ts'],outfile:'dist/bian-core.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
await build({entryPoints:['src/bian/reference.ts'],outfile:'dist/bian-reference.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
