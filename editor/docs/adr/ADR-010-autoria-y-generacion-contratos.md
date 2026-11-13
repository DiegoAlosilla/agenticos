# ADR-010 — Autoría estructurada y generación de contratos desde figuras

Fecha original: 16 de octubre de 2026. **Estado vigente: en pausa por solicitud del usuario, 18 de octubre de 2026 (America/Lima).** La aceptación y las pruebas de G1 descritas abajo son históricas; ya no habilitan su interfaz ni las ampliaciones G2/G3.

## Revisión del 18 de octubre de 2026

El usuario pide retirar el flujo de autoría porque completar metadatos, parámetros y respuestas convierte el panel en otra forma de escribir YAML. Se retiran Nueva API, Abrir borrador, el formulario, las acciones de generación y la apertura automática de autoría desde figuras. Se conserva la importación y consulta de contratos, y las operaciones pendientes para vinculación explícita existentes en ADR-001/ADR-009.

Los atributos contractsDrafts/contractDraftRef ya guardados no se eliminan ni migran: apertura y guardado nativos conservan borradores, figuras, notas y conexiones. Se mantiene su protección de copia y presupuesto combinado con snapshots. El núcleo puro de formato/generación permanece sin acceso desde el producto; no representa una función disponible. Los formularios y su adaptador se retiran del código de producto. Las evidencias anteriores documentan el experimento, no la interfaz vigente.

Si se retoma, el objetivo será un **bosquejo de Swagger a partir de figuras con asociación explícita**, guardable con datos incompletos. No exigir headers, responses ni request body completos para obtener ese bosquejo. Distinguir una salida de trabajo de un contrato final validado; no inventar información para aparentar conformidad. Su interacción requiere una nueva revisión antes de implementar; no se autoriza automáticamente recuperar el formulario G1.

Prioridad siguiente: **consulta BIAN para elegir dominio, acción y denominación de un endpoint según su propósito**. Debe mostrar la fuente y versión y distinguir términos BIAN de convenciones internas. No equivale a certificar que un nombre es el único correcto. La consulta no depende de generar contratos ni exige completar cuerpos/respuestas. El catálogo/versionado/licencias requieren su ADR específico antes de integrarse. Después se abordará animación en una entrega separada.

Actualización posterior del 18/10/2026: [ADR-011](ADR-011-consulta-bian-local.md) concreta e implementa esta consulta como módulo local separado: 258 dominios/4.580 operaciones BOM OAS 14.0.0, sin acceso a autoría, sin modificar borradores/figuras y sin asociación persistente. Esta entrega no levanta la pausa de G1/G2/G3 ni implementa animación.

Los controles añadidos siguen colores/clases del editor; se elimina la paleta verde azulada de la extensión. Swagger mantiene sus colores nativos de métodos HTTP dentro de su aislamiento.

## Registro histórico de G1

## Contexto

El usuario informa uso del proyecto en una demo con compañeros y una petición mayoritaria de generar contratos a partir del diagrama. Comparte una plantilla para estudiar estructura, errores y reglas del equipo. Solicita discutir prioridades antes de comenzar el desarrollo. El [análisis](../analisis-generacion-contratos.md) recoge el inventario, diferencias y límites de lo observado.

ADR-001 implementa contrato → diagrama y operaciones pendientes para vincular después; excluye la generación del MVP. v1.0.0 está respaldada en un remoto privado. Las etapas técnicas 0–5 están documentadas; la etapa 6 formal no tiene resultados registrados. El feedback informado se registra sin convertirlo en evidencia de un piloto medido.

Esta decisión amplía el producto después del MVP. No sustituye ADR-003 (dialectos), ADR-005 (figuras) ni ADR-009 (consulta). ADR-001 §32 y AGENTS registran la aprobación de G1. La persistencia se concreta en este ADR antes de cambiar código; ampliaciones posteriores deberán revisar sus límites.

## Decisión propuesta

Incorporar autoría de una API mediante figuras con semántica explícita y un panel de datos contractuales. El lienzo muestra una vista del diseño; método, ruta, modelos, respuestas y seguridad proceden de datos estructurados que el autor completa. Los conectores de arquitectura no se traducen automáticamente a payloads, llamadas o reglas de negocio.

Flujo propuesto:

