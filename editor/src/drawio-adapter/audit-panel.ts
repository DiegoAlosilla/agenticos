// Audit metadata is ordinary mxCell XML. Playback only decorates the live view.
declare const mxEvent: any;
declare const mxCellHighlight: any;

interface Evidence { file: string; startLine: number; endLine: number; quote: string; claim: string; sha256?: string }
interface Step { cellId: string; edgeId?: string; direction: 'request' | 'response'; label: string }

export function installAuditPanel(ui: any) {
  const graph = ui.editor.graph;
  const panel = document.createElement('section');
  panel.className = 'ct-audit-panel';
  panel.setAttribute('aria-label', 'Evidencia y recorrido');
  let selected: any;
  let steps: Step[] = [];
  let index = 0;
  let playing = false;
  let frame = 0;
  let started = 0;
  let elapsed = 0;
  let highlight: any;
  let dot: SVGCircleElement | undefined;
  let status = document.createElement('p');
  let play = document.createElement('button');
  const duration = 1500;

  function clearOverlay() {
    highlight?.destroy();
    highlight = undefined;
    dot?.remove();
    dot = undefined;
  }
  function pause() {
    playing = false;
    cancelAnimationFrame(frame);
    play.textContent = 'Reproducir';
  }
  function reset() {
    pause();
    clearOverlay();
    index = 0;
    elapsed = 0;
  }
  function paint(progress: number) {
    const step = steps[index];
    const cell = graph.model.getCell(step.cellId);
    const state = cell && graph.view.getState(cell);
    const color = step.direction === 'response' ? '#14804a' : '#1769e0';
    if (!highlight && state) {
      if (selected && graph.getAttributeForCell(selected, 'designChannel', '') === '1') graph.scrollCellToVisible(cell);
      highlight = new mxCellHighlight(graph, color, 4);
      highlight.highlight(state);
    }
    const edge = step.edgeId && graph.model.getCell(step.edgeId);
    let points = edge && graph.view.getState(edge)?.absolutePoints?.filter(Boolean);
    if (!points || points.length < 2) {
      if (!state) throw Error(`Figura ausente en esta página: ${step.cellId}`);
      points = [{x: state.x, y: state.y + state.height / 2}, {x: state.x + state.width, y: state.y + state.height / 2}];
    }
    const lengths: number[] = [];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      lengths.push(length);
      total += length;
    }
    let distance = total * progress;
    let segment = 0;
    while (segment < lengths.length - 1 && distance > lengths[segment]) distance -= lengths[segment++];
    const fraction = lengths[segment] ? distance / lengths[segment] : 0;
    const from = points[segment], to = points[segment + 1];
    if (!dot) {
      dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '7');
      dot.setAttribute('pointer-events', 'none');
      dot.setAttribute('data-audit-animation', 'true');
      graph.view.getOverlayPane().appendChild(dot);
    }
    dot.setAttribute('fill', color);
    dot.setAttribute('cx', String(from.x + (to.x - from.x) * fraction));
    dot.setAttribute('cy', String(from.y + (to.y - from.y) * fraction));
    status.textContent = `${index + 1}/${steps.length} · ${step.direction === 'response' ? 'Respuesta' : 'Petición'} · ${step.label}`;
  }
  function tick(now: number) {
    if (!playing) return;
    elapsed = now - started;
    try {
      paint(Math.min(elapsed / duration, 1));
      if (elapsed >= duration) {
        if (index === steps.length - 1) { pause(); return; }
        index++;
        elapsed = 0;
        started = now;
        clearOverlay();
      }
      frame = requestAnimationFrame(tick);
    } catch (error) { pause(); clearOverlay(); status.textContent = String(error); }
  }
  function text(tag: string, value: string) {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }
  function render() {
    reset();
    panel.replaceChildren();
    steps = [];
    const cell = graph.getSelectionCell();
    selected = cell;
    const evidenceRaw = cell && graph.getAttributeForCell(cell, 'auditEvidence', '');
    const flowRaw = cell && graph.getAttributeForCell(cell, 'auditFlow', '');
    const designRaw = cell && graph.getAttributeForCell(cell, 'designDecisions', '');
    const endpoint = flowRaw ? cell : findEndpoint();
    if (!flowRaw && endpoint) {
      const go = text('button', 'Ir al inicio del recorrido');
      go.className = 'geBtn';
      go.onclick = () => {graph.setSelectionCell(endpoint);graph.scrollCellToVisible(endpoint);};
      panel.append(go);
    }
    if (!evidenceRaw && !flowRaw && !designRaw) {
      if (!endpoint) panel.append(text('p','Selecciona una figura con recorrido o evidencia.'));
      return;
    }
    panel.append(text('h3', designRaw ? 'Diseño propuesto · recorrido y criterios' : 'Evidencia y recorrido'));
    try {
      if (flowRaw) {
        const flow = JSON.parse(flowRaw);
        if (flow.version !== 1 || !Array.isArray(flow.steps) || flow.steps.length > 500) throw Error('Versión o pasos de recorrido no compatibles.');
        steps = flow.steps;
        if (steps.some(step => typeof step.cellId !== 'string' || typeof step.label !== 'string' || !['request', 'response'].includes(step.direction))) throw Error('El recorrido contiene un paso inválido.');
        panel.append(text('p', designRaw ? 'Comportamiento esperado · azul petición · verde respuesta' : 'Recorrido descriptivo del análisis · azul petición · verde respuesta'));
        status = text('p', steps.length ? `${steps.length} pasos disponibles` : 'Sin pasos') as HTMLParagraphElement;
        status.setAttribute('role', 'status');
        play = document.createElement('button');
        play.textContent = 'Reproducir';
        play.disabled = !steps.length;
        play.onclick = () => {
          if (playing) { pause(); return; }
          if (index === steps.length - 1 && elapsed >= duration) { index = 0; elapsed = 0; clearOverlay(); }
          playing = true;
          play.textContent = 'Pausar';
          started = performance.now() - elapsed;
          frame = requestAnimationFrame(tick);
        };
        const next = text('button', 'Siguiente paso') as HTMLButtonElement;
        next.disabled = !steps.length;
        next.onclick = () => {
          pause(); clearOverlay();
          if (elapsed > 0) index = Math.min(index + 1, steps.length - 1);
          elapsed = duration;
          try { paint(1); } catch (error) { status.textContent = String(error); }
        };
        const restart = text('button', 'Reiniciar') as HTMLButtonElement;
        restart.onclick = () => { reset(); status.textContent = `${steps.length} pasos disponibles`; };
        panel.append(play, next, restart, status);
      }
      if (designRaw) {
        const decisions = JSON.parse(designRaw);
        if (!Array.isArray(decisions) || decisions.length > 500) throw Error('Criterios de diseño inválidos.');
        for (const decision of decisions) {
          if (typeof decision?.id !== 'string' || typeof decision.text !== 'string') throw Error('Criterio de diseño inválido.');
          const criterion = text('p', `${decision.id} · ${decision.text}`);
          criterion.style.whiteSpace = 'normal';
          panel.append(criterion);
        }
      }
      if (evidenceRaw) {
        const evidence = JSON.parse(evidenceRaw);
        if (evidence.version !== 1 || !Array.isArray(evidence.entries) || evidence.entries.length > 500) throw Error('Versión o evidencia no compatible.');
        if (evidence.revision) panel.append(text('p', `Revisión analizada · ${String(evidence.revision)}`));
        for (const entry of evidence.entries as Evidence[]) {
          if (typeof entry.file !== 'string' || !Number.isInteger(entry.startLine) || !Number.isInteger(entry.endLine) || typeof entry.quote !== 'string' || typeof entry.claim !== 'string') throw Error('Entrada de evidencia inválida.');
          const details = document.createElement('details');
          details.append(text('summary', `${entry.file} · líneas ${entry.startLine}–${entry.endLine}`));
          details.append(text('p', entry.claim), text('pre', entry.quote));
          if (entry.sha256) details.append(text('p', `SHA-256 · ${entry.sha256}`));
          panel.append(details);
        }
      }
    } catch (error) { reset(); panel.append(text('p', `No se pudo interpretar la auditoría · ${String(error)}`)); }
  }
  graph.getSelectionModel().addListener(mxEvent.CHANGE, render);
  graph.model.addListener(mxEvent.CHANGE, () => { if (selected) render(); });
  function findEndpoint():any {
    return Object.values(graph.model.cells).find((cell: any) =>
      cell.value?.getAttribute?.('auditFlow') && cell.value?.getAttribute?.('contractRef'));
  }
  function focusAudit() {
    const endpoint = findEndpoint();
    if (endpoint) {
      graph.setSelectionCell(endpoint);
      if (graph.getAttributeForCell(endpoint, 'designChannel', '') === '1') graph.scrollCellToVisible(endpoint);
      else graph.fit(30);
    }
    render();
  }
  // Embed loads replace the graph root without firing the fileLoaded event.
  // Wait until the editor has restored its page and selection state.
  graph.addListener(mxEvent.ROOT, () => requestAnimationFrame(focusAudit));
  ui.editor.addListener('fileLoaded', () => requestAnimationFrame(focusAudit));
  ui.editor.addListener('pageSelected', render);
  window.addEventListener('pagehide', reset);
  render();
  return {element:panel,pause};
}
