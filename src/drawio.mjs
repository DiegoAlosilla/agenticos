const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;').replaceAll('\n', '&#10;').replaceAll('\r', '&#13;');
const attr = values => Object.entries(values).map(([key, value]) => `${key}="${xml(typeof value === 'object' ? JSON.stringify(value) : value)}"`).join(' ');

function componentPorts(steps, positions) {
  const links = new Map();
  for (const step of steps) {
    const pair = [step.from, step.to].sort().join(':');
    if (!links.has(pair)) links.set(pair, []);
    links.get(pair).push(step);
  }
  return steps.map(step => {
    const pair = links.get([step.from, step.to].sort().join(':'));
    const slot = (pair.indexOf(step) + 1) / (pair.length + 1);
    const [fromX, fromY] = positions[step.from];
    const [toX, toY] = positions[step.to];
    if (fromX === toX) return fromY < toY ? [slot, 1, slot, 0] : [slot, 0, slot, 1];
    return fromX < toX ? [1, slot, 0, slot] : [0, slot, 1, slot];
  });
}

export function renderDrawio(audit, {layout, type = 'components'} = {}) {
  const sequence = type === 'sequence';
  const pages = audit.endpoints.map(endpoint => {
    const pageLayout = layout?.pages?.[endpoint.id];
    const flow = {version: 1, steps: endpoint.steps.map((step, i) => ({cellId: step.to, edgeId: `__audit_edge_${i}`, direction: step.direction, label: step.label}))};
    function vertex(id, label, x, y, fill, metadata = {}, shape = 'rounded=1') {
      const presentation = pageLayout?.vertices?.[id];
      const height = presentation?.height ?? (sequence ? 110 + endpoint.steps.length * 48 : 100);
      const style = sequence ? 'shape=umlLifeline;size=56' : shape;
      const spacing = presentation ? `spacingLeft=${shape === 'shape=component' ? 20 : 12};spacingRight=12;spacingTop=8;spacingBottom=8;fontColor=#1e293b;${presentation.pending ? 'dashed=1;' : ''}` : '';
      return `<object ${attr({id, label, ...metadata})}><mxCell vertex="1" parent="1" style="${style};whiteSpace=wrap;html=0;fillColor=${presentation?.fill ?? fill};strokeColor=#64748b;fontSize=14;${spacing}"><mxGeometry x="${x}" y="${y}" width="${layout?.nodeWidth ?? 200}" height="${height}" as="geometry"/></mxCell></object>`;
    }
    const sourceMetadata = item => audit.design
      ? {designDecisions: item.decisions ?? [], ...item.metadata}
      : {auditEvidence: {version: 1, entries: item.evidence, revision: audit.git.revision, fingerprint: audit.repositoryFingerprint}};
    const endpointLabel = endpoint.label ?? `${endpoint.title || audit.service}\n${endpoint.method} ${endpoint.path}`;
    const binding = item => item.operationRef ? {contractRef: item.operationRef, contractState: 'linked'} : {};
    const endpointMetadata = {...binding(endpoint), ...sourceMetadata(endpoint), auditFlow: flow};
    const components = {
      api: ['#f1f5f9', 'rounded=1'], service: ['#dbeafe', 'shape=component'],
      cache: ['#fee2e2', 'shape=cylinder3;size=15'], database: ['#dcfce7', 'shape=cylinder3;size=15'],
      event: ['#f3e8ff', 'rounded=1']
    };
    const positions = {[endpoint.id]: [80, 100]};
    endpoint.dependencies.forEach((dep, i) => {
      positions[dep.id] = sequence ? [80 + (i + 1) * 245, 100] : [460 + (i % 2) * 350, 100 + Math.floor(i / 2) * 200];
    });
    Object.assign(positions, pageLayout?.positions ?? layout?.positions);
    const portsByStep = sequence ? endpoint.steps.map((_, i) => {
      const y = (100 + i * 48) / (110 + endpoint.steps.length * 48);
      return [0.5, y, 0.5, y];
    }) : pageLayout?.ports ?? layout?.ports ?? componentPorts(endpoint.steps, positions);
    const cells = (pageLayout?.bands ?? []).map(({id, label, x, y, width, height}) =>
      `<mxCell ${attr({id, value: label})} vertex="1" parent="1" style="shape=umlFrame;whiteSpace=wrap;html=0;tabWidth=205;tabHeight=27;align=left;verticalAlign=top;spacingLeft=12;spacingTop=5;fillColor=none;strokeColor=#8796a8;fontStyle=1;pointerEvents=0;"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/></mxCell>`);
    cells.push(vertex(endpoint.id, endpointLabel, ...positions[endpoint.id], '#dae8fc', endpointMetadata, 'shape=component'));
    endpoint.dependencies.forEach((dep, i) => {
      const [fill, shape] = components[dep.kind];
      cells.push(vertex(dep.id, dep.label, ...positions[dep.id], dep.pending ? '#fff2cc' : fill, {...binding(dep), ...sourceMetadata(dep)}, shape));
    });
    endpoint.steps.forEach((step, i) => {
      const response = step.direction === 'response';
      const [exitX, exitY, entryX, entryY] = portsByStep[i];
      const ports = `exitX=${exitX};exitY=${exitY};entryX=${entryX};entryY=${entryY};`;
      const label = `${i + 1}. ${step.label}`;
      const labelOffset = pageLayout?.labelOffsets?.[i] ?? layout?.labelOffsets?.[i];
      const offset = labelOffset ? `<mxPoint x="${labelOffset[0]}" y="${labelOffset[1]}" as="offset"/>` : '';
      const routing = sequence ? 'exitPerimeter=0;entryPerimeter=0;' : 'edgeStyle=orthogonalEdgeStyle;rounded=1;';
      cells.push(`<object ${attr({id: `__audit_edge_${i}`, label, ...sourceMetadata(step)})}><mxCell edge="1" parent="1" source="${xml(step.from)}" target="${xml(step.to)}" style="${routing}html=0;endArrow=block;labelBackgroundColor=#ffffff;${ports}strokeColor=${response ? '#15803d' : '#2563eb'};${response ? 'dashed=1;' : ''}"><mxGeometry relative="1" as="geometry">${offset}</mxGeometry></mxCell></object>`);
    });
    const bottom = sequence ? 250 + endpoint.steps.length * 48 : Math.max(...Object.values(positions).map(([, y]) => y)) + 160;
    endpoint.findings.forEach((finding, i) => cells.push(vertex(`__audit_finding_${i}`, `${finding.severity.toUpperCase()}\n${finding.claim}`, 80 + (i % 3) * 340, bottom + Math.floor(i / 3) * 140, '#fff2cc', sourceMetadata(finding))));
    if (!layout) cells.push(vertex('__audit_scope', 'Análisis estático con evidencia de código.\nLa animación explica pasos descritos en la auditoría.', 80, bottom + Math.ceil(endpoint.findings.length / 3) * 140, '#f5f5f5'));
    return `<diagram ${attr({id: endpoint.id, name: endpoint.pageName ?? `${endpoint.method} ${endpoint.path}`})}><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile ${attr({host: 'Backend Copilot', contractsRegistry: audit.registry})}>${pages.join('')}</mxfile>\n`;
}