1. Crear una API de diseño o convertir explícitamente una figura libre y asignarle identidad.
2. Crear/asociar operaciones explícitamente y completar método, ruta, operationId y propósito.
3. Completar metadatos de API, parámetros, modelos, request bodies, responses, ejemplos y seguridad en el panel.
4. Aplicar un perfil versionado y ver qué aporta la plantilla, qué decidió el autor y qué sigue pendiente.
5. Mostrar problemas con referencia a la operación/campo; volver desde cada problema a su edición.
6. Generar en memoria, validar estructura/referencias y evaluar las reglas confirmadas del perfil.
7. Consultar una copia validada en Swagger UI y descargar YAML autocontenido. La exportación no modifica los snapshots importados ni vincula figuras por sí sola.

Puede guardarse un borrador incompleto en el diagrama. La descarga final se bloquea ante errores estructurales o reglas confirmadas de severidad error. Un perfil incompleto o no evaluado se informa como tal; no se presenta como conformidad institucional. No se rellenan campos desconocidos con tipos, ejemplos o «No aplica» inventados para silenciar problemas.

## Semántica e identidad

- API de diseño y operación lógica con ids estables; instancias visuales referencian esos ids. No identificar por títulos, operationId, tags, estilo o proximidad.
- La pertenencia a una API se declara mediante una asociación. No asumir que todas las figuras del mismo contenedor visual comparten contrato.
- Varias apariciones de una operación generan una sola definición. Duplicar como nueva operación será una acción distinta a copiar su vista.
- Conflictos de método/ruta o operationId dentro de una API, parámetros de ruta faltantes y referencias rotas se diagnostican; no se fusionan ni corrigen sin decisión del autor.
- El texto libre, notas y conectores no se convierten en declaraciones del contrato. Los atributos semánticos y su etiqueta deben tener una sincronización definida; editar la etiqueta no debe alterar silenciosamente método/ruta.
- Reutilizar componentes no aplana composiciones ni altera el dialecto. Cualquier capacidad que el editor de diseño no pueda representar debe diagnosticarse.

## Perfil y validación

Separar tres dimensiones: validez estructural OpenAPI, reglas institucionales de estilo/contrato y referencia semántica BIAN. Ninguna sustituye a las otras.

El perfil contiene id/versión, versión de salida, metadatos y extensiones, plantillas de documentación, parámetros transversales, catálogo de errores, respuestas aplicables y reglas. Cada regla especifica fuente, aplicabilidad por método/caso, severidad y estado confirmado o pendiente. Una regla deducida de un ejemplo no se declara obligatoria.

En la plantilla se observan 200, 204, 400, 401, 404, 429, 500, 503 y 504 para dos GET. No imponer ese conjunto a todos los métodos. Generar las tablas de errores y los ejemplos desde el mismo catálogo estructurado para impedir divergencias. Mantener estados HTTP y códigos funcionales separados; 204 no lleva cuerpo.

Se recibieron el ruleset Spectral y sus 20 funciones locales. Su [revisión y ejecución local](../analisis-ruleset-spectral.md) comprende 126 reglas explícitas: 53 R, 24 A de AsyncAPI y 49 adicionales; 80 error, 32 warn y 14 off. Extiende `spectral:asyncapi`. El paquete se ejecutó sin alterar sus archivos con CLI 6.17.0 en un entorno temporal separado del producto: la plantilla produjo 0 errores y 4 warnings. Falta confirmar la versión usada por el equipo y condiciones de uso/redistribución antes de empaquetar funciones en el producto; no sustituir implementaciones por deducciones de sus nombres.

R32 declara 429 para BS/UX/PU/PV; R33 declara 400/401/404 y R34 declara 500/504, con alcance de selectores y formatos OpenAPI 3. Se comprobó con casos negativos ficticios que retirar esos códigos del GET UX genera errores. R09 acepta al menos una respuesta numérica 200–299 o `2XX` en OpenAPI 3; casos con solo 201, 204 o 2XX pasan. 503 y los códigos HB no aparecen en YAML/funciones recibidas; un contrato ficticio sin 503 pasa sin diagnósticos. Mantener los nueve estados de la plantilla como referencia observada y distinguirlos de las exigencias comprobadas de este paquete.

