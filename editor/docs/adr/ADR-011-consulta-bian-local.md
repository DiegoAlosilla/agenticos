# ADR-011 — Consulta BIAN local por propósito

**Ampliación 23/10/2026:** [ADR-013](ADR-013-asistencia-bian-ia-local.md) autoriza asistencia con IA local opcional y preparación independiente de motor/modelos. El recorrido léxico descrito aquí sigue sin IA ni envío del propósito; la asistencia requiere acción explícita y no altera fuentes ni persistencia BIAN.

**Integridad de checkout 23/10/2026:** catálogo/apoyo/manifiesto JSON y licencia BIAN se marcan `-text` en .gitattributes para conservar bytes frente a core.autocrlf de Windows. El nuevo arranque limpio detectó que convertir LF a CRLF rompía las huellas fijadas. No se cambian contenido, catálogo, versión ni manifiesto; se preservan sus bytes originales.

Fecha: 18 de octubre de 2026 (America/Lima). Estado: **aceptado para la primera porción de consulta**; verificación de implementación registrada al final. No reactiva ADR-010.

**Ampliación autorizada posterior:** [ADR-012](ADR-012-guia-bian-y-referencias-en-figuras.md) agrega guía, ayuda de acciones, traducciones resumidas propias e inserción explícita con bianRef portable por figura. Sustituye los límites iniciales de esta primera porción sobre español y ausencia de asociaciones persistentes; consultar sigue siendo de solo lectura. No reactiva autoría/generación.

## Necesidad y alcance

Consultar desde Contratos qué dominio y operación pueden corresponder al propósito de un endpoint, con definiciones, denominación, método y ruta de referencia. Es exploración asistida por búsqueda léxica, sin IA ni certificación de conformidad. No genera contratos, no modifica figuras y no aplica asociaciones semánticas implícitas. Animación queda fuera.

## Fuentes, versión y conjunto elegido

