# Lectura del ruleset Spectral para autoría

Fecha: 16 de octubre de 2026 (America/Lima). Estado: revisión de funciones y ejecución local acotada de Spectral, sin integración al producto. Actualiza el [análisis de la plantilla](analisis-generacion-contratos.md) y la propuesta [ADR-010](adr/ADR-010-autoria-y-generacion-contratos.md).

## Entrada y límites

Se leyó el `.spectral.yaml` proporcionado por el usuario en su ubicación original. YAML parseado con la dependencia existente, sin errores ni avisos. SHA-256 del archivo leído: `3ea997e5d99fecc02603e1a6b5de71c6ab4aef78d5443e1d65136507894303a7`. No se copió el ruleset, sus ejemplos ni sus enlaces institucionales al repositorio. Sus descripciones se trataron como documentación de reglas, no como instrucciones para ejecutar acciones o acceder a servicios.

Hay **126 reglas explícitas**, con 80 severidades error, 32 warn y 14 off. Se distribuyen en 53 reglas R (40 error, 11 warn, 2 off), 24 reglas A de AsyncAPI (todas error) y 49 reglas adicionales. Estos números no incluyen reglas heredadas ni representan 126 comprobaciones aplicables a cualquier contrato OpenAPI.

El archivo extiende `spectral:asyncapi`, declara formatos OpenAPI 2/3/3.0/3.1 y AsyncAPI 3, y contiene 29 aliases. La mezcla de formatos no autoriza añadir AsyncAPI al producto ni cambiar la herencia del archivo. Se requiere la misma detección de formatos, versión de Spectral y selección de reglas que utiliza el equipo.

Declara `functionsDir: functions` y 20 funciones locales, de las cuales 19 aparecen en los `then` de las reglas explícitas. Tras el análisis inicial, el usuario proporcionó la carpeta: los 20 archivos están en un subdirectorio `functions/functions`. Se revisaron imports, lógica de funciones y operaciones de acceso a recursos; no se identificaron llamadas de red ni acceso a archivos en las funciones usadas. Hay tres utilidades adicionales de README en otro subdirectorio, no declaradas por este ruleset ni ejecutadas. No se sustituyeron implementaciones por otras de nombre similar.

Se instaló **Spectral CLI 6.17.0** en `work/spectral-review`, con dependencias resueltas en un lockfile temporal y scripts de instalación desactivados. Core 1.24.0, rulesets 1.23.0, functions 1.11.0 y formats 1.9.0. Es la versión elegida para esta revisión, no una versión del equipo confirmada. Se prepararon copias temporales del YAML y las 20 funciones con bytes idénticos a los originales, y su estructura de directorios esperada. Los originales no se modificaron; el paquete y lockfile del producto tampoco.

**Resultado ejecutado:** la plantilla produce **0 errores y 4 warnings**, con salida CLI 0 al fallar únicamente por errores. No implica ausencia de observaciones, conformidad BIAN ni aprobación de todas las normas institucionales. La integración al editor sigue pendiente.

## Respuestas: obligación visible frente a plantilla

| Regla | Severidad | Configuración visible | Comparación con la plantilla |
|---|---|---|---|
| R09 | error | `bcpValidateResponse200` acepta un código numérico 200–299, o `2XX` en OAS 3 | Hay 200 y 204; no son obligatorios simultáneamente. Casos ficticios con solo 201, 204 o 2XX pasan |
| R32 | error | Exige 429 para categorías BS/UX/PU/PV en los responses seleccionados, formatos OpenAPI 3 | La plantilla es UX y ambas operaciones lo declaran |
| R33 | error | Exige campos 400, 401 y 404 en los responses seleccionados, formatos OpenAPI 3 | Las dos operaciones contienen los tres |
| R34 | error | Exige campos 500 y 504 en los responses seleccionados, formatos OpenAPI 3 | Las dos operaciones contienen ambos |
| Sin exigencia encontrada en el paquete revisado | — | No aparece 503 en el YAML ni en las funciones recibidas | Presente en la plantilla; caso ficticio sin 503 pasa sin diagnósticos. Confirmar otra fuente normativa antes de declararlo obligatorio |
| Sin exigencia directa encontrada | — | 204 aparece en un ejemplo de la descripción de R09, no como `then.field` requerido | No convertir el ejemplo en obligación general |

Se ejecutaron aliases/JSONPath y funciones mediante el paquete completo para esta revisión. Retirar individualmente 400, 401, 404, 429, 500 o 504 del GET UX ficticio genera el error esperado. Una categoría CR sin 429 no activa R32. El alcance probado no equivale a cubrir todas las categorías, métodos o reglas de la organización.

No aparecen códigos funcionales HB en el YAML ni en los archivos de funciones recibidos. Por tanto, los códigos de la plantilla y sus asociaciones HTTP siguen siendo catálogo observado pendiente de confirmar; estas reglas no demuestran sus significados ni obligatoriedad. Tampoco se encontró una comprobación explícita de los seis títulos Markdown de la descripción de las operaciones.