La propuesta no añade una dependencia al producto ni elige aún su versión de integración. La versión y lockfile temporales documentan únicamente la revisión. Si se integra Spectral, deberá fijarse versión exacta y lockfile, ejecutarse localmente y comprobarse contra el perfil real. No ejecutar JavaScript aportado por un contrato o un ruleset arbitrario; las funciones custom necesitan revisión y empaquetado confiable. `extends`/referencias de reglas deben quedar resueltos localmente, sin descargas al procesar el contrato.

La aceptación del importador y el resultado Spectral son verificaciones diferentes. La revisión Spectral ejecutada produce warnings de servidor y pluralización; no se presenta como aprobación sin observaciones ni como evaluación exhaustiva de todos los ejemplos/guías institucionales. La futura UI debe distinguir resultado estructural, resultado de reglas y reglas no evaluadas. Los huecos comprobados de R12 (parámetros ausentes) y R29 (PATCH sin comprobación y seguridad anónima permitida) no deben presentarse como garantías de completitud del diseño.

## Dialecto de salida

La plantilla es OpenAPI 3.0.1; ADR-003 mantiene 3.1.x como línea principal de consulta/importación y soporta 3.0.x/Swagger 2.0. Importación y generación tienen matrices distintas.

El primer recorrido genera **OpenAPI 3.0.1**, como en la propuesta aprobada y la plantilla. No cambia la línea principal de importación ni promete exportación 3.1/2.0. Generación 3.1 necesita un perfil de salida y pruebas propios, sin conversiones silenciosas.

## Arquitectura y persistencia propuestas

- `model`: entidades de autoría, referencias y diagnósticos, sin DOM/Draw.io.
- Módulo puro de generación: diseño + perfil → documento + problemas + trazabilidad. Serialización YAML con biblioteca mantenida existente; sin concatenaciones ni parser propio.
- `contracts`: validación e interpretación por dialecto del documento generado, reutilizando reglas existentes donde correspondan.
- `drawio-adapter`: selección, acciones, datos de figuras y transacciones de edición; sin lógica de perfil OpenAPI.
- Panel de autoría integrado con el editor, sujeto a diseño de interacción. Contratos conserva su consulta nativa y Swagger UI 5.33.2; no se incorpora otro editor ni se parchea la distribución.

Los borradores y su perfil reproducible deben viajar dentro del `.drawio`, separados de snapshots inmutables. No utilizar caché/localStorage como fuente de verdad ni escribir borradores en registro 2 disfrazados de revisiones importadas.

### Persistencia acordada para G1

- Atributo independiente `contractsDrafts` en el `mxfile`, JSON **formato 1**, con colección `apis`. El registro de snapshots `contractsRegistry` conserva formatos 1/2 sin alteración, incluso al generar. No se migra al abrir ni se usa localStorage.
- Cada API y operación de diseño tiene UUID explícito. Las figuras guardan `contractDraftRef` con `apiId` y, para operaciones, `operationId` interno. No confundir este último con el operationId público de OpenAPI. Copiar una figura crea otra vista de la misma entidad lógica, sin duplicar el contrato exportado.
- API contiene metadatos, servidor, tag, seguridad, perfil de salida `basic-openapi-3.0.1/v1` y operaciones. G1 edita GET, parámetros escalares, respuestas y objetos de respuesta planos con campos escalares/requeridos/ejemplos. No introduce defaults de negocio ni catálogo institucional inventado. Cada respuesta y parámetro se declara por el autor.
- El perfil G1 identifica sus capacidades en el documento y la interfaz: validación estructural del núcleo y diagnósticos de autoría; **Spectral institucional no integrado**. Se permite descarga explícitamente identificada como YAML con validación estructural; no como contrato institucional aprobado. G2 incorpora el perfil institucional completo, sujeto a empaquetado/licencias.
- Límites: 1 MiB de JSON de borradores por documento, con **15 MiB combinados de snapshots y borradores**; 10 APIs, 100 operaciones por API, 100 parámetros/respuestas/campos por colección. Autoría e importación comprueban el presupuesto conjunto antes de escribir. Validar tipos, ids únicos, pertenencia y perfil antes de escribir. Borradores incompletos son válidos para guardado; estructuras/versiones desconocidas bloquean escritura de autoría y se conservan literalmente.
- Una transacción por creación o guardado de cambios: atributo del documento y referencias/etiquetas de figuras juntos. Las etiquetas son presentación; su edición nativa no altera método/ruta ni sobrescribe notas. Guardar datos desde el panel conserva etiqueta editada por el autor; solo actualiza etiquetas gestionadas por la extensión.
- Páginas comparten el almacén documental. La copia dentro del documento mantiene referencias. Copiar a un destino sin las entidades coincidentes se bloquea de forma atómica, igual que snapshots faltantes; no transportar ni fusionar silenciosamente entidades. Figuras borradas no eliminan el borrador: el catálogo permite recuperarlo.
- Carga/guardado nativo con editor sin extensión debe preservar figuras y atributo; se probará también carga/guardado con la extensión v1.0.0 antes de afirmar esa compatibilidad. Separar el atributo evita cambiar el formato que interpreta v1.0.0, pero la garantía requiere evidencia.
- Preview y exportación son lecturas puras de la última versión guardada. Se invalida la vista previa al editar; no se exportan datos antiguos mientras hay cambios sin guardar. La vista comunica cambios pendientes y recupera datos del archivo al cambiar de documento, página o deshacer.

