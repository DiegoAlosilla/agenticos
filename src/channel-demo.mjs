import {channelCatalog} from './channel-catalog.mjs';

const schema = name => {
  if (['requestedAmount', 'amount', 'approvedAmount', 'monthlyPayment', 'annualRate'].includes(name)) return {type: 'number'};
  if (name === 'termMonths') return {type: 'integer'};
  if (name === 'accepted') return {type: 'boolean'};
  return {type: 'string'};
};
const content = names => ({'application/json': {schema: {type: 'object', required: names, properties: Object.fromEntries(names.map(name => [name, schema(name)]))}}});
const response = (description, ...names) => ({description, content: content(names)});

export async function loanDemo(repo) {
  const catalog = await channelCatalog(repo);
  const service = 'channel-consumer-loan';
  const call = async (name, method, path, purpose, outcome, fields) => {
    const file = `contracts/${name}.openapi.json`;
    const {contract} = await catalog.operation(file, method, path);
    return {layer: 'Business', purpose, outcome, mapping: fields.map(([from, to]) => ({from, to})), contract: {file, method, path, sha256: contract.revision.sha256}};
  };
  const [person, application, evaluation, simulation, ownership, confirmation, disbursement] = await Promise.all([
    call('business-person-v5', 'GET', '/people/{cxi}', 'Recuperar perfil por CXI', 'Perfil del cliente', [['sesión.cxi', 'path.cxi']]),
    call('business-loan-application-v1', 'POST', '/loan-applications', 'Registrar solicitud', 'ID de solicitud', [['sesión.cxi', 'body.cxi'], ['UX.requestedAmount', 'body.requestedAmount']]),
    call('business-credit-assessment-v1', 'POST', '/credit-assessments', 'Evaluar al solicitante', 'Evaluación aprobada', [['UX.applicationId', 'body.applicationId'], ['sesión.cxi', 'body.cxi'], ['UX.requestedAmount', 'body.requestedAmount']]),
    call('business-loan-simulation-v2', 'POST', '/loan-simulations', 'Calcular cuota, tasa y plazo', 'Simulación con ID', ['applicationId', 'assessmentId', 'amount', 'termMonths'].map(name => [`UX.${name}`, `body.${name}`])),
    call('business-account-ownership-v1', 'GET', '/accounts/{accountId}/ownership', 'Validar cuenta de abono', 'Titularidad verificada', [['UX.destinationAccountId', 'path.accountId']]),
    call('business-loan-confirmation-v1', 'POST', '/loan-applications/{applicationId}/confirmations', 'Registrar datos y aceptación', 'ID de confirmación', [['UX.applicationId', 'path.applicationId'], ...['simulationId', 'destinationAccountId', 'accepted'].map(name => [`UX.${name}`, `body.${name}`])]),
    call('business-loan-disbursement-v2', 'POST', '/loan-applications/{applicationId}/disbursements', 'Ejecutar el desembolso', 'ID y estado del desembolso', [['UX.applicationId', 'path.applicationId'], ['UX.confirmationId', 'body.confirmationId'], ['UX.destinationAccountId', 'body.destinationAccountId'], ['UX.Idempotency-Key', 'header.Idempotency-Key']]),
  ]);
  const stage = ({id, title, purpose, method, path, inputs, outputs, code, calls, bian, rules, extra = {}, idempotent = false}) => ({
    id, title, purpose, service, calls, bian, rules, success: code,
    operation: {method, path, parameters: [...[...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({in: 'path', name, required: true, schema: {type: 'string'}})),
      ...(idempotent ? [{in: 'header', name: 'Idempotency-Key', required: true, schema: {type: 'string'}}] : [])],
      requestBody: {required: true, content: content(inputs)}, responses: {[code]: response('Operación completada', ...outputs), '400': response('Entrada inválida', 'code'), ...extra}},
  });
  const stages = [
    stage({id: 'inicio', title: 'Iniciar solicitud', purpose: 'Abrir una solicitud de préstamo de consumo y recuperar el perfil a partir del CXI de la sesión.',
      method: 'POST', path: '/consumer-loan-applications/Initiate', inputs: ['requestedAmount'], outputs: ['applicationId', 'status'], code: '201', calls: [person, application],
      bian: {domain: 'CustomerOffer', method: 'POST', path: '/CustomerOffer/Initiate'}, rules: ['El canal entrega una sesión autenticada. El UX usa su CXI y delega el registro a Business.'] }),
    stage({id: 'evaluacion', title: 'Evaluar crédito', purpose: 'Solicitar una evaluación crediticia para el importe propuesto.',
      method: 'POST', path: '/consumer-loan-applications/{applicationId}/credit-assessment/Evaluate', inputs: ['requestedAmount'], outputs: ['assessmentId', 'decision', 'approvedAmount'], code: '200', calls: [evaluation],
      rules: ['Una evaluación rechazada termina el recorrido antes de la simulación.'], extra: {'422': response('Evaluación rechazada', 'assessmentId', 'decision')} }),
    stage({id: 'simulacion', title: 'Simular préstamo', purpose: 'Calcular y guardar una simulación para una evaluación aprobada.',
      method: 'POST', path: '/consumer-loan-applications/{applicationId}/simulation/Evaluate', inputs: ['assessmentId', 'amount', 'termMonths'], outputs: ['simulationId', 'monthlyPayment', 'annualRate', 'termMonths'], code: '201', calls: [simulation],
      rules: ['El usuario puede pedir más de una simulación. La confirmación indica la simulación elegida.'] }),
    stage({id: 'confirmacion', title: 'Confirmar datos', purpose: 'Verificar la titularidad de la cuenta y registrar la aceptación de la simulación.',
      method: 'PUT', path: '/consumer-loan-applications/{applicationId}/confirmation/Exchange', inputs: ['simulationId', 'destinationAccountId', 'accepted'], outputs: ['confirmationId', 'status'], code: '200', calls: [ownership, confirmation],
      bian: {domain: 'CustomerOffer', method: 'PUT', path: '/CustomerOffer/{customerofferid}/Exchange'}, rules: ['Si la cuenta no es del solicitante o no está vigente, no se registra la confirmación.'] }),
    stage({id: 'desembolso', title: 'Ejecutar desembolso', purpose: 'Ejecutar el abono sobre una solicitud ya confirmada y devolver la referencia de Business.',
      method: 'PUT', path: '/consumer-loan-applications/{applicationId}/disbursement/Execute', inputs: ['confirmationId', 'destinationAccountId'], outputs: ['disbursementId', 'status'], code: '200', calls: [disbursement], idempotent: true,
      bian: {domain: 'Disbursement', method: 'PUT', path: '/Disbursement/{disbursementid}/Execute'}, rules: ['UX propaga la misma clave de idempotencia a Business para repetir una solicitud.'], extra: {'409': response('Conflicto de idempotencia', 'code')} }),
  ];
  return {
    version: 1, project: 'Préstamo de consumo · Demo ficticia', frontend: 'Banca digital', catalogCommit: catalog.commit,
    goal: 'Diseñar el recorrido desde la solicitud hasta el desembolso usando contratos Business ficticios y una API UX por definir.',
    decisions: ['La demo propone un servicio UX porque las cinco operaciones pertenecen al mismo recorrido y tienen el mismo dueño. Business conserva las responsabilidades de negocio.',
      'Se conserva el ID de solicitud como correlación de las cinco etapas. Los contratos UX se generan desde el diseño acordado.'],
    services: [{id: service, title: 'Customer Channel NHBK Consumer Loan', responsibility: 'Orquestar la experiencia de solicitud de préstamo de consumo desde banca digital.',
      components: {securitySchemes: {channelSession: {type: 'http', scheme: 'bearer'}}}, security: [{channelSession: []}]}],
    stages,
    scenarios: [{id: 'aprobado', title: 'Solicitud aprobada', steps: stages.map(({id}) => ({stage: id}))},
      {id: 'rechazado', title: 'Crédito rechazado', steps: [{stage: 'inicio'}, {stage: 'evaluacion', response: '422', callOutcomes: ['Evaluación rechazada']}]}],
    pending: ['Acordar conciliación y consulta de estado cuando el resultado del desembolso sea incierto.'],
  };
}
