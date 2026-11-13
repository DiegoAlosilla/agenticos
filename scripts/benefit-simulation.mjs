// Simulación Monte Carlo del flujo agéntico de Agenticos por complejidad.
// Modelo: cada fase tiene una duración triangular (min, moda, max) en minutos,
// escalada por el alcance (APIs UX, microservicios, endpoints, servicios producto).
// Incluye rondas de entrevista, consultas al usuario, hallazgos del reviewer con
// corrección, límite de iteraciones y la aprobación humana (líder técnico + arquitecto).
// Misma función se embebe en la presentación para que el lector pueda reproducirla.

export const PROFILES = {
  baja:  { label: 'Baja',  dias: [3, 5],   apis: [1, 1], ms: [1, 1], epPorMs: [1, 2], producto: [1, 1], rondas: [1, 2], pDecision: 0.25, pHallazgo: 0.10 },
  media: { label: 'Media', dias: [7, 10],  apis: [2, 2], ms: [2, 3], epPorMs: [2, 3], producto: [2, 5], rondas: [2, 3], pDecision: 0.45, pHallazgo: 0.12 },
  alta:  { label: 'Alta',  dias: [12, 20], apis: [3, 6], ms: [3, 6], epPorMs: [3, 4], producto: [2, 5], rondas: [3, 4], pDecision: 0.65, pHallazgo: 0.14 },
};

// Generador determinista (mulberry32) para que la simulación sea reproducible.
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const tri = (r, lo, mode, hi) => { const u = r(); const f = (mode - lo) / (hi - lo); return u < f ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode)); };
const intIn = (r, [lo, hi]) => lo + Math.floor(r() * (hi - lo + 1));

// Una corrida del flujo. Devuelve minutos por fase y contadores.
export function runOnce(p, r) {
  const t = { orquestacion: 0, discovery: 0, esperaUsuario: 0, architecture: 0, contract: 0, build: 0, reviewer: 0, correccion: 0, lider: 0, arquitecto: 0 };
  const n = { rondas: 0, preguntas: 0, hallazgos: 0, decisiones: 0, revisiones: 0, estado: 'ready' };
  const apis = intIn(r, p.apis), ms = intIn(r, p.ms), ep = ms * intIn(r, p.epPorMs), prod = intIn(r, p.producto);
  const criterios = Math.round(ep * 1.6 + prod * 0.6 + 2);           // criterios given/when/then a revisar
  const integ = prod + 3;                                             // producto + BD + tópico auditoría + Vault

  // 1. Orchestration-agent: init, carga de protocolo, next/submit por turno (coste fijo por turno, se suma luego)
  t.orquestacion += tri(r, 1, 2, 3);

  // 2. Discovery-agent: rondas de hasta 4 preguntas; el líder técnico responde en sesión sincrónica
  const rondas = intIn(r, p.rondas);
  for (let i = 0; i < rondas; i++) {
    n.rondas++; n.preguntas += 4;
    t.discovery += tri(r, 2, 3, 5);                                   // formular 4 preguntas con contexto
    const espera = tri(r, 4, 8, 20);                                  // el líder técnico piensa y responde
    t.esperaUsuario += espera; t.lider += espera;
    t.orquestacion += 0.5;                                            // answer + next
  }
  t.discovery += tri(r, 3, 5, 8) + criterios * 0.3;                   // consolidar línea base, criterios y submit

  // 3. Architect-agent: consulta catálogo Git + BIAN por integración y diseña servicios UX, etapas y escenarios
  const arch = () => tri(r, 4, 6, 9) + apis * tri(r, 2, 3, 4) + integ * tri(r, 1, 1.5, 2.5) + ep * tri(r, 0.8, 1.2, 1.8);
  t.architecture += arch();

  // 4. Decisión de negocio abierta → handoff a discovery, awaiting_user, reconsolidar y rediseñar
  if (r() < p.pDecision) {
    n.decisiones++;
    const espera = tri(r, 5, 10, 25); t.esperaUsuario += espera; t.lider += espera;
    t.discovery += tri(r, 2, 3, 5);
    t.architecture += arch() * tri(r, 0.3, 0.45, 0.6);
    t.orquestacion += 1;
  }

  // 5. Contract-agent: operaciones, mapeos, componentes, seguridad por endpoint; buildChannel valida y genera
  const contract = (f = 1) => f * (tri(r, 3, 4, 6) + ep * tri(r, 1.5, 2.2, 3.2) + apis * tri(r, 1, 1.5, 2));
  const build = () => tri(r, 0.5, 0.8, 1.5) + apis * 0.2;
  t.contract += contract(); t.build += build();

  // 6. Review-agent: contrasta cada criterio con evidencia; hallazgos devuelven la tarea a su dueño (máx. 3 rondas)
  const review = (f = 1) => f * (tri(r, 3, 4, 6) + criterios * tri(r, 0.4, 0.6, 0.9));
  let abiertos = 0;
  for (let ronda = 1; ronda <= 3; ronda++) {
    n.revisiones++; t.reviewer += review(ronda === 1 ? 1 : 0.6);
    // probabilidad de al menos un hallazgo major/blocker en esta ronda
    const pRonda = ronda === 1 ? 1 - Math.pow(1 - p.pHallazgo, ep) : 0.25;
    if (r() >= pRonda) { abiertos = 0; break; }
    n.hallazgos++; abiertos = 1;
    if (ronda === 3) { n.estado = 'needs_attention'; break; }
    const esArq = r() < 0.3;                                          // 30 % de hallazgos tocan responsabilidades
    t.correccion += (esArq ? arch() * 0.4 : 0) + contract(0.45) + build();
    t.orquestacion += 1;
  }
  if (abiertos && n.estado === 'needs_attention') {                   // el líder decide y se reabre una vez
    const espera = tri(r, 10, 15, 30); t.esperaUsuario += espera; t.lider += espera;
    t.correccion += contract(0.45) + build(); t.reviewer += review(0.6); n.revisiones++;
  }
  t.orquestacion += n.revisiones * 0.5 + 3 * 0.5;                     // next/submit de cada turno

  // 7. Aprobación humana: el líder técnico recorre el Draw.io y el arquitecto aprueba por flujo de autonomía
  const liderRev = tri(r, 15, 25, 40) + ep * tri(r, 0.8, 1.2, 2);
  const arqRev = tri(r, 20, 35, 60) + ep * tri(r, 1, 1.5, 2.5) + integ * 1.5;
  t.lider += liderRev; t.arquitecto += arqRev;
  // una de cada cuatro aprobaciones pide un ajuste menor: contract + build + review corto
  if (r() < 0.25) { t.correccion += contract(0.3) + build(); t.reviewer += review(0.5); t.arquitecto += tri(r, 8, 12, 20); n.revisiones++; }

  const agentes = t.orquestacion + t.discovery + t.architecture + t.contract + t.build + t.reviewer + t.correccion;
  const flujo = agentes + t.esperaUsuario;                            // hasta diseño revisado (ready/draft)
  const total = flujo + liderRev + arqRev + (t.arquitecto - arqRev);  // hasta diagrama aprobado
  return { t, n, alcance: { apis, ms, ep, prod, criterios }, agentes, flujo, total, liderMin: t.lider, arqMin: t.arquitecto };
}