Guardar/editar autoría y sus asociaciones usa transacciones reversibles. Preparar y validar antes de mutar; un fallo conserva registro, geometría, notas y conexiones. Exportar/previsualizar no debe modificar el documento. La eventual incorporación del resultado como snapshot y vinculación a figuras requerirá una acción explícita y una aceptación específica; queda fuera del primer recorrido.

## Límites

No generar contratos válidos desde cajas arbitrarias o notas mediante inferencias. No reconstruir diagramas históricos, editar/reconciliar snapshots importados, diseñar orquestación desde conectores, añadir IA/backend/GitHub al producto ni ejecutar APIs. No publicar archivos ni incorporar el contrato privado como fixture. La consulta BIAN se plantea como ampliación separada con su propio ADR de datos/versionado/licencias; no bloquea el generador. El usuario señala uso de la última versión con salvedad de conocimiento: referencia provisional **BIAN 14.0 / artefactos 14.0.0**, contrastada con fuentes oficiales el 16 de octubre de 2026; confirmar versión del equipo y fijar artefactos/commit/huellas antes de integrar. No usar `latest` flotante.

## Entregas y aceptación propuesta

| Entrega | Porción ejecutable | Evidencia necesaria |
|---|---|---|
| G0 | Acordar perfil, dialecto y completar/aceptar persistencia en este ADR | Matriz de reglas trazable; decisiones de producto resueltas; fixture ficticia |
| G1 | API y GET ficticios, autoría mínima, borrador portable, diagnósticos, preview y descarga YAML | Guardar/reabrir en perfil limpio; resultado reimportable en el núcleo y visible en Swagger; faltantes bloquean la salida final según reglas |
| G2 | Perfil acordado y métodos adicionales | Request bodies, campos requeridos/restricciones, respuestas aplicables y ejemplos; ejecución real del ruleset Spectral disponible |
| G3 | Robustez de identidad y compatibilidad ampliada | Copias/vistas múltiples, páginas, undo/redo, edición sin extensión, formato desconocido, conflictos y fallos atómicos |

Cada entrega incluye regresión pertinente de la importación/consulta existente. La portabilidad e identidad básicas no se difieren a G3: G1 ya debe comprobar los casos que soporta y bloquear explícitamente los demás. G3 amplía cobertura y capacidades; no legitima pérdida de datos en entregas previas.

Criterios transversales:

- Sin inferencias por geometría/estilo; ninguna operación lógica se exporta dos veces por sus copias visuales.
- Solicitudes heredadas/reemplazadas, seguridad efectiva, responses y referencias/ciclos se mantienen o se rechazan con diagnóstico según capacidades explícitas de cada entrega.
- El documento generado no declara campos ni capacidades que el diseño no contiene. No probar round-trip solo contando endpoints: contrastar metadatos, schemas, required, parámetros, seguridad, respuestas y referencias.
- Núcleo/generación independientes del editor; transacciones de escritura verificadas con undo/redo; notas/geometría/conectores conservados.
- Procesamiento en navegador; sin peticiones a servidores del contrato ni resolución externa. Arranque/consulta sin conectividad externa después del bootstrap.
- Únicamente fixtures ficticias; dependencias exactas, avisos/licencias conservados; presupuestos medidos y límites visibles.
- Una tarea con personas comprueba crear, completar, exportar y revisar un contrato; registrar errores/tiempos y fricciones sin atribuir ahorro antes de medirlo.

