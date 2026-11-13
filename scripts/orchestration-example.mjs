import {qualityTopics} from '../src/orchestration.mjs';

// Synthetic role deliveries for a reproducible example; these are not LLM output.
export function example() {
  const discovery = {
    requirements: [{id: 'REQ-001', statement: 'Devolver una oferta ficticia identificada sin guardar datos de cliente.', status: 'confirmed',
      source: 'Petición ficticia de la demo', acceptance: [{id: 'AC-001', given: 'Una petición válida', when: 'Se inicia una oferta ficticia', then: 'La respuesta 201 contiene offerId obligatorio.'}]}],
    decisions: [{id: 'DEC-001', statement: 'Un UX sin persistencia genera la oferta ficticia.', rationale: 'La demo comprueba contratos y orquestación, sin operaciones financieras reales.'}],
    questions: [], quality: qualityTopics.map(topic => ({topic, status: 'not-applicable', rationale: `Demo sintética sin servicio desplegado; ${topic} debe evaluarse en un diseño de negocio real.`})),
  };
  const proposal = {
    spec: {version: 1, project: 'Oferta ficticia · demo de orquestación', frontend: 'Canal ficticio', goal: discovery.requirements[0].statement,
      decisions: discovery.decisions.map(item => item.statement), pending: [],
      services: [{id: 'offer-ux', title: 'Offer UX ficticio', responsibility: 'Generar una oferta ilustrativa sin persistencia.'}],
      stages: [{id: 'create-offer', title: 'Crear oferta ficticia', purpose: 'Devolver un identificador de oferta ficticia.', service: 'offer-ux',
        rules: ['No se guardan datos de cliente.'], calls: [], bian: {domain: 'CustomerOffer', method: 'POST', path: '/CustomerOffer/Initiate'},
        operation: {method: 'POST', path: '/offers/Initiate', responses: {'201': {description: 'Oferta ficticia creada', content: {'application/json': {schema: {type: 'object', required: ['offerId'], properties: {offerId: {type: 'string'}}}}}}}}, success: '201'}],
      scenarios: [{id: 'principal', title: 'Oferta ficticia creada', steps: [{stage: 'create-offer'}]}]},
    traceability: [{requirementId: 'REQ-001', stageId: 'create-offer', scenarioId: 'principal', criterionIds: ['AC-001'], decisionIds: ['DEC-001']}],
  };
  return {discovery, proposal};
}

export function review(state, {fail = false, resolutions = []} = {}) {
  return {baselineVersion: state.baselineVersion, artifactDigest: state.artifact.digest,
    coverage: [{criterionId: 'AC-001', result: fail ? 'fail' : 'pass', evidence: 'contracts/offer-ux.openapi.yaml → POST /offers/Initiate → 201 → schema.required', ...(fail && {findingId: 'REV-001'})}],
    findings: fail ? [{id: 'REV-001', code: 'REQUIRED_OFFER_ID', target: 'create-offer.responses.201', owner: 'contract', severity: 'major',
      claim: 'offerId no es obligatorio en la respuesta.', evidence: 'schema.required no contiene offerId, pero AC-001 lo exige.', closure: 'Declarar offerId obligatorio en la respuesta 201.'}] : [], resolutions};
}
