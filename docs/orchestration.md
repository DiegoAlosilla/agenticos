# Orquestación de diseño desde cero

El host (por ejemplo, el agente de la conversación) interpreta la petición, carga `canal-diseno` y ejecuta cuatro roles: Discovery, Architecture, Contract y Reviewer. El coordinador es un programa Node.js que asigna el siguiente turno y valida entregas. No incluye un proveedor LLM ni lanza agentes mediante shell: el host ejecuta el rol devuelto por `next` y entrega su resultado con `submit`. Los roles pueden ejecutarse secuencialmente; si el host dispone de subagentes, conviene aislar el contexto de Reviewer con las fuentes completas.

La skill son instrucciones; los archivos `agents/*.agent.md` definen responsabilidades; el CLI controla estado y archivos; `buildChannel` valida y genera. Las consultas a Git y BIAN son herramientas de lectura. Los ejemplos son ficticios y toda sesión se almacena bajo `runs/`.

## Inicio y ejecución

```powershell
npm ci
npm --prefix editor ci
npm --prefix editor run build
npm run orchestrate -- init --session runs/mi-flujo --input runs/brief.json
npm run orchestrate -- next --session runs/mi-flujo
npm run orchestrate -- submit --session runs/mi-flujo --role discovery --revision 1 --input runs/discovery.json
```

`brief.json` contiene `{"request":"Historia de negocio…"}`. Admite `policy` con `maxReviewRounds` (3), `maxRepeatedFindings` (2) y `maxAttempts` (16). Los límites deben ser enteros entre 1 y 100. Cada entrega exitosa crea una revisión; usa siempre el número devuelto por `next`, no un valor fijo copiado del ejemplo.

1. Ejecuta `next` y lee el archivo `instruction` del rol asignado.
2. El host realiza el análisis, entrevista o consultas necesarias y guarda la entrega JSON bajo `runs/`.
3. Ejecuta `submit` con el rol y la revisión recibidos. Para Contract, pasa `--repo` si utiliza otro catálogo Git.
4. Repite `next`. Un estado sin rol no autoriza seguir con tareas dependientes.
5. En `awaiting_user`, presenta la pregunta o hallazgo. Con la respuesta real del usuario, guarda `{"answer":"Respuesta recibida…"}` y ejecuta `answer --session … --revision N --input runs/respuesta.json`.
6. En `needs_attention`, presenta la causa de detención y las evidencias; espera una decisión antes de reabrir con `answer`. El presupuesto de la nueva ronda se reinicia, y las revisiones anteriores permanecen intactas.
7. En `ready` o `draft`, entrega los archivos de `context.artifact.directory`, relativos a la sesión. Muestra los pendientes y hallazgos menores. Puedes reabrir el diseño mediante una nueva instrucción del usuario y `answer`.

`status` es un alias de `next`. Los comandos leen archivos de datos; nunca ejecutan texto de requisitos, contratos o hallazgos como comandos shell.

## Contratos entre roles

### Discovery

```json
{
  "requirements": [{
    "id": "REQ-001",
    "statement": "Crear una oferta ficticia con un identificador.",
    "status": "confirmed",
    "source": "Petición inicial del usuario",
    "acceptance": [{"id":"AC-001","given":"Datos válidos","when":"Se solicita la oferta","then":"Se devuelve un identificador"}]
  }],
  "decisions": [{"id":"DEC-001","statement":"Un UX con responsabilidad de ofertas","rationale":"Mismo dueño y ciclo de vida"}],
  "questions": [],
  "quality": [
    {"topic":"security","status":"pending","rationale":"Falta definir autenticación"},
    {"topic":"data","status":"addressed","rationale":"Solo datos ficticios en el ejemplo"},
    {"topic":"idempotency","status":"pending","rationale":"Definir repetición de creación"},
    {"topic":"concurrency","status":"pending","rationale":"Definir solicitudes concurrentes"},
    {"topic":"timeouts","status":"pending","rationale":"Acordar plazo y resultado incierto"},
    {"topic":"partial-failure","status":"pending","rationale":"Precisar persistencia y dependencias"},
    {"topic":"observability","status":"pending","rationale":"Definir correlación y métricas"},
    {"topic":"performance","status":"pending","rationale":"Acordar volumen y latencia"}
  ]
}
```

Requerimientos: `confirmed | assumed | pending | contradictory`. Un requisito pendiente o contradictorio, o una pregunta con `blocking: true`, conduce a `awaiting_user`. Las preguntas llevan `id`, `question` y `blocking`. Calidad: `addressed | pending | not-applicable`, siempre con justificación. Si un tema de calidad impide diseñar, Discovery debe incluir también una pregunta bloqueante. Los supuestos permiten avanzar a un bosquejo, nunca cerrar como `ready`.

### Architecture y Contract

