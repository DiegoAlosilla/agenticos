import {build} from 'esbuild';
import {root} from './bootstrap.mjs';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
export async function buildPlugin() {
  await build({entryPoints:[resolve(root,'src/contracts/index.ts')],outfile:resolve(root,'dist/contracts-core.mjs'),bundle:true,platform:'node',format:'esm',target:'node24',packages:'external'});
  await build({entryPoints:[resolve(root,'src/bian/assistant.ts')],outfile:resolve(root,'dist/bian-assistant.mjs'),bundle:true,platform:'node',format:'esm',target:'node24'});
  await build({entryPoints: [resolve(root, 'src/plugin.ts')], outfile: resolve(root, 'dist/contracts.js'),
    bundle: true, format: 'iife', target: 'es2022', sourcemap: true,
    plugins: [{name: 'raw', setup(builder) {
      builder.onResolve({filter: /\?raw$/}, args => ({path: resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw'}));
      builder.onLoad({filter: /.*/, namespace: 'raw'}, async args => ({contents: await readFile(args.path, 'utf8'), loader: 'text'}));
    }}]});
}
if (process.argv[1]?.endsWith('build.mjs')) await buildPlugin();