export function simulate(key, runs = 10000, seed = 20261113) {
  const p = PROFILES[key], r = rng(seed);
  const out = [];
  for (let i = 0; i < runs; i++) out.push(runOnce(p, r));
  const pick = (f) => out.map(f).sort((a, b) => a - b);
  const q = (arr, pct) => arr[Math.min(arr.length - 1, Math.floor(pct * arr.length))];
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stat = (f) => { const a = pick(f); return { p10: q(a, 0.1), p50: q(a, 0.5), p90: q(a, 0.9), mean: mean(a) }; };
  const fases = Object.keys(out[0].t);
  const porFase = Object.fromEntries(fases.map(k => [k, mean(out.map(o => o.t[k]))]));
  return {
    key, label: p.label, runs, dias: p.dias,
    agentes: stat(o => o.agentes), flujo: stat(o => o.flujo), total: stat(o => o.total),
    lider: stat(o => o.liderMin), arquitecto: stat(o => o.arqMin),
    porFase,
    rondas: mean(out.map(o => o.n.rondas)), hallazgos: mean(out.map(o => o.n.hallazgos)), decisiones: mean(out.map(o => o.n.decisiones)),
    needsAttention: out.filter(o => o.n.estado === 'needs_attention').length / runs,
    alcance: { apis: mean(out.map(o => o.alcance.apis)), ms: mean(out.map(o => o.alcance.ms)), ep: mean(out.map(o => o.alcance.ep)), prod: mean(out.map(o => o.alcance.prod)), criterios: mean(out.map(o => o.alcance.criterios)) },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fmt = (m) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, '0')}`;
  const res = Object.keys(PROFILES).map(k => simulate(k));
  for (const s of res) {
    console.log(`\n== ${s.label} (${s.dias[0]}–${s.dias[1]} días hoy) · ${s.runs} corridas`);
    console.log(`alcance medio: ${s.alcance.apis.toFixed(1)} APIs · ${s.alcance.ms.toFixed(1)} MS · ${s.alcance.ep.toFixed(1)} endpoints · ${s.alcance.prod.toFixed(1)} producto · ${s.alcance.criterios.toFixed(1)} criterios`);
    console.log(`agentes      P50 ${fmt(s.agentes.p50)}  P90 ${fmt(s.agentes.p90)}  media ${fmt(s.agentes.mean)}`);
    console.log(`flujo (ready) P50 ${fmt(s.flujo.p50)}  P90 ${fmt(s.flujo.p90)}  media ${fmt(s.flujo.mean)}`);
    console.log(`aprobado     P50 ${fmt(s.total.p50)}  P90 ${fmt(s.total.p90)}  media ${fmt(s.total.mean)}`);
    console.log(`líder técnico ${fmt(s.lider.mean)} · arquitecto ${fmt(s.arquitecto.mean)} · rondas ${s.rondas.toFixed(2)} · hallazgos ${s.hallazgos.toFixed(2)} · decisiones ${s.decisiones.toFixed(2)} · needs_attention ${(s.needsAttention * 100).toFixed(1)}%`);
    console.log('fases (min medios): ' + Object.entries(s.porFase).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' · '));
  }
  const fs = await import('node:fs');
  fs.mkdirSync(new URL('../runs/benefit-simulation/', import.meta.url), {recursive: true});
  fs.writeFileSync(new URL('../runs/benefit-simulation/results.json', import.meta.url), JSON.stringify(res, null, 2));
  console.log('\nresultados en runs/benefit-simulation/results.json');
}