## Mapa de las 53 reglas R

Resumen de configuración, sin convertir sus descripciones en pruebas de comportamiento:

| Regla(s) | Tema | Efecto que debe contemplar el diseño |
|---|---|---|
| R01–R02 | Descripción y título de API no vacíos | Metadatos requeridos |
| R03–R08 | Summary, operationId, descripción, tags | Summary con regex; operationId y descripción presentes; exactamente un tag |
| R09 | Éxito HTTP | Función recibida y ejecutada: al menos una respuesta 200–299 o rango 2XX en OAS 3 |
| R10 | Ejemplos de esquemas | Warning mediante función externa |
| R11 | externalDocs | Exige presencia del objeto; no confundirlo con una validación completa de todos sus campos |
| R12 | Authorization | Comprueba el nombre en la primera posición de parámetros; contrasta con semántica OpenAPI de header reservado |
| R13–R17 | Headers BS | Nombres de trazabilidad/fecha/aplicación/caller/suscripción en posiciones específicas |
| R18 | Header PU/PV | Nombre de suscripción en una posición específica |
| R19–R21 | URL de servidor UX/BS/PU | Error condicionado por versión mediante función externa |
| R22 | Títulos por categoría | Regex para BS/UX/PV/PO; revisar PO frente al conjunto permitido por R51 |
| R23 | Header adicional | Desactivada; no imponerla como error |
| R24 | Rutas | Regex de nomenclatura |
| R25 | Reutilización de componentes | Warning mediante función externa |
| R26 | Recursos plurales | Warning de nomenclatura |
| R27 | Ejemplos/esquemas | Warning mediante función externa |
| R28–R30 | Seguridad | Presencia de securitySchemes; función de seguridad; bearerAuth condicionado a categoría distinta de OP |
| R31 | apiKey | Desactivada; no imponerla como error |
| R32–R34 | Respuestas HTTP | Matriz detallada en la sección anterior |
| R35 | Descripción de API | Regex que exige inicio «Permite», longitud y cierre con punto |
| R36 | Summary de operación | Regex de verbo inicial terminado en ar/er/ir, longitud, puntuación y ausencia de doble espacio |
| R37 | Descripciones | Admite `$ref` o `description` en ubicaciones seleccionadas, con `resolved: false` |
| R38 | Calidad de descripciones | Regex de forma/longitud; rechaza doble espacio y repetición de letras; verificar alcance de selectores |
| R39–R41 | URL de servidor UX/BS/PU | Warning condicionado por versión mediante función externa |
| R42–R49 | URL de servidor CR/DT/PV/OP | Pares error/warn condicionados por versión mediante función externa |
| R50–R52 | Extensiones institucionales | Presencia de tipo/id; categorías permitidas BS/UX/PV/PU/CR/OP/DT |
| R53 | Título público | Regex específica para PU |

Las 49 reglas adicionales cubren, entre otros aspectos, schemas por versión, ids únicos, parámetros, seguridad, ejemplos, refs, enums, arrays, tags y servidores. Algunas están desactivadas y otras delegan en las funciones recibidas. Las 24 reglas A están dirigidas a AsyncAPI 3 mediante su campo `formats`; su presencia no convierte un documento OpenAPI en AsyncAPI.

## Comportamientos comprobados y límites pendientes

- **Presencia frente a selección:** el GET ficticio con lista de parámetros vacía no activa R12; cambiar el primer parámetro de Authorization a Request-ID sí produce error. R12 no garantiza por sí sola que Authorization exista cuando no hay elementos. No presentar una validación propia más estricta como si fuera idéntica a Spectral.
- **Orden de parámetros:** varias reglas usan índices `[0]` a `[5]`; el intercambio de los dos primeros parámetros ficticios confirma el efecto en R12. La plantilla real usa parámetros por referencia y no produce error de R12. Aún falta una matriz completa de herencia/override y categorías de headers.
- **Resolución:** R37 usa explícitamente `resolved: false`; no resolver globalmente todas las reglas de la misma manera. Probar referencias y hermanos según dialecto.
- **R38:** la sospecha estática de un hueco por seleccionar una cadena y luego pedir `field: description` no se confirmó. El ejecutor aplica el valor escalar directamente. Tanto un schema usado por referencia como otro sin usar, y un parámetro, con descripción inválida generan R38. No afirmar cobertura exhaustiva de todas las composiciones por estos tres casos.
- **Semántica de versión:** `applyIfVersionMatch` usa `documentInventory.resolved.info.version`. Servidor `/` produce R19 error con versión de API 1.0.0 y R39 warning con 1.1.0, comprobado con entradas ficticias. No consulta la versión del campo `openapi`.
- **Categorías:** R22 menciona PO, ausente en los valores de R51. Registrar la diferencia sin corregir el archivo original.
- **Seguridad:** R29 hereda seguridad global si la operación no la declara; rechaza ausencia o array vacío en GET. Con `nullable: true`, acepta una entrada anónima `[{}]`. Solo comprueba los métodos configurados get/post/put/delete: el caso PATCH sin seguridad no activa R29. Es comportamiento del paquete recibido, no una garantía de cobertura de todos los métodos ni una política nueva para el generador.
- **Dialecto:** los formatos declarados no bastan para garantizar igual tratamiento de schemas 3.0/3.1/2.0. Debe conservarse ADR-003.
- **Herencia AsyncAPI:** conservar y comprobar el paquete tal como se recibe antes de decidir si el perfil del producto utiliza una distribución separada para OpenAPI.