## Alternativas y consecuencias

Interpretar etiquetas/cajas libres reduciría pasos iniciales, pero no aporta modelos, obligatoriedad ni seguridad verificables y contradice las reglas de identidad. Un editor YAML completo duplicaría herramientas y apartaría al usuario del diagrama. Se propone autoría guiada por datos, con más captura inicial a cambio de salida determinista y diagnósticos trazables.

El perfil institucional no debe quedar escrito como una única plantilla rígida dentro de controles UI. Separarlo permite evolucionar reglas y conservar la versión usada por cada borrador. El costo principal será diseñar datos/persistencia y edición de modelos; serializar YAML es solo el último paso.

## Verificación previa a G1 — registro histórico

Se completó análisis local de la plantilla con el núcleo existente, revisión de alcance/código/fuentes, funciones recibidas y ejecución del paquete Spectral en CLI 6.17.0: 0 errores/4 warnings en la plantilla y 24 casos ficticios con diagnóstico esperado. Resolver sin lectores externos y bloqueo de red del proceso: 0 intentos de conexión durante validación. [Evidencia ficticia](../evidence/spectral-characterization-results.json); datos privados y herramientas temporales permanecen en `work/` ignorado. No existe generador, persistencia de borradores, integración Spectral en el producto ni catálogo BIAN; no se han probado esas capacidades. La versión institucional del ejecutor está pendiente de confirmar. Este ADR permanece propuesto hasta discutir las decisiones pendientes.

## Resultado de G1

El usuario aprueba la propuesta y autoriza resolver los detalles técnicos rutinarios. Implementados `model/drafts`, persistencia pura, generación separada del DOM, formulario dentro de Contratos y adaptador transaccional. Nueva API y Abrir borrador conviven con buscador/importación; API seleccionada abre metadatos, endpoint seleccionado abre su edición. Cambiar a Estilo y volver conserva el formulario y sus cambios pendientes. Los problemas de validación permiten regresar al campo u operación; guardar incompleto es válido, exportar con errores o cambios sin guardar se impide.

Swagger utiliza su raíz existente también para preview, recibe una copia validada y oculta acciones de inserción/cierre de catálogo mientras presenta un borrador. Exportar no crea snapshots, duplica operaciones ni modifica `contractsRegistry`. No hay conversión automática de figuras libres, edición de snapshots ni generación desde etiquetas. Tampoco integración Spectral institucional, request bodies, métodos distintos de GET, arrays/objetos anidados/composiciones o restricciones avanzadas.

Verificación: TypeScript, 20 pruebas de núcleo y 16 escenarios distintos de navegador aprobados entre regresión y cierre focal; 6 comprobaciones de arranque con clon limpio y reutilización sin acceso externo. La evidencia distingue las ejecuciones y fallos anteriores: [regresión](../evidence/authoring-g1-regression-results.json), [cierre de autoría](../evidence/authoring-g1-focused-results.json), [resumen](../evidence/authoring-g1-summary.json) y [arranque](../evidence/authoring-g1-startup-results.json). No equivale a una aprobación del piloto humano ni a medir tamaños máximos.

La prueba G1 crea datos desde los controles reales, detecta faltantes, previsualiza y descarga YAML reimportable, guarda un `.drawio` físico y lo reabre en perfil limpio. Comprueba copia de vistas sin duplicar operaciones, páginas, undo/redo, notas/etiquetas/geometría/conectores, snapshots intactos, bloqueo atómico de clipboard ausente/divergente y versión desconocida. Abre y reserializa con editor sin extensión y extensión compilada desde la etiqueta v1.0.0, añadiendo una figura libre y recuperando datos al volver. Este recorrido acotado no certifica autoría ni clipboard entre documentos desde v1.0.0.

Solo fixtures ficticias. [Diagrama](../../examples/diagrams/autoria-g1-ficticia.drawio), [datos de diseño](../../examples/designs/catalogo-ficticio.json), [formulario](../evidence/autoria-g1-endpoint.png) y [Swagger](../evidence/autoria-g1-swagger.png). Sin nuevas dependencias, parche del editor, publicación, uploads o ejecución de endpoints. Próximo incremento: perfil institucional completo/Spectral y autoría de métodos/cuerpos/modelos adicionales; BIAN conserva su ampliación separada.
