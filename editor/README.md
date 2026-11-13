# Extensión local de contratos para Draw.io — v1.0.0

Esta copia incluye la integración de auditoría del MVP. Consulta [la guía actual](../docs/editor.md) y [ADR-014](docs/adr/ADR-014-auditoria-hackathon.md) para evidencia y animación. Las secciones siguientes documentan la base heredada.

El asistente de diseño de canal agrega la búsqueda en un catálogo Git cuando se inicia el editor con `npm run channel:editor` desde la raíz. [Guía y demo de préstamos](../docs/channel-design.md) · [ADR-015](docs/adr/ADR-015-diseno-canal.md)

Editor Draw.io real con extensión propia basada en [ADR-001](ADR-001-extension-contratos-drawio.md). **OpenAPI 3.1.x principal, OpenAPI 3.0.x y Swagger 2.0**, JSON/YAML autocontenidos, con [límites explícitos](docs/compatibilidad.md). Etapas técnicas 0–5 comprobadas; piloto de utilidad pendiente. Todos los ejemplos son ficticios. Versión 1.0.0 para el repositorio privado; licencia de publicación pública pendiente.

Notas de la primera versión: [v1.0.0](docs/releases/v1.0.0.md). Índice de toda la documentación: [docs/README.md](docs/README.md). Historial: [CHANGELOG.md](CHANGELOG.md).

Estado del checkout al 23 de octubre de 2026: [generación desde figuras en pausa, ADR-010](docs/adr/ADR-010-autoria-y-generacion-contratos.md). Se retiraron los controles de autoría; los borradores ya guardados se conservan en el archivo. **Consulta BIAN local disponible en la pestaña BIAN**, para explorar dominio, acción y denominación de endpoint según su propósito; [ADR-011](docs/adr/ADR-011-consulta-bian-local.md). Asistencia BIAN con IA local opcional: [ADR-013](docs/adr/ADR-013-asistencia-bian-ia-local.md). Animación queda pendiente. No se ha publicado otra versión.

El [ruleset y sus funciones recibidas](docs/analisis-ruleset-spectral.md) se ejecutaron localmente con Spectral CLI 6.17.0: plantilla con 0 errores/4 warnings y 24 casos ficticios contrastados, sin intentos de red durante validación. Es una revisión temporal, sin integración Spectral al producto; falta confirmar la versión del ejecutor del equipo. La consulta usa BIAN Landscape 14.0 / artefactos 14.0.0 BOM OAS, fijados y diferenciados de convenciones institucionales.

