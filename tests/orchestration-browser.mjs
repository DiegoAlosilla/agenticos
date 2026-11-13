import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {readFile} from 'node:fs/promises';
import {chromium} from '../editor/node_modules/playwright/index.mjs';
import {projectRoot, writeJson} from '../src/io.js';
import {writeOrchestrationDiagram} from '../src/orchestration-diagram.mjs';

const output = path.join(projectRoot, 'runs', 'orchestration-diagram');
const files = await writeOrchestrationDiagram(output);
const browser = await chromium.launch({headless: true});
const errors = [];
let page;
try {
  page = await browser.newPage({viewport: {width: 1680, height: 1050}});
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(files.html).href);
  assert.equal(await page.locator('.node').count(), 12);
  assert.match(await page.locator('#counter').textContent(), /01 \/ 16/);
  await page.selectOption('#speed', '2500');
  await page.getByRole('button', {name: 'Reproducir', exact: true}).click();
  await page.waitForFunction(() => document.querySelector('#counter').textContent.includes('02 / 16'));
  await page.getByRole('button', {name: 'Pausar', exact: true}).click();
  assert.ok(await page.locator('#path').evaluate(element => element.classList.contains('paused')));
  await page.getByRole('button', {name: 'Reiniciar', exact: true}).click();
  for (const name of ['02 · Corrección técnica', '03 · Decisión del usuario', '04 · Límite de iteraciones']) {
    await page.getByRole('button', {name, exact: true}).click();
    await page.getByRole('button', {name: 'Paso siguiente'}).click();
    assert.match(await page.locator('#counter').textContent(), /02 \/ /);
  }
  await page.getByRole('button', {name: '01 · Recorrido principal', exact: true}).click();
  const clipping = await page.locator('.node').evaluateAll(nodes => nodes.flatMap(node => [...node.querySelectorAll('text')].filter(text => {
    const box = text.getBBox(); return box.x < 0 || box.x + box.width > 270;
  }).map(text => text.textContent)));
  assert.deepEqual(clipping, []);
  await page.screenshot({path: path.join(output, 'preview.png'), fullPage: true});
  await page.setViewportSize({width: 800, height: 1000});
  await page.screenshot({path: path.join(output, 'preview-compact.png'), fullPage: true});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.setViewportSize({width: 1680, height: 1050});
  const xml = await readFile(files.drawio, 'utf8');
  const pages = await page.evaluate(xml => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('XML inválido');
    return [...doc.querySelectorAll('diagram')].map(diagram => {
      const ids = new Set([...diagram.querySelectorAll('[id]')].map(element => element.id));
      const root = diagram.querySelector('object[auditFlow]');
      const flow = JSON.parse(root.getAttribute('auditFlow'));
      return {id: diagram.id, count: flow.steps.length, valid: flow.steps.every(step => ids.has(step.cellId) && ids.has(step.edgeId))};
    });
  }, xml);
  assert.equal(pages.length, 4); assert.ok(pages.every(item => item.valid));

  // Exercise the real fork, not just XML parsing; requires channel:editor on loopback.
  const editor = new URL(process.env.ORCHESTRATION_EDITOR_URL ?? 'http://127.0.0.1:8080/');
  editor.search = '?lang=es&ui=kennedy';
  await page.goto(editor.href);
  await page.waitForFunction(() => !!window.Draw?.loadPlugin);
  await page.evaluate(() => Draw.loadPlugin(ui => window.orchestrationUi = ui));
  await page.waitForFunction(() => !!window.orchestrationUi?.fileNode);
  await page.evaluate(xml => orchestrationUi.setFileData(xml), xml);
  for (const scenario of pages) {
    await page.evaluate(id => {
      const ui = orchestrationUi;
      const target = ui.pages.find(page => page.getId() === id);
      if (ui.currentPage !== target) ui.selectPage(target);
      ui.editor.graph.setSelectionCell(ui.editor.graph.model.getCell(id));
      ui.editor.graph.fit();
    }, scenario.id);
    await page.getByRole('tab', {name: 'Recorrido', exact: true}).click();
    await page.getByRole('button', {name: 'Reproducir', exact: true}).click();
    await page.waitForFunction(() => !!document.querySelector('[data-audit-animation]'));
    assert.equal(await page.locator('[data-audit-animation]').count(), 1);
    await page.getByRole('button', {name: 'Reiniciar', exact: true}).click();
  }
  await page.screenshot({path: path.join(output, 'drawio-preview.png'), fullPage: true});
  assert.deepEqual(errors, []);
  const summary = {htmlPlayback: 'passed', controls: 'passed', compactLayout: 'passed', drawioScenarios: pages, pageErrors: errors};
  await writeJson(path.join(output, 'browser-verification.json'), summary);
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  await page?.screenshot({path: path.join(output, 'browser-failure.png'), fullPage: true});
  throw error;
} finally { await browser.close(); }
