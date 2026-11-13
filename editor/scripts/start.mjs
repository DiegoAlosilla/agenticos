import {bootstrap, root} from './bootstrap.mjs';
import {readFile, stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve, extname} from 'node:path';

try {
  const webroot = await bootstrap();
  const {buildPlugin} = await import('./build.mjs');
  await buildPlugin();
  const {createBianAssistant}=await import('./bian-ai.mjs');
  const handleBianAi=await createBianAssistant(root);
  const handleChannelCatalog = process.env.CHANNEL_CONTRACTS_DIR
    ? (await import('./channel-catalog.mjs')).createChannelCatalogHandler(process.env.CHANNEL_CONTRACTS_DIR)
    : async () => false;
  const port = Number(process.env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un entero entre 1 y 65535.');
  const mime = {'.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.css':'text/css',
    '.xml':'application/xml', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.gif':'image/gif',
    '.woff2':'font/woff2', '.woff':'font/woff', '.ico':'image/x-icon'};
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      if(await handleBianAi(req,res,url))return;
      if(await handleChannelCatalog(req,res,url))return;
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
      let path = decodeURIComponent(url.pathname);
      if (path.includes('..') || path.includes('\\') || path.includes('\0')) { res.writeHead(400); res.end(); return; }
      if (path === '/health') { res.writeHead(200); res.end('ok'); return; }
      let file;
      if (path === '/js/PreConfig.js') file = resolve(root, 'config/PreConfig.js');
      else if (path === '/js/PostConfig.js') file = resolve(root, 'config/PostConfig.js');
      else if (path === '/plugins/contracts.js') file = resolve(root, 'dist/contracts.js');
      else {
        if (path === '/') path = '/index.html';
        file = resolve(webroot, '.' + path);
        if (!file.startsWith(webroot + '/') && !file.startsWith(webroot + '\\')) throw new Error('Invalid path');
      }
      if (!(await stat(file)).isFile()) throw new Error('Not a file');
      const body = await readFile(file);
      res.writeHead(200, {'Content-Type': mime[extname(file)] || 'application/octet-stream'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404); res.end('Recurso no disponible en la distribución local.'); }
  });
  server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Puerto ${port} ocupado. Use otro puerto, por ejemplo $env:PORT=${port === 65535 ? 8080 : port + 1} y npm start.` : error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Draw.io local: http://127.0.0.1:${port}/?lang=es&ui=kennedy&mode=device&gapi=0&db=0&od=0&gh=0&gl=0&tr=0&browser=0&picker=0&stealth=1&math=0\nDetener: Ctrl+C.${process.env.CHANNEL_CONTRACTS_DIR ? '\nCatálogo Git de solo lectura habilitado.' : ''}`));
} catch (error) { console.error(`Arranque fallido: ${error.message}`); process.exitCode = 1; }