Verificadas las fuentes oficiales el 18/10/2026: [Service Landscape](https://bian.org/deliverables/service-landscape/) anuncia **14.0, febrero de 2026**; [repositorio bian-official/public](https://github.com/bian-official/public) publica **14.0.0** como conjunto más reciente listado. Se fija el commit `b58bf4c2c300dd018afc084e9bb24b7adaaa3500` (12/02/2026), sin `latest` flotante.

Se eligen exclusivamente las **Semantic APIs BOM extended, OAS 3.x**, directorio literal `release14.0.0/semantic-apis/oas3 /yamls/` (incluye espacio después de `oas3`): 258 YAML enumerados por el árbol Git no truncado. No mezclar con ISO20022 extended / DDD ni AsyncAPI. Es cobertura del conjunto publicado elegido, no de todos los dominios del Landscape. Cada API representa un dominio según README oficial. No se extraen diagramas, PDFs, portal ni taxonomías del sitio.

Se conservan literalmente `info.title`, `info.description`, `info.version`, método/ruta, `operationId`, summary/description y tags de cada operación de `paths`. La acción se muestra como el último segmento literal de la ruta oficial; no se inventa una definición universal para ese verbo ni se infieren capas o pertenencias. Las definiciones siguen en inglés. Errores o peculiaridades de la fuente se conservan y se diagnostican cuando impiden extraer; no corregirlos silenciosamente.

Un manifiesto versionado `data/bian/manifest.json` fija todos los archivos por ruta, Git blob SHA-1 y SHA-256, además de SHA-256 del catálogo derivado y de LICENSE. El script `scripts/bian-catalog.mjs` verifica la proyección reproducible; solo el modo explícito `--download` obtiene esos archivos fijados en `work/`, ignorado. Ni build ni arranque descargan BIAN. Cambiar versión/conjunto requiere revisar este ADR, lock/manifiesto y pruebas; no sustituir revisiones silenciosamente.

## Condiciones de uso y distribución

El [LICENSE del repositorio fijado](https://github.com/bian-official/public/blob/b58bf4c2c300dd018afc084e9bb24b7adaaa3500/LICENSE) declara **Apache-2.0**. Se conserva copia literal en `licenses/bian-Apache-2.0.txt`, atribución a BIAN y contribuidores y aviso de extracción/modificación en el catálogo, manifiesto y THIRD_PARTY_NOTICES. El árbol revisado no contiene NOTICE adicional. La elección se limita a los artefactos de ese repositorio y no extiende esa licencia al sitio/portal/documentación externa. No se utilizan logos ni se presenta patrocinio o certificación BIAN. La licencia de publicación del código propio continúa pendiente; este trabajo no autoriza publicar/subir archivos.

## Diseño y funcionamiento local

Acceso **Consultar BIAN** dentro de Contratos. Buscar por propósito o término en español/inglés, filtrar por acción y abrir un dominio para revisar sus operaciones y denominaciones oficiales. La ayuda léxica española es una convención local versionada, identificada por separado; no es traducción oficial ni regla institucional. Mostrar coincidencias y términos expandidos, alternativas y ausencia de coincidencias; no declarar un resultado único correcto. Permitir explorar sin consulta.

Datos de referencia incluidos en el plugin, procesamiento íntegro en navegador. Fuente/versiones/commit/licencia disponibles dentro del panel como texto y enlaces explícitos; sin abrir otra web para consultar definiciones. No descargar referencias, ejecutar APIs ni enviar el propósito a servidores. Texto mediante textContent, sin HTML/Markdown activo de la fuente. Consulta limitada en longitud y términos; resultados incrementales y operaciones de un solo dominio para limitar DOM. Sin dependencias nuevas.

`src/bian` conserva datos/tipos/búsqueda independientes del DOM y del editor; vista en `src/catalog`, integración en `drawio-adapter`. Colores, clases y tipografía nativos en claro/oscuro. Swagger UI 5.33.2 conserva aislamiento, búsqueda/importación existentes y selección por referencia. Volver a Contratos recupera la consulta previa; seleccionar una API/endpoint del lienzo sigue mostrando su contrato.

No se escribe catálogo, propósito, resultados ni selección BIAN en mxfile, figuras, borradores o localStorage. Estado de consulta solo en memoria, reiniciado al cambiar de documento. No se cambia la persistencia de ADR-002/010 ni el presupuesto de snapshots/borradores.

## Aceptación y límites

- Reproducibilidad y huellas contra los 258 archivos fijados, licencia y conteos; consulta real de dominios/operaciones y casos sin coincidencias, filtros, español/inglés y límites.
- Editor real: navegación por teclado, consulta claro/oscuro, vuelta a Swagger/importación/selección, sin autoría; conservación de datos/figuras/undo/páginas y reapertura limpia/sin extensión.
- Arranque y búsqueda con red externa bloqueada tras bootstrap; cero llamadas externas y errores de página en el recorrido nuevo.
- Ejecutar TypeScript, build, núcleo y regresión pertinente. Registrar evidencia real; no equiparar búsqueda léxica con comprensión semántica ni piloto humano.

Pendientes: evaluación con usuarios, ampliación de vocabulario según casos reales, otros conjuntos/versiones y asociaciones explícitas (requieren decisión propia). Sin traducciones automáticas, lineamiento institucional, ranking semántico, payloads BIAN completos o Swagger de las APIs BIAN en esta porción.

## Resultado comprobado

Catálogo extraído de los 258 YAML fijados y reproducido con `node scripts/bian-catalog.mjs`, verificando cada Git blob/SHA-256, licencia y proyección completa. **4.580 operaciones**, catálogo de 2.171.027 bytes con SHA-256 `be3d4320380e30cff5f4c11a385fceb303d51b5a63dbbd0689e732ea8e56fd74`. La fuente trae **16 artefactos sin operaciones en paths** y **Information Provider Operation sin descripción de dominio**; se conserva y comunica su ausencia. [Verificación y anomalías](../evidence/bian-catalog-verification.json).

TypeScript/build, **24 pruebas de núcleo**, **18 escenarios completos de navegador (127,7 s)** y **2 escenarios focalizados finales (16,9 s)** aprobados. El cierre focal repite check/build/núcleo tras ajustar solo el desempate de rutas para anteponer la operación general a suboperaciones con igual relevancia léxica. La regresión anterior sigue identificada como tal; no se atribuye una nueva ejecución completa a ese ajuste.

Las pruebas nuevas ejercitan consulta española/inglesa, acción Retrieve y sus nueve operaciones de Current Account, Initiate de Loan, definiciones/fuente/versión, estados sin operaciones/definición/coincidencias, ampliación incremental de resultados, teclado y foco, colores nativos oscuros y panel de 300 px. Consulta, navegación entre páginas, selección de endpoint y vuelta a Swagger; inserción/undo/redo, reimportación idéntica desde BIAN, datos de figuras/snapshots/borradores y ids reales de páginas conservados. Guardado físico, reapertura limpia, reserialización con editor sin extensión y propósito ausente del archivo. Cambiar documento limpia propósito/filtros. Texto de propósito con marcado no crea HTML ni solicitudes. No se evalúa comprensión semántica, certificación ni utilidad humana.

Arranque adicional con **Node y Chromium sin red externa**, dependencias/WAR ya preparados: build/servidor y consulta real de BIAN aprobados (660 ms hasta health en esta ejecución). Cero solicitudes externas y errores de página en recorridos nuevos. No se repite descarga/bootstrap limpio ni se cambian editor, overlays, dependencias o lockfile. [Resumen trazable](../evidence/bian-summary.json), [funcional](../evidence/bian-functional-summary.json), [tema/teclado](../evidence/bian-dark-summary.json), [arranque aislado](../evidence/bian-offline-summary.json), [regresión](../evidence/bian-regression-results.json), [cierre focal](../evidence/bian-focused-results.json).

Se corrigió la limpieza al sustituir fileNode sin evento fileLoaded: se detecta identidad real del nodo documental. Las páginas del mismo documento no limpian la consulta. El historial undo nativo incluye navegación de páginas; la prueba de ausencia de ediciones se acota a la consulta y verifica los datos por separado después de navegación/reapertura. No se supone que el historial viaje en el archivo.
