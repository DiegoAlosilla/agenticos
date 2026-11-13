export const SUPPORT_VERSION='es-support/1';
export const actionHelp:Record<string,{es:string;meaning:string;example:string}>={
  Activate:{es:'Activar',meaning:'Poner en servicio una capacidad o sesión.',example:'Habilitar una sesión operativa.'},
  Capture:{es:'Capturar / registrar',meaning:'Incorporar datos o evidencias a un registro.',example:'Registrar un evento o movimiento.'},
  Control:{es:'Controlar',meaning:'Cambiar el estado o las condiciones de procesamiento.',example:'Suspender o reanudar una actividad.'},
  Create:{es:'Crear',meaning:'Crear un registro o recurso del dominio.',example:'Crear una entrada de un directorio.'},
  Evaluate:{es:'Evaluar',meaning:'Analizar información para obtener una valoración.',example:'Evaluar una condición de riesgo.'},
  Exchange:{es:'Intercambiar / acordar',meaning:'Intercambiar información para acordar o confirmar un resultado.',example:'Aceptar o rechazar una propuesta.'},
  Execute:{es:'Ejecutar',meaning:'Ejecutar una tarea prevista sobre una instancia.',example:'Procesar una tarea de pago.'},
  Grant:{es:'Conceder',meaning:'Conceder permisos o derechos específicos.',example:'Conceder acceso a un servicio.'},
  Initiate:{es:'Iniciar',meaning:'Comenzar una nueva instancia de actividad o producto.',example:'Iniciar la gestión de un préstamo.'},
  Notify:{es:'Notificar / suscribirse',meaning:'Gestionar avisos sobre cambios o eventos.',example:'Suscribirse a avisos de estado; revisar la operación concreta.'},
  Provide:{es:'Proporcionar',meaning:'Entregar la información o capacidad indicada.',example:'Proporcionar el resultado descrito por la operación.'},
  Register:{es:'Registrar',meaning:'Dar de alta un elemento para su seguimiento.',example:'Registrar un participante o una referencia.'},
  Request:{es:'Solicitar',meaning:'Pedir una intervención o servicio del dominio.',example:'Solicitar una revisión específica.'},
  Retrieve:{es:'Consultar / recuperar',meaning:'Obtener información de una instancia existente.',example:'Consultar el detalle de un préstamo.'},
  Update:{es:'Actualizar',meaning:'Modificar datos de una instancia existente.',example:'Actualizar datos de un acuerdo.'},
};
export const guideSteps=[
  ['1. Describe el propósito','Incluye el objeto de negocio, el tipo de cliente y la etapa. Ejemplo: «iniciar préstamo personal» o «preparar oferta de préstamo».'],
  ['2. Compara la responsabilidad','Lee la definición del dominio. El primero de la lista tiene más coincidencias léxicas, pero debes comprobar qué responsabilidad gestiona. No se calcula un porcentaje de confianza.'],
  ['3. Decide la acción','Déjala en Todas las acciones para explorar. Después filtra manualmente: Initiate comienza una instancia; Retrieve consulta; Update modifica datos. La ayuda explica los demás términos.'],
  ['4. Revisa la operación concreta','Comprueba operationId, método, ruta, descripción y CR/BQ de la fuente. El verbo por sí solo no describe todo el trabajo; dos dominios pueden tener Initiate y resolver necesidades distintas.'],
  ['5. Agrega una referencia al dibujo','Agregar endpoint al lienzo crea una figura de referencia BIAN, editable y deshacible. No genera un contrato ni afirma que esa API esté implementada. Al seleccionarla puedes consultar su referencia guardada.'],
];
export const loanChoices=[
  ['Consumer Loan','Préstamo de consumo: gestión del producto para consumidores, desde su configuración inicial y durante su operación.'],
  ['Corporate Loan','Préstamo corporativo: gestión del producto de préstamo de una empresa.'],
  ['Loan','Préstamo general: gestión del producto cuando la definición general corresponde a tu caso; compara primero los dominios especializados.'],
  ['Customer Offer','Oferta al cliente: preparación y evaluación de una oferta de producto; puede incluir elegibilidad, documentación y evaluaciones previas.'],
];