Repositorio privado: [DiegoAlosilla/drawio-contracts-local](https://github.com/DiegoAlosilla/drawio-contracts-local). Etiqueta de la primera versión: `v1.0.0`.

## Arrancar

Prerrequisitos: Node.js **24.18.x** (probado 24.18.0), npm **11.16.x** (probado 11.16.0), Git y acceso al repositorio privado. Para clonar la primera versión en PowerShell:

```powershell
git clone --branch v1.0.0 https://github.com/DiegoAlosilla/drawio-contracts-local.git
cd drawio-contracts-local
npm start
```

Desde un checkout existente basta con:

```powershell
npm start
```

La primera ejecución instala las dependencias del lockfile y descarga el WAR oficial verificado de Draw.io **32.4.1**. Requiere Internet durante esa preparación. Las siguientes reutilizan `.runtime/` y `node_modules/`; compilan el plugin localmente. El servidor escucha solo en `127.0.0.1:8080`; detener con Ctrl+C. Conflicto de puerto: `$env:PORT=8081; npm start`.

Abrir [Draw.io local](http://127.0.0.1:8080/?lang=es&ui=kennedy&mode=device&gapi=0&db=0&od=0&gh=0&gl=0&tr=0&browser=0&picker=0&stealth=1&math=0). La configuración local se aplica también al abrir `/` sin parámetros. Tema clásico probado; otros temas no están certificados.

## Probar

La generación desde figuras está en pausa. No aparecen Nueva API, Abrir borrador ni el formulario de autoría. El [diagrama ficticio histórico de G1](examples/diagrams/autoria-g1-ficticia.drawio) se conserva como fixture de compatibilidad; abrirlo y guardarlo mantiene sus datos. La importación y consulta siguen disponibles. Los controles de la extensión usan los colores del editor; Swagger conserva sus colores propios para los métodos HTTP.

1. En el panel derecho, abrir **Contratos**, junto a las pestañas nativas **Diagrama/Estilo** (o **Estilo/Texto/Organizar** al seleccionar una figura). **Importar** está en la misma fila que el buscador. Elegir JSON/YAML: se incorpora al catálogo con un aviso breve, sin resumen modal ni contador de APIs. Ejemplos: `examples/contracts/clientes-3.1-ficticios.json`, `ofertas-3.0-ficticias.yaml`, `archivos-swagger-2-ficticios.json`.
2. Usar el buscador con placeholder **Busca tu API**, sin label adicional, y elegir una API importada. Debajo aparece su contrato completo con Swagger UI: todos los endpoints plegados inicialmente, cada uno con **Agregar al lienzo** y **Arrastrar dentro de su cabecera**, junto a Copiar. Desplegar un endpoint muestra parámetros, cuerpo, respuestas y Example Value/Schema. La búsqueda permanece visible y conserva su texto al consultar, insertar o cambiar de pestaña. La **×** del visor retira la documentación, limpia el filtro y devuelve la lista completa al espacio disponible. No borra contratos ni figuras. La vista no incluye Clasificación de nuevas figuras; las nuevas inserciones se crean sin clasificación. Las rutas iguales de APIs distintas conservan referencias diferentes.
3. Para arquitectura primero: **Extras → Crear operación pendiente**; completar propósito/método/ruta. Seleccionar la figura y elegir **Extras → Vincular contrato**. Revisar la diferencia y pulsar Vincular; notas, estilo, geometría y conexiones se conservan.
4. **Estilo, Texto, Organizar y Diagrama** mantienen los controles y colores de Draw.io. Seleccionar una figura de API abre su contrato completo en Contratos. Seleccionar un endpoint abre el contrato completo de su API y expande esa operación, manteniendo visibles las demás. Para inspeccionar solo una operación vinculada existe la acción explícita **Panel de endpoint**: conserva arriba el buscador de APIs; volver a elegir una API recupera su contrato completo. **Snapshot y seguridad efectiva** permite consultar la fuente original. La doble pulsación conserva la edición de etiquetas.
5. Dibujar, mover, conectar, copiar dentro del documento y deshacer/rehacer con herramientas normales del editor.
6. Guardar con Draw.io o **Extras → Guardar prueba portable**. En otro perfil limpio con esta extensión, abrir el `.drawio` mediante **Extras → Abrir prueba portable** o apertura nativa: los contratos originales no son necesarios.

**Agregar todos**, en la barra del visor, inserta todos los endpoints de `paths` de la API elegida en un contenedor amarillo con una sola fila horizontal de izquierda a derecha, operaciones editables y referencias individuales. Una sola acción de deshacer retira esa inserción. Solo se distribuyen las figuras nuevas; no se reorganiza el dibujo existente. La **×** de esa misma barra cierra la consulta. El borde izquierdo del panel permite arrastrar su ancho (también con flechas, Inicio y Fin al enfocarlo); conserva la preferencia durante la sesión y restaura el ancho nativo al salir de Contratos.

Demostración completa guardada: [mvp-ficticio.drawio](examples/diagrams/mvp-ficticio.drawio). **Extras → Insertar endpoint ficticio** sigue disponible para repetir la viabilidad inicial. Los accesos de prueba sobre la biblioteca izquierda se retiraron; **Extras → Panel de endpoint** conserva la inspección explícita.

Las nuevas figuras usan un contenedor de API y una operación interna de tipo componente, ambos editables. Por defecto muestran `«API»`; metadatos manuales UX/BS existentes se conservan, sin inferirlos. Seleccionar el contenedor muestra la API completa; seleccionar la operación muestra el mismo contrato con ese endpoint expandido. Las figuras existentes no se redistribuyen al abrir. Para cambiar una caja anterior: **Extras → Usar figura de componente**; la conversión es deshacible y amplía su tamaño conservando posición/conexiones/notas. Ejemplo y decisión: [ADR-005](docs/adr/ADR-005-figura-componente.md).

La consulta incorpora **Swagger UI 5.33.2** (`swagger-ui-dist`, versión exacta y lockfile), empaquetado localmente. [ADR-008](docs/adr/ADR-008-swagger-ui-real.md) explica aislamiento y límites; [ADR-009](docs/adr/ADR-009-tab-contratos-nativo.md) establece el flujo actual. Se retira la cabecera separada Endpoint/Catálogo/Formato: **Contratos** forma parte de la fila nativa del panel derecho, con sus colores originales. El ancho de Contratos se ajusta arrastrando su borde izquierdo; volver a una pestaña nativa restaura su ancho habitual. No mueve ni redimensiona figuras. [Captura](docs/evidence/contratos-tab-nativo.png).

Se conserva la terminología y el tema claro de Swagger UI, incluso con el editor oscuro. Las descripciones del contrato se muestran como texto literal para impedir HTML e imágenes remotas. **Try it out**, ejecución y autorización están desactivados. Swagger puede generar un **Example Value** desde el esquema: es una ayuda visual de la librería y nunca se guarda como ejemplo declarado ni modifica el snapshot.

El archivo `.drawio` **incluye el contrato importado como snapshot**, una vez por revisión. Compartir el diagrama comparte esa documentación. El contrato se interpreta en navegador; el servidor solo entrega recursos y rechaza escrituras. No se ejecutan operaciones HTTP del contrato, no se descargan referencias externas y no se transforma una versión antigua a 3.1.

Copiar figuras vinculadas a otro documento que no contenga sus revisiones se **bloquea explícitamente**. Compartir/reabrir el archivo completo sí es portable; el transporte de contratos por clipboard queda para una ampliación específica. No eliminar manualmente snapshots si se desea consultar sus figuras.

El editor sin plugin se abre con `&contracts=0`. Su recorrido de compatibilidad debe evaluarse contra [las pruebas y límites documentados](docs/compatibilidad.md); no asumir que toda herramienta de XML/exportación conserva metadatos.

Si aparece **INVALID_FILE** al importar YAML, revise que el archivo conserve los dos puntos de las claves (`openapi: 3.1.0`), indentación, barras de rutas y referencias (`#/components/schemas/...`). Se indica la primera incidencia de sintaxis y ubicación sin volcar el archivo. **INVALID_OPENAPI** muestra varios problemas estructurales con su campo y orientación; otras etapas pueden encontrar más. El rechazo no altera el diagrama ni repara silenciosamente el contrato. Al descargar desde un repositorio, guarde el contenido **Raw** del YAML/JSON, no el HTML de la página.

Comprobación pública acotada: los nueve contratos de `examples/` de postmanlabs/openapi-to-postman en el commit fijado tienen **7 aceptados y 2 originales inválidos**. [Matriz y límites](docs/adr/ADR-006-consulta-y-diagnosticos.md). Para repetir: `npm run test:corpus` (descarga inicial al directorio ignorado work); con `npm start` en otra terminal, `npm run test:corpus:browser`. Estas pruebas no son una integración GitHub del editor y no prueban todo ese repositorio.

## Consultar BIAN por propósito

Vista **Lista y detalle**: a la izquierda, pestañas **Catálogo** y **Sugerencias IA**; a la derecha, una operación del candidato elegido con su método/ruta y **Agregar al lienzo** fuera del desplazamiento. En el catálogo, el selector **Operación** permite recorrer todas las operaciones filtradas; la primera es solo el inicio de la consulta. Las sugerencias IA y referencias guardadas abren su operación exacta. **Antes de elegir** da orientación propia; el original inglés, la explicación generada y **Sobre el dominio y la fuente** se despliegan por separado. Cada columna conserva su desplazamiento. En paneles estrechos (menos de 460 px útiles), elegir un candidato abre el detalle y **← Dominios** recupera la lista y el foco. El ancho sigue ajustándose desde el borde izquierdo. La cabecera agrupa propósito, filtro y acción de IA; **Fuente, alcance y ayuda de búsqueda**, al pie, reúne español de apoyo, equivalencias y procedencia. [Decisión de interfaz](docs/adr/ADR-009-tab-contratos-nativo.md).

El campo de propósito permite clic, selección de texto con ratón y edición por teclado, también después de consultar la ayuda. Corrección de foco verificada en kennedy claro/oscuro: [evidencia](docs/evidence/bian-input-summary.json).

En **la pestaña BIAN**, escribir por ejemplo «consultar saldo de una cuenta corriente» o «iniciar préstamo personal». Abrir un dominio y revisar su definición y operaciones: **acción**, `operationId`, método/ruta y descripciones oficiales. **Guía BIAN** explica el recorrido y cómo comparar responsabilidades; el botón **?** junto a **Acción · filtro manual** explica las 15 acciones con traducción y ejemplo. El selector no se infiere ni cambia automáticamente: filtra operaciones que ya contienen esa acción en la fuente. Se pueden explorar todos los dominios sin escribir; **Mostrar más dominios** amplía la lista. Volver con **← Dominios** y cerrar con **×** para recuperar el contrato consultado. Abre Contratos para importar o volver a Swagger.

El catálogo incluye **258 dominios y 4.580 operaciones** del conjunto oficial **BIAN Semantic APIs 14.0.0, BOM extended OAS 3.x**, commit `b58bf4c2c300dd018afc084e9bb24b7adaaa3500`. No incluye todo el Landscape, ISO20022/DDD ni AsyncAPI. **Fuente, alcance y ayuda de búsqueda** muestra versión, procedencia, licencia y equivalencias utilizadas. **Español de apoyo** muestra nombres traducidos y resúmenes propios de los 258 dominios (`es-support/1`), con el original disponible en **Dominio · definición oficial en inglés**. Las descripciones de operaciones, operationId, métodos y rutas conservan el original. Las equivalencias españolas `es-en-local/2` son ayuda propia de búsqueda léxica. Ninguna es traducción oficial, regla interna o certificación de un nombre único correcto. Los resultados muestran términos cubiertos y faltantes; comparar producto, cliente y etapa. La guía diferencia Consumer Loan, Corporate Loan, Loan y Customer Offer.

Dieciséis artefactos no publican operaciones en `paths`; otro carece de definición de dominio. Se muestran esos huecos sin inventar contenido. Catálogo/licencia/huellas y procedimiento reproducible en [data/bian](data/bian/README.md). No se ejecutan APIs ni se descargan referencias. La búsqueda por palabras no envía el propósito a servidores. Consulta sin conectividad externa después de preparar los recursos; datos incluidos en el plugin. Propósito, filtros y selección permanecen solo en memoria y se limpian al cambiar de documento.

**Agregar endpoint al lienzo**, dentro de cada operación BIAN, crea una figura editable de **referencia de diseño** en una transacción deshacible. Conserva dominio, operación y revisión/fuente/licencia en `bianRef` formato 1, hasta 32 KiB por figura. Al seleccionarla se consulta esa operación guardada. Copiarla a otro documento transporta su referencia propia; compartir el dibujo comparte ese extracto. Editar su etiqueta no cambia los datos BIAN. No importa un contrato, no genera YAML ni afirma que el endpoint esté implementado. Borradores y snapshots OpenAPI permanecen separados. Referencias desconocidas se conservan con diagnóstico. [ADR-012](docs/adr/ADR-012-guia-bian-y-referencias-en-figuras.md) define guía, español y persistencia.

## IA local opcional para BIAN

**Sugerir con IA local**, en la pestaña BIAN, recupera candidatos del catálogo y explica alternativas en español. **Revisar operación oficial** permite comprobar la fuente y agregar explícitamente el endpoint. Las explicaciones son generadas y pueden ser imprecisas; no son definiciones oficiales ni una selección garantizada. La búsqueda habitual funciona sin modelos.

Preparación explícita en Windows x64: `npm run ai:prepare`. Después, mantener `npm run ai:serve` en otra terminal junto con `npm start`. Motor Ollama 0.40.10 y modelos con huellas fijadas, descargados solo a `.runtime/bian-ai`; nube deshabilitada y conexión solo al propio equipo. El servidor recibe únicamente el propósito y el filtro cuando se pide asistencia. Los contratos importados continúan procesándose en navegador; consultas y explicaciones no se guardan en el diagrama. [Uso, instalación, privacidad y límites](docs/ia-local.md) · [ADR-013](docs/adr/ADR-013-asistencia-bian-ia-local.md).

## Verificar

```powershell
npm run test:browser-install
npm test
npm run test:startup
node scripts/bian-catalog.mjs --download
node tests/runtime/bian-offline.mjs
node tests/runtime/bian-offline.mjs --support
```

La instalación de Chromium es solo para desarrollo/pruebas, requiere Internet la primera vez y no forma parte de `npm start`. Las pruebas usan el editor real en Chromium, crean un archivo de ejemplo ficticio y verifican perfiles separados. `test:startup` crea y clona un repositorio Git temporal local en `work/`, ejecuta `npm start` sin dependencias/runtime y prueba reutilización con conexiones externas bloqueadas, puertos y huella inválidos. No publica ni configura remotos externos. Requiere que 8081 esté libre. Evidencias temporales en `work/`, resultados en `test-results/`.

`bian-catalog.mjs --download` es una verificación de desarrollo opcional: descarga exclusivamente los YAML fijados y comprueba su proyección y huellas; después se repite sin `--download` y sin red. No forma parte del arranque/build. `bian-offline.mjs` usa temporalmente 8082 y las dependencias/WAR ya preparados para arrancar con red externa bloqueada en Node y Chromium y consultar BIAN; `--support` también comprueba guía, español, filtro manual e inserción real. No repite un bootstrap limpio.

## Estructura y límites

`src/contracts` parsea/valida e interpreta las tres líneas sin DOM ni Draw.io; `src/model` define identidades, `src/persistence` define el registro versionado y `src/catalog`/`src/inspector` crean interfaz de consulta segura. `src/bian` aporta tipos y búsqueda pura del catálogo en `data/bian`. `src/drawio-adapter` concentra APIs, inserción, clipboard y transacciones del editor. `scripts` prepara y sirve la distribución sin alterar el WAR.

El producto no integra GitHub, animación, migración histórica, llamadas reales, analítica ni otra web. Límites de entrada: 5 MiB por archivo, 15 MiB por documento/datos expandidos, 64 niveles y 200000 nodos; cadenas de referencias hasta 64 saltos. Swagger UI controla la expansión visual de modelos, inicialmente a un nivel; el antiguo límite visual propio de seis niveles ya no aplica. Referencias internas JSON Pointer; anchors, bases `$id`, `$dynamicRef` y dialectos personalizados se rechazan con diagnóstico. Callbacks/webhooks se conservan pero no se enumeran en el catálogo. No es un validador completo de payloads/gramática MIME. Solo Windows está probado; versiones de editor/temas/navegadores no ensayados no se anuncian compatibles.

Estado y evidencias: [progreso](docs/progreso.md) y [compatibilidad](docs/compatibilidad.md). Decisiones: [integración](docs/adr/ADR-002-registro-etapa-0.md), [versiones/formato 2](docs/adr/ADR-003-openapi-versiones.md), [copia entre documentos](docs/adr/ADR-004-copia-entre-documentos.md). Siguiente: [piloto con personas](docs/piloto.md); no se asume utilidad por una demo automatizada. Las reglas de agentes están en [AGENTS.md](AGENTS.md).

La licencia propia requiere elección del responsable antes de publicar. Atribuciones: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Proyecto independiente, sin afiliación ni patrocinio de Draw.io.
