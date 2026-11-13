# ADR-002 — Registro portable e integración inicial

Fecha: 13 de octubre de 2026 (America/Lima). Estado: aceptada para la prueba de etapas 0–1; evolución de MVP sujeta a sus criterios.

## Decisión

Servir sin modificar la distribución oficial `draw.war` de Draw.io 32.4.1 (commit y SHA-256 en `config/drawio-version.json`). El servidor sustituye únicamente las respuestas de `js/PreConfig.js`, `js/PostConfig.js` y añade `plugins/contracts.js`. Son overlays versionados; el WAR y el código base permanecen intactos.

`PostConfig.js` usa `App.initPluginCallback`, `mxscript` y `Draw.loadPlugin`. `PreConfig.js` fija almacenamiento de dispositivo, servicios remotos desactivados, sincronización manual y generación IA desactivada. Se conserva la desactivación de búsqueda remota de iconos del PostConfig original. La CSP del servidor permite recursos del mismo origen y bloquea conexiones externas. No se usa `offline=1`, que deshabilita la carga ordinaria de plugins.

El registro de formato 1 es JSON en el atributo XML `contractsRegistry` de `<mxfile>`. Guarda `version` y revisiones con API, revisión, SHA-256, formato y bytes originales como texto del snapshot. La API ficticia tiene id explícito estable, separado de la huella de revisión. Los `UserObject` de las figuras guardan `contractRef` y `contractState`. La identidad visual corresponde al id de mxCell dentro del documento/página; al clonar, Draw.io asigna un id nuevo. Etiqueta y geometría no son identidad contractual.

La escritura del atributo de registro se aplica con un cambio reversible mediante `model.execute`, en la misma transacción que la inserción. No se intercepta el serializador: `ui.getFileData` y `ui.setFileData` escriben y leen XML. El registro único en mxfile evita duplicarlo al clonar figuras o páginas.

El módulo `contracts/demo.ts` interpreta únicamente una fixture conocida JSON 3.0.4. No admite importación general ni se presenta como parser o validador. La consulta inicial mostró texto seguro de la operación original en un diálogo desplazable. Se preseleccionaron YAML 2.9.1 (ISC) y Ajv 8.20.0 (MIT) para etapa 2; la posterior incorporación y ampliación de versiones/formato se registran en ADR-003. JSON usa el parser nativo. No se añade framework de interfaz.

## Alternativas y límites

- Registro por figura: rechazada por redundancia. Registro en raíz de cada página: duplicaría snapshots y complicaría el alcance de documento.
- Hooks globales del serializador: evitados porque la clonación nativa de atributos de mxfile ya ofrece la persistencia requerida; debe comprobarse en cada versión.
- Copia entre documentos: decisión de transporte/deduplicación pendiente en etapa 5. En esta prueba, si falta la revisión el inspector informa «Contrato no disponible». No se anuncia aún copia portable de figuras entre documentos.
- El runtime está ignorado por Git, la licencia del código propio sigue pendiente antes de publicar, y no se crea backend ni una web adicional.
- No se promete compatibilidad fuera de esta versión, de los recorridos ensayados o con procesos colaborativos/remotos.

## Evidencia de aceptación

`tests/integration/viability.spec.mjs`: 3 escenarios aprobados con registro único, snapshot exacto y huella, inserción/undo/redo, selección/inspector, duplicación, páginas, archivo físico .drawio, contexto limpio, ida/vuelta con editor sin plugin y auditoría de solicitudes. `tests/runtime/startup.mjs`: 5 comprobaciones aprobadas, incluida clonación Git local limpia y reutilización sin acceso externo después de preparación. Procedimiento y límites en [compatibilidad](../compatibilidad.md).