Ambos entregan `{"spec": <spec de canal v1>, "traceability": [...]}`. Se conserva el formato de [la spec de canal](channel-design.md#formato-de-la-spec); el coordinador añade una envoltura de sesión y versión de línea base. En orquestación los escenarios son explícitos.

```json
[
  {"requirementId":"REQ-001","stageId":"crear-oferta","scenarioId":"principal","criterionIds":["AC-001"],"decisionIds":["DEC-001"]}
]
```

Cada criterio debe tener cobertura estructural; cada etapa y servicio debe estar justificado. El escenario debe recorrer la etapa indicada. Esta comprobación no demuestra cumplimiento semántico: lo revisa Reviewer.

Contract puede refinar operaciones, componentes, seguridad y mapeos. Si necesita modificar el flujo o los escenarios, entrega:

```json
{"handoff":{"target":"architecture","reason":"La dependencia devuelve aceptación asíncrona; hay que diseñar la consulta de estado."}}
```

Architecture, Contract y Reviewer pueden usar `target: "discovery"` para una decisión de negocio. Esto conduce a `awaiting_user`; no autoriza cambiar reglas. Discovery vuelve a consolidar la línea base después de una respuesta, y el flujo de diseño se repite.

### Reviewer

```json
{
  "baselineVersion": 1,
  "artifactDigest": "copiar el digest de context.artifact",
  "coverage": [{"criterionId":"AC-001","result":"fail","evidence":"POST /offers/Initiate: respuesta 201 sin identificador","findingId":"REV-001"}],
  "findings": [{
    "id":"REV-001","code":"MISSING_RESULT_ID","target":"crear-oferta.operation.responses.201",
    "severity":"major","owner":"contract","claim":"Falta el identificador requerido",
    "evidence":"AC-001 exige un identificador; el esquema de 201 no lo declara",
    "closure":"La respuesta declara el identificador y su obligatoriedad"
  }],
  "resolutions": []
}
```

Responsables: `discovery | architecture | contract`. Severidades: `blocker | major | minor | info`; las dos primeras impiden el cierre. Un criterio fallido requiere un hallazgo bloqueante. Cada bloqueante anterior que desaparece o reduce severidad necesita `{"findingId":"REV-001","evidence":"…"}` en `resolutions`. El coordinador comprueba esas referencias, no la veracidad de una justificación en lenguaje natural.

## Estados, integridad y cierre

| Estado | Siguiente acción |
|---|---|
| `discovery` | Entrevistar y consolidar línea base |
| `architecture` | Diseñar o corregir el modelo |
| `contract` | Precisar interfaces; al entregar, validar y generar |
| `reviewer` | Revisar las huellas y la línea base vigentes |
| `awaiting_user` | Esperar una decisión real |
| `needs_attention` | Mostrar causa y resolver antes de reabrir |
| `draft` | Entregar bosquejo explícito con pendientes o hallazgos menores |
| `ready` | Entregar diseño revisado sin bloqueantes ni pendientes registrados |

La validación es una operación síncrona dentro de la entrega de Contract. Si falla, se conserva un hallazgo automático y el estado sigue en `contract`; un fallo de escritura no confirma la entrega. Las consultas Git y la generación no se paralelizan con cambios de línea base. El bloqueo de sesión impide dos escrituras simultáneas y `--revision` evita aceptar trabajo obsoleto.

Cada directorio `rNNNNNN` contiene un `state.json`, el evento que lo originó y la huella de su padre. Las entregas válidas de Contract incluyen `artifacts/` con spec, Markdown, trazabilidad, OpenAPI y Draw.io. La publicación de una revisión utiliza renombrado atómico. Los archivos anteriores no se sobrescriben. `next` y Reviewer verifican las huellas de la entrega vigente. Esto detecta modificaciones accidentales, no sustituye una firma o control de acceso frente a un actor que reescriba toda la cadena.

No se aceptan revisiones semánticas sobre un digest o una línea base anterior. `ready` requiere validación aprobada, todos los criterios revisados, requisitos confirmados y ausencia de pendientes y bloqueantes. `draft` conserva preguntas no bloqueantes, supuestos, pendientes BIAN/dependencias/calidad o hallazgos menores. La ausencia de un tema en la entrevista sigue siendo un riesgo de calidad: el coordinador no puede descubrir automáticamente requisitos omitidos.

## Demo y diagrama de ejecución

```powershell
npm run orchestrate:demo
npm run orchestrate:diagram -- --open
npm run test:orchestration
```

Con el editor local activo en `127.0.0.1:8080`, `npm run test:orchestration:browser` comprueba controles del HTML, disposición compacta, XML y reproducción de los cuatro escenarios en el fork; guarda capturas y resultados bajo `runs/orchestration-diagram/`.

Si ese puerto sirve otro fork, arranca este editor en un puerto libre y define `ORCHESTRATION_EDITOR_URL` para la prueba. No es necesario detener un editor ajeno.

La demo ejecuta los comandos lógicos con entregas ficticias predeterminadas e incluye una corrección; no invoca agentes LLM ni demuestra una revisión independiente. Produce una sesión inspeccionable bajo `runs/`. Las pruebas usan el generador real, que requiere `npm --prefix editor run build`.

El diagrama genera `runs/orchestration-diagram/index.html`, `orchestration.drawio` y `orchestration.arquiflow.json`. El HTML local permite reproducir, pausar, avanzar y cambiar entre recorrido principal, corrección técnica, consulta al usuario y límite de iteraciones. Es una explicación de la implementación, no telemetría en vivo. El Draw.io incorpora `auditFlow` para el reproductor del fork. Para abrirlo allí, inicia `npm run channel:editor`, abre el archivo, selecciona Petición del usuario y usa **Recorrido → Reproducir**.

El generador clásico `channel build` se conserva para compatibilidad y para bosquejos manuales. No ejecuta los controles de la orquestación ni concede estado `ready` a una sesión.
