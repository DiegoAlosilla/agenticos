import {channelCatalog} from '../../src/channel-catalog.mjs';

export function createChannelCatalogHandler(repo) {
  return async (req, res, url) => {
    if (!url.pathname.startsWith('/api/channel-catalog/')) return false;
    const send = (status, payload) => {
      res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify(payload));
    };
    const host = req.headers.host ?? '';
    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host) || req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== `http://${host}`)) {
      send(403, {error: 'Origen no permitido.'});
    } else if (req.method !== 'GET') {
      send(405, {error: 'Usa GET.'});
    } else if (!repo) {
      send(404, {error: 'Inicia el editor con npm run channel:editor o configura CHANNEL_CONTRACTS_DIR.'});
    } else if (url.pathname === '/api/channel-catalog/search') {
      try {
        const catalog = await channelCatalog(repo);
        send(200, await catalog.search(url.searchParams.get('q') ?? ''));
      } catch { send(503, {error: 'Catálogo Git no disponible. Comprueba la carpeta configurada y su revisión.'}); }
    } else if (url.pathname === '/api/channel-catalog/contract') {
      const commit = url.searchParams.get('commit') ?? '';
      if (!/^[a-f0-9]{40,64}$/.test(commit)) { send(400, {error: 'Revisión inválida.'}); return true; }
      try {
        const catalog = await channelCatalog(repo, commit);
        const contract = await catalog.read(url.searchParams.get('file'));
        send(200, {revision: contract.revision});
      } catch { send(404, {error: 'El contrato no está disponible en esa revisión.'}); }
    } else send(404, {error: 'Ruta de catálogo no disponible.'});
    return true;
  };
}