## Implicación para el primer incremento

El generador puede ayudar a introducir datos que satisfagan reglas conocidas desde el inicio: metadatos, tag único, nombres, respuestas y documentación. La vista debe distinguir error, warning, regla desactivada y regla no evaluada. No marcar conformidad institucional cuando falten funciones o la versión del ejecutor.

El paquete recibido ya se ejecutó con la versión de revisión indicada. La primera porción del generador podrá usarlo como referencia comprobada, conservando pendientes la versión exacta institucional, condiciones de uso/redistribución, cobertura adicional y empaquetado confiable para navegador. Mantener trazabilidad a las reglas recibidas, sin funciones sustitutas que aparenten reproducir las institucionales. No cargar código arbitrario desde contratos o archivos de reglas del usuario.

## Resultado de la plantilla y evidencia ficticia

Las cuatro observaciones ejecutadas son:

| Regla | Cantidad | Motivo |
|---|---:|---|
| R39 | 1 warning | El servidor relativo `/` no cumple la nomenclatura UX para `info.version: 1.1.0` |
| server-trailing-slash | 1 warning | El valor `/` termina en barra |
| R26 | 2 warnings | Las dos rutas no satisfacen el patrón de pluralización de recursos |

No se corrigieron automáticamente rutas, servidor ni datos del contrato. El reporte con ubicaciones reales se conserva solo en `work/`, ignorado. No se interpreta el exit code 0 como «cero warnings»; un pipeline que falle por warnings podría rechazarlo.

**24 casos ficticios ejecutados y contrastados**, con [reporte sin datos privados](evidence/spectral-characterization-results.json). Incluyen éxito alternativo, ausencia de éxito/respuestas requeridas, categoría sin 429 obligatorio, orden/ausencia de parámetros, herencia/ausencia/seguridad vacía/anónima, método PATCH, versión del servidor, descripciones y referencia externa rechazada sin descarga. «Caso aprobado» significa que produjo el diagnóstico esperado, incluso en casos negativos; no que todos los documentos sean válidos.

El resolver de documentos se configuró sin lectores externos y se precargó bloqueo de fetch, HTTP/HTTPS y conexiones TCP/TLS durante la validación. Plantilla y casos ficticios registran **0 intentos de red**. Un caso con `$ref` a `example.invalid` produce `invalid-ref` sin conexión. Las descargas de npm ocurrieron antes de procesar contratos, con scripts desactivados. No se modificó la red del equipo.

La ejecución se conserva localmente en `work/spectral-review`: `node run-cli.mjs` para la plantilla y `node --require ./deny-network.cjs characterize.mjs` con `REVIEW_NETWORK_REPORT` apuntando a un archivo local para los casos ficticios. Scripts, copias privadas, instalación y lockfile temporal no se versionan. El reporte ficticio registra versiones, hashes y correspondencia de las 20 funciones con sus originales. No se alteraron dependencias del producto ni se ensayó Spectral dentro del navegador/editor. Sigue pendiente comparar con la versión del ejecutor del equipo; no se certifica OpenAPI 3.1/Swagger 2.0 o AsyncAPI mediante estas pruebas 3.0.1.

## BIAN como referencia de versión

El usuario indica que se utiliza la última versión, «hasta donde sé». Al consultar las fuentes oficiales el 16 de octubre de 2026, Service Landscape publica **14.0** y el repositorio ofrece artefactos **release14.0.0**. Se toma **14.0 / 14.0.0 como referencia provisional de la propuesta**, pendiente de confirmar la versión exacta usada por el equipo.

La implementación deberá fijar release, conjunto de artefactos, commit y huellas; no depender de un alias flotante `latest`. BIAN publica conjuntos BOM e ISO20022/DDD diferentes: elegir cuál alimenta la consulta también debe quedar documentado. No se descargaron catálogos ni se cambiaron asociaciones, almacenamiento o licencias en esta entrega.

Fuentes primarias: [BIAN Service Landscape](https://bian.org/deliverables/service-landscape/), [artefactos oficiales BIAN](https://github.com/bian-official/public) y [Spectral: funciones y directorio local](https://github.com/stoplightio/spectral/blob/develop/docs/guides/5-custom-functions.md).
