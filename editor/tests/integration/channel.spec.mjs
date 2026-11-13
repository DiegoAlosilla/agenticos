import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

test('catálogo Git y diseño de préstamos en el fork', async ({page, baseURL}) => {
  test.skip(!process.env.CHANNEL_CONTRACTS_DIR, 'Requiere catálogo Business de demostración.');
  const response = await page.request.get('/api/channel-catalog/search?q=');
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({total: 20, skipped: []});
  const external = await page.request.get('/api/channel-catalog/search', {headers: {Origin: 'https://example.org'}});
  expect(external.status()).toBe(403);

  await page.goto('/?lang=es&ui=kennedy');
  await page.waitForFunction(() => !!window.Draw?.loadPlugin);
  await page.evaluate(() => Draw.loadPlugin(ui => window.channelUi = ui));
  await page.waitForFunction(() => !!window.channelUi?.fileNode);
  await page.getByRole('tab', {name: 'Contratos', exact: true}).click();
  await page.getByRole('button', {name: 'Repositorio Business'}).click();
  await page.getByRole('searchbox', {name: 'Busca operación en Git'}).fill('customer lead');
  await page.getByRole('button', {name: 'Buscar', exact: true}).click();
  await page.getByRole('button', {name: /business-customer-lead-v2/}).click();
  await expect(page.locator('.opblock.is-open')).toHaveCount(1);
  await expect(page.locator('.opblock.is-open')).toContainText('/customers/{cxi}/leads');
  const registry = await page.evaluate(() => JSON.parse(channelUi.fileNode.getAttribute('contractsRegistry')));
  expect(registry.revisions).toHaveLength(1);

  const {output} = JSON.parse(execFileSync(process.execPath, ['src/channel-cli.mjs', 'demo'], {cwd: '..', encoding: 'utf8'}));
  const xml = await readFile(path.join(output, 'channel.drawio'), 'utf8');
  const layout = await page.evaluate(data => {
    const document = new DOMParser().parseFromString(data, 'application/xml');
    return [...document.querySelectorAll('diagram')].map(diagram => {
      const cell = id => diagram.querySelector(`[id="${id}"]`);
      const geometry = id => cell(id).querySelector('mxGeometry');
      const coordinate = (id, axis) => Number(geometry(id).getAttribute(axis));
      const layers = [...diagram.querySelectorAll('mxCell[id^="__band-"]')].map(node => node.getAttribute('value'));
      const first = diagram.getAttribute('id');
      const rows = ['__frontend-0', '__apim-0', first, '__dependency-0-0'].map(id => coordinate(id, 'y'));
      const stages = [...diagram.querySelectorAll('object[id^="__frontend-"]')].map(node => coordinate(node.id, 'x'));
      const flow = JSON.parse(cell(first).getAttribute('auditFlow')).steps.map(step => step.cellId);
      return {layers, rows, stages, flow};
    });
  }, xml);
  expect(layout.map(scenario => scenario.stages.length)).toEqual([5, 2]);
  for (const scenario of layout) {
    expect(scenario.layers).toEqual(['Frontend', 'APIM', 'MS en AKS', 'Business / Capa Producto']);
    expect(scenario.rows.every((y, i) => i === 0 || y > scenario.rows[i - 1])).toBe(true);
    expect(scenario.stages.every((x, i) => i === 0 || x > scenario.stages[i - 1])).toBe(true);
    expect(scenario.flow[0]).toBe('__apim-0');
    expect(scenario.flow[2]).toBe('__dependency-0-0');
    expect(scenario.flow.indexOf('__frontend-0')).toBe(scenario.flow.indexOf('__frontend-1') - 1);
  }
  await page.evaluate(data => channelUi.setFileData(data), xml);
  await expect(page.locator('.opblock.is-open')).toContainText('/consumer-loan-applications/Initiate');
  await expect(page.getByRole('button', {name: 'Reproducir', exact: true})).toBeHidden();
  await page.getByRole('tab', {name: 'BIAN', exact: true}).click();
  await expect(page.locator('.ct-bian-operation')).toContainText('POST /CustomerOffer/Initiate');
  await expect(page.locator('.opblock.is-open')).toBeHidden();
  await page.getByRole('tab', {name: 'Recorrido', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Reproducir', exact: true})).toBeVisible();
  await expect(page.locator('.ct-bian-operation')).toBeHidden();
  const labels = await page.evaluate(() => {
    const graph = channelUi.editor.graph;
    return Object.values(graph.model.cells).filter(cell => cell.value?.hasAttribute?.('implementationStatus')).map(cell => {
      const state = graph.view.getState(cell), text = state.text.boundingBox;
      return {id: cell.id, fill: state.style.fillColor, fits: text.x >= state.x && text.y >= state.y &&
        text.x + text.width <= state.x + state.width && text.y + text.height <= state.y + state.height};
    });
  });
  expect(labels.find(cell => cell.id === '__frontend-0').fill).toBe('#ffffff');
  expect(labels.find(cell => cell.id === '__dependency-0-0').fill).toBe('#ffffff');
  expect(labels.find(cell => cell.id === '__apim-0').fill).toBe('#fff2cc');
  expect(labels.find(cell => cell.id === 'aprobado').fill).toBe('#fff2cc');
  expect(labels.filter(cell => !cell.fits)).toEqual([]);
  await page.getByRole('button', {name: 'Reproducir', exact: true}).click();
  await expect(page.locator('[data-audit-animation]')).toHaveCount(1);
  await page.getByRole('button', {name: 'Reiniciar', exact: true}).click();
  await page.getByRole('tab', {name: 'Contratos', exact: true}).click();
  await page.evaluate(() => {
    const graph = channelUi.editor.graph;
    graph.setSelectionCell(graph.model.getCell('__dependency-4-0'));
  });
  await expect(page.locator('.opblock.is-open')).toContainText('/loan-applications/{applicationId}/disbursements');
  await expect(page.locator('.ct-contract-source')).toContainText('Contrato Git');
  const saved = await page.evaluate(() => channelUi.getFileData(true));
  const plain = await page.context().browser().newContext({baseURL});
  let nativeCopy;
  try {
    const native = await plain.newPage();
    await native.goto('/?lang=es&ui=kennedy&contracts=0');
    await native.waitForFunction(() => !!window.Draw?.loadPlugin);
    await native.evaluate(() => Draw.loadPlugin(ui => window.channelUi = ui));
    await native.waitForFunction(() => !!window.channelUi?.fileNode);
    nativeCopy = await native.evaluate(data => {
      channelUi.setFileData(data);
      const graph = channelUi.editor.graph;
      graph.cellLabelChanged(graph.model.getCell('__apim-0'), 'APIM revisado');
      return channelUi.getFileData(true);
    }, saved);
    await expect(native.getByRole('tab', {name: 'Contratos', exact: true})).toHaveCount(0);
  } finally { await plain.close(); }
  const clean = await page.context().browser().newContext({baseURL});
  try {
    const reopened = await clean.newPage();
    await reopened.goto('/?lang=es&ui=kennedy');
    await reopened.waitForFunction(() => !!window.Draw?.loadPlugin);
    await reopened.evaluate(() => Draw.loadPlugin(ui => window.channelUi = ui));
    await reopened.waitForFunction(() => !!window.channelUi?.fileNode);
    await reopened.evaluate(data => channelUi.setFileData(data), nativeCopy);
    expect(await reopened.evaluate(() => channelUi.editor.graph.getLabel(channelUi.editor.graph.model.getCell('__apim-0')))).toBe('APIM revisado');
    await expect(reopened.locator('.opblock.is-open')).toContainText('/consumer-loan-applications/Initiate');
    await reopened.getByRole('tab', {name: 'Recorrido', exact: true}).click();
    await expect(reopened.getByRole('button', {name: 'Reproducir', exact: true})).toBeVisible();
  } finally { await clean.close(); }
});
