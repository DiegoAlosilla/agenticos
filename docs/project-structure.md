# Estructura de Agenticos

Agenticos usa el chat para entrevistar al desarrollador, un CLI de Node.js para consultar fuentes y generar entregables, y el fork de Draw.io para revisar el diseño. [Flujo y decisiones del agente](channel-design.md#flujo-y-decisiones-del-agente)

## Carpetas principales

| Carpeta | Función |
| --- | --- |
| [`.agents/`](../.agents) | Contiene la skill `canal-diseno` que usa Codex para activar el flujo cuando el desarrollador describe un requerimiento de canal. |
| [`agents/`](../agents) | Define el agente y su protocolo de entrevista, búsqueda en Git y BIAN, registro de pendientes y entrega del diseño. |
| [`src/`](../src) | Implementa los comandos, la consulta de fuentes, la generación de OpenAPI y Draw.io, y la apertura del editor. |
| [`editor/`](../editor) | Contiene el fork de Draw.io, su extensión y el servidor local que presenta **Contratos**, **BIAN** y **Recorrido**. |
| [`docs/`](.) | Reúne las guías de uso y diseño, el diagrama de decisiones y el GIF de la demo en `media/`. |
| [`scripts/`](../scripts) | Contiene `channel-model.ps1`, que prepara y arranca el modelo Qwen local para sugerir preguntas de entrevista. |
| `runs/` | Área de trabajo local. Guarda las propuestas en `runs/channel/`, el clon de contratos en `runs/business-contracts-demo/` y los archivos del modelo local en `runs/channel-model/` cuando se prepara. Git ignora esta carpeta. |
| `node_modules/` y `.git/` | Dependencias instaladas por npm y metadatos del repositorio local, respectivamente. |

En la raíz, [`AGENTS.md`](../AGENTS.md) indica cuándo activar el agente. [`package.json`](../package.json) expone los comandos de npm y `package-lock.json` fija las versiones de sus dependencias.

## Módulos de `src/`

| Módulo | Responsabilidad |
| --- | --- |
| [`channel-cli.mjs`](../src/channel-cli.mjs) | Punto de entrada. Despacha `editor`, `search`, `operation`, `bian`, `guide`, `build` y `demo`. Prepara el clon ficticio cuando corresponde, lee el JSON de entrada y llama al módulo que ejecuta la operación. Con `--open`, entrega el diagrama al editor después de guardar la propuesta. |
| [`channel-catalog.mjs`](../src/channel-catalog.mjs) | Lee contratos JSON o YAML desde un commit de Git y los interpreta con el núcleo OpenAPI del editor. `search` devuelve candidatos e identifica archivos omitidos. `operation` recupera una operación por archivo, método y ruta. La consulta BIAN comprueba la huella del catálogo local y permite buscar por propósito y acción semántica. El servidor del editor reutiliza el mismo catálogo Git. |
| [`channel-design.mjs`](../src/channel-design.mjs) | `buildChannel()` valida servicios UX, etapas, escenarios y referencias de la spec. Contrasta método, ruta y SHA-256 de los consumos confirmados contra el commit elegido. Genera un OpenAPI por servicio UX, arma el recorrido de cada escenario y calcula la distribución del lienzo. `writeChannel()` guarda el conjunto de entregables en un directorio nuevo. |
| [`drawio.mjs`](../src/drawio.mjs) | Serializa las figuras, conexiones y páginas en XML editable de Draw.io. Incluye el registro de contratos, los vínculos de cada figura y el orden de los pasos que consume la pestaña **Recorrido**. |
| [`channel-demo.mjs`](../src/channel-demo.mjs) | Construye la spec ficticia de préstamos con decisiones precargadas y referencias al catálogo de demo. Define cinco etapas, siete consumos Business y dos escenarios de ejemplo. |
| [`channel-guide.mjs`](../src/channel-guide.mjs) | Envía el contexto de la entrevista al servidor local del modelo y valida que devuelva hasta cuatro preguntas en JSON. La guía es opcional y el agente usa las preguntas como sugerencias. |
| [`delivery.js`](../src/delivery.js) | Abre el diagrama en el fork mediante un servidor temporal en loopback y el protocolo de integración de Draw.io. Cierra el servidor al recibir la confirmación de carga. |
| [`io.js`](../src/io.js) | Comparte utilidades para localizar la raíz del proyecto, calcular SHA-256, leer JSON, escribir archivos de forma atómica y evitar escrituras concurrentes en la misma salida. |

### De la spec al archivo editable

1. El agente recoge las decisiones de negocio y guarda `spec.json` con los servicios UX, etapas, escenarios, referencias y pendientes.
2. `channel-cli.mjs` entrega la spec a `channel-design.mjs`. Este consulta el catálogo para resolver las referencias, valida los OpenAPI y prepara las páginas y los pasos del recorrido.
3. `drawio.mjs` devuelve el XML. El generador guarda `spec.json`, `spec.md`, `contracts/*.openapi.yaml` y `channel.drawio` juntos bajo `runs/channel/`, o en la carpeta indicada con `--out`.
4. Si se ejecuta con `--open`, `delivery.js` carga el resultado en el fork. La extensión lee los metadatos para mostrar Swagger, las referencias BIAN y la animación. [Formato de la spec y comandos](channel-design.md#formato-de-la-spec)

## Dentro de `editor/`

| Carpeta | Función |
| --- | --- |
| [`editor/src/`](../editor/src) | Código de la extensión. `drawio-adapter/` integra paneles y animación con el lienzo, `inspector/` conecta Swagger y `contracts/` valida OpenAPI. `bian/` y `catalog/` implementan la consulta, y `model/` y `persistence/` manejan datos y referencias del diagrama. |
| [`editor/config/`](../editor/config) y [`editor/data/`](../editor/data) | Configuración de arranque, versión fijada de Draw.io y catálogo BIAN local con su manifiesto. |
| [`editor/scripts/`](../editor/scripts) | Prepara la distribución, compila la extensión y arranca el servidor local. `channel-catalog.mjs` conecta el buscador del panel con el clon Git. |
| [`editor/examples/`](../editor/examples) y [`editor/tests/`](../editor/tests) | Contratos, diseños y diagramas ficticios, junto con pruebas unitarias, de integración y de arranque. |
| [`editor/docs/`](../editor/docs) y [`editor/licenses/`](../editor/licenses) | Decisiones técnicas, compatibilidad, evidencias del fork y licencias de terceros. |
| `editor/.runtime/`, `editor/dist/`, `editor/work/` y `editor/test-results*/` | Distribución local de Draw.io, compilación, temporales y resultados de pruebas. |

Para cambiar las preguntas, empieza por el [protocolo del agente](../agents/channel-design-protocol.md). Para cambiar la generación o las franjas del diagrama, revisa [`channel-design.mjs`](../src/channel-design.mjs). Para ajustar las pestañas o el reproductor, entra en [`drawio-adapter/`](../editor/src/drawio-adapter).
