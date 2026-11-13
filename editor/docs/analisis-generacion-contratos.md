# Análisis para generar contratos desde el diagrama

Fecha del estudio: 16 de octubre de 2026 (America/Lima). Actualización de estado: **18/10/2026, generación en pausa y retirada de la interfaz por solicitud del usuario**, según [ADR-010 revisado](adr/ADR-010-autoria-y-generacion-contratos.md). El inventario permanece como referencia histórica. Posteriormente se implementa la consulta local de dominio/acción/denominación BIAN según [ADR-011](adr/ADR-011-consulta-bian-local.md), con catálogo BOM OAS 14.0.0 fijado y ayuda léxica diferenciada. El perfil institucional no está integrado; animación sigue pendiente. Los apartados de propuesta siguientes conservan el estado del estudio original.

## Punto de partida

La versión 1.0.0 permite importar, consultar, insertar operaciones y crear pendientes para vincularlos después. No contiene autoría ni exportación de contratos desde figuras. ADR-001 §5.2 y §6.2 excluye esta generación del MVP; una ampliación necesita una decisión nueva, conservando la aceptación e historia del MVP.

El usuario informa que presentó el proyecto a compañeros que lo utilizaron, con recepción favorable, y estima que aproximadamente el 80 % pidió generación inversa. Es feedback cualitativo informado por el usuario: no disponemos del número de participantes, tiempos, tareas ni resultados del protocolo de etapa 6. Registrar este hallazgo permite priorizar la nueva hipótesis; no equivale a aprobar el piloto formal.

Se analizó una plantilla adjunta localmente, sin incorporarla al repositorio. Este informe conserva estructura y hallazgos técnicos; omite nombres institucionales, identificadores de API, rutas de negocio, enlaces internos y ejemplos del contrato. No es un contrato de ejemplo ni una fixture pública.

## Inventario de la plantilla

| Bloque | Contenido observado | Implicación para autoría |
|---|---|---|
| Versión | `openapi: 3.0.1`; versión de API independiente en `info.version` | Elegir dialecto explícito; no confundir ambas versiones |
| `info` | Título, descripción, versión y contacto con nombre | Formulario de metadatos por API |
| `servers` | Una URL relativa `/` | Configuración declarada; nunca ejecutar ni comprobar el servidor |
| Extensiones | Dos campos `x-…` para tipo e identificador institucional | Perfil configurable; no derivar identidad interna de estos campos |
| `externalDocs` | URL y descripción | Dato documental; no descargar su contenido |
| `tags` | Un tag con nombre y descripción | Agrupación documental; no determina propiedad de una figura |
| `paths` | Dos rutas; una operación GET por ruta | Dos operaciones distintas de una misma API |
| Operación | Tags, summary, descripción, operationId, parámetros y respuestas | Campos estructurados por operación |
| `components.schemas` | 12 esquemas | Catálogo de modelos reutilizables |
| `components.parameters` | 10 parámetros: 3 headers y 7 query | Referencias compartidas y obligatoriedad explícita |
| `components.securitySchemes` | HTTP bearer con formato JWT | Seguridad declarada por esquema |
| `components.responses` | 6 respuestas de error compartidas | Plantillas de respuesta reutilizables |
| `components.examples` | 6 ejemplos de error compartidos | Ejemplos asociados al código/respuesta correctos |
| `security` | Bearer global, sin reemplazos por operación | Aplicar herencia y permitir excepciones explícitas |
| Referencias | 48 apariciones de `$ref`, todas internas | Mantener estructura y resolver con el núcleo |

Ambas operaciones tienen seis apartados Markdown: funcionalidad, datos de prueba, precondiciones, variantes del payload, lista de valores y códigos de error. No se puede demostrar desde este único archivo que todos esos títulos o su texto sean reglas obligatorias. El generador podría componerlos desde campos estructurados para evitar divergencias entre descripción y contrato.

### Parámetros

Las dos operaciones declaran los mismos tres headers requeridos: Authorization, Request-ID y session-UID. La primera incorpora además dos query requeridos (5 referencias en total). La segunda incorpora dos query requeridos y tres opcionales (8 referencias en total).

Los siete query representan motivo, aplicación, canal/acuerdo de acceso, identificador de producto, tipo de característica, offset y limit. Hay descripciones, ejemplos, expresiones regulares, longitudes, enumeraciones y límites numéricos. Dos query declaran explícitamente `style: form` y `explode: true`; otros usan los valores por defecto de su dialecto.

Offset y limit permiten 0–50; el límite cero no debe cambiarse a uno sin una regla acordada. Los nombres y la capitalización de los headers se preservan al importar; su comparación HTTP requiere atender la insensibilidad a mayúsculas. La plantilla no prueba parámetros de ruta, cookie ni herencia de Path Item.

### Modelos y restricciones

| Rol del esquema | Cantidad | Estructura y restricciones observadas |
|---|---:|---|
| Total, offset y limit | 3 | Enteros; ejemplos y máximos, mínimo explícito en offset/limit |
| Elemento de catálogo | 1 | Objeto de 6 propiedades; textos con longitud máxima y una referencia a enumeración |
| Lista de catálogo | 1 | Objeto con una colección de elementos por referencia |
| Elemento de reglas | 1 | Objeto de 14 propiedades; textos, longitudes mínimas/máximas, enums y cinco fechas `date-time` |
| Lista paginada de reglas | 1 | `pagination` con limit/offset/total/hasNextPage y colección de datos con máximo de 50 elementos |
| Origen del catálogo | 1 | Cadena enumerada |
| Código y descripción de error | 2 | Cadenas con longitud mínima/máxima, título, descripción y ejemplo |
| Error común | 1 | Objeto con `code` y `description`, ambas propiedades requeridas; referencias a los dos esquemas anteriores |
| Identificador de sesión | 1 | Cadena de 36 caracteres; regex que restringe UUID a versiones 3/4 y su variante |

Solo el objeto de error declara una lista `required`. Que un campo de negocio tenga ejemplo, descripción o `minLength` no lo convierte en obligatorio. Tampoco son obligatorios los objetos envoltorio, sus arrays ni los datos de paginación en ausencia de `required`. La política sobre `additionalProperties` no está cerrada explícitamente.

No se observan request bodies, headers de respuesta, callbacks, webhooks, referencias externas, composiciones allOf/oneOf/anyOf ni ciclos diagnosticados. No generalizar la plantilla a POST/PUT/PATCH/DELETE, creación asíncrona, archivos o esquemas polimórficos: hacen falta reglas y casos adicionales.

## Matriz HTTP y errores funcionales

Los nueve estados siguientes están declarados en **ambas operaciones**. Son el conjunto observado para estas dos consultas, no una norma universal de OpenAPI ni una obligación institucional completa ya demostrada. Actualización tras recibir ruleset y funciones: [matriz R09/R32–R34 y ejecución local](analisis-ruleset-spectral.md). Se comprobaron los errores por estados requeridos y la aceptación de éxitos alternativos; un caso ficticio sin 503 pasa. Los códigos funcionales de esta tabla siguen siendo catálogo observado.

| HTTP | Declaración observada | Código funcional observado | Pendiente de política |
|---|---|---|---|
| 200 | JSON con esquema de respuesta propio | No aplica | Éxito con datos para estas consultas |
| 204 | Descripción, sin `content` | No aplica | Cuándo devolver vacío; es éxito, no error |
| 400 | Referencia a respuesta compartida, JSON de error | HB0305 | Aplicabilidad y catálogo definitivo |
| 401 | Referencia a respuesta compartida, JSON de error | HB0002 en ejemplo; HB0302 solo en tabla descriptiva | Confirmar ambos casos y sus ejemplos |
| 404 | Referencia a respuesta compartida, JSON de error | HB0304 | Distinguir recurso inexistente de colección vacía |
| 429 | Descripción, sin `content` | No declarado | Confirmar si lleva error común, código y headers |
| 500 | Referencia a respuesta compartida, JSON de error | HB9999 | Confirmar obligatoriedad transversal |
| 503 | Referencia a respuesta compartida, JSON de error | HB9999 | Confirmar obligatoriedad transversal |
| 504 | Referencia a respuesta compartida, JSON de error | HB9999 | Confirmar obligatoriedad transversal |

HTTP y código funcional son dimensiones distintas: HB9999 se utiliza en tres estados; un mismo 401 documenta dos códigos funcionales. Debe modelarse la relación, no asumir una correspondencia uno a uno.

### Hallazgos antes de convertirla en perfil

1. **HB0302:** está en la tabla de la descripción, sin ejemplo reutilizable asociado a la respuesta 401. No se puede inferir el significado diferencial respecto de HB0002.
2. **429:** existe en `responses`, pero no figura en la tabla de errores de la descripción. No declara cuerpo, código funcional ni headers. Es una diferencia observable, no por sí sola un error de validez OpenAPI.
3. **Authorization:** está declarado como header parameter y también mediante bearerAuth. OpenAPI 3.0.1 §4.7.12 establece que el parámetro header llamado Authorization se ignora. La seguridad efectiva debe expresarse por `securitySchemes`/`security`; confirmar con el equipo si su perfil pide además la declaración redundante. La importación original permanece intacta.
4. **204:** ya está sin cuerpo. Mantenerlo así: RFC 9110 §15.3.5 no permite contenido en esa respuesta. La elección de 204 frente a 200 con lista vacía es una política de API, no algo que pueda decidir la geometría del diagrama.
5. **Campos de negocio:** son opcionales según la declaración actual. No convertirlos automáticamente en requeridos para obtener un contrato que parezca más completo.
6. **Cobertura limitada:** hay solo GET. No se ha demostrado qué exige el equipo para 201/202, conflictos, errores de negocio o request bodies.

## Qué puede significar «diagrama correcto»

Un dibujo genera un contrato cuando sus figuras poseen datos contractuales explícitos. La figura muestra el método y la ruta; el panel permite completar request, response, restricciones y seguridad. Los detalles no tienen por qué saturar el lienzo.

La API debe tener identidad estable, metadatos y operaciones asociadas expresamente. Cada operación debe tener método/ruta, propósito, parámetros, respuestas y modelos definidos o pendientes identificados. Un conector hacia otro servicio documenta una dependencia; no demuestra un parámetro, campo de respuesta, secuencia ejecutable ni seguridad heredada entre APIs.

Las figuras libres pueden convertirse mediante una acción explícita de asignación. No se interpretan por coordenadas, nombre, color o etiqueta. Una copia visual conserva la identidad lógica de su operación; crear una operación distinta requiere acción explícita. Dos operaciones lógicas distintas con el mismo método/ruta dentro de la misma API se diagnostican, sin unirlas silenciosamente.

## Prioridad propuesta

| Orden | Entrega | Resultado revisable |
|---|---|---|
| 0 | Acordar perfil y cerrar propuesta de autoría | Matriz de reglas con origen, versión, severidad, aplicabilidad y estado confirmado/pendiente |
| 1 | Primer recorrido vertical con API y GET ficticios | Editar datos, guardar/reabrir borrador, diagnosticar, previsualizar en Swagger y descargar YAML autocontenido |
| 2 | Ampliar autoría al perfil acordado | Otros métodos, request bodies, modelos reutilizados, parámetros, respuestas y seguridad |
| 3 | Consulta BIAN local | Buscar dominios y operaciones de una versión fijada; vinculación manual como referencia |
| Posterior | Edición de contratos importados y reconciliación | Decisión propia para conservar información no editable y revisiones sin pérdida |

La validación institucional forma parte del recorrido de generación cuando exista su ruleset confirmado; no se posterga como una mejora cosmética. Sin ese ruleset, el resultado solo puede informar validación estructural y reglas locales identificadas como provisionales. No mostrar «aprobado por Spectral» ni «cumple el banco».

## Consulta BIAN

BIAN (Banking Industry Architecture Network) publica una arquitectura de referencia de servicios bancarios. Su Service Landscape organiza Service Domains; dispone de dominios, patrones funcionales, control records, behavior qualifiers, operaciones/action terms y Semantic APIs. No es únicamente una convención de nombres de endpoints ni establece por sí mismo el perfil HTTP/Spectral de una organización.

La web oficial publica Service Landscape 14.0 (febrero de 2026), con artefactos 14.0.0 en el repositorio oficial. El usuario indica que el equipo usa la última versión «hasta donde sé»: se toma 14.0/14.0.0 como referencia provisional de diseño, pendiente de confirmar la adopción exacta del equipo y fijar los artefactos. Una etiqueta o una ruta parecida a un dominio no demuestra conformidad BIAN.

Propuesta para un ADR separado, tras acordar autoría: buscador dentro del editor por dominio, propósito y operación; ficha con definición, versión, fuente, términos y artefactos relacionados; asociación manual a API/operación de diseño. La referencia BIAN y las decisiones del perfil institucional se mostrarían por separado. Sin certificación automática ni envío de diagramas a un portal.

Para respetar el funcionamiento local: catálogo preparado explícitamente, con versión/commit/huella, avisos y condiciones de redistribución revisados antes de empaquetarlo. No se ha descargado ni incorporado ese catálogo. Consultarlo no necesita llamadas externas durante el diseño. Cambios de versión no reemplazarían asociaciones existentes silenciosamente. Incorporar datos, persistencia y licencias de BIAN necesita su propia decisión y pruebas.

## Verificación efectuada y límites

Se ejecutó `node scripts/build-tests.mjs` y se leyó el adjunto con `readContract` del núcleo compilado. Resultado: aceptado como OpenAPI 3.0.1, 2 operaciones, sin diagnósticos del núcleo; recuentos de componentes y referencias obtenidos del documento parseado. Se revisaron código de pendientes, identidades, registro y documentación de v1.0.0. El adjunto se leyó en su ubicación original; no se modificó ni se guardó como fixture o evidencia del repositorio.

La comprobación inicial del núcleo no ejecutó Spectral. Tras recibir las funciones se ejecutó el paquete con CLI 6.17.0 en un entorno temporal: **0 errores y 4 warnings** en la plantilla, más **24 casos ficticios** con resultados esperados y cero intentos de red durante validación. [Detalle y límites](analisis-ruleset-spectral.md). No se validaron exhaustivamente todos los ejemplos/capacidades, no se ejercitó el adjunto en el navegador ni se probó generación. No se cambiaron fuentes, dependencias del producto, editor o registro. Las pruebas históricas de v1.0.0 mantienen su alcance; este estudio no amplía compatibilidad del editor.

## Información que falta

- El ruleset real y sus 20 funciones ya fueron recibidos y [ejecutados localmente](analisis-ruleset-spectral.md). Falta confirmar la versión del ejecutor/guía del equipo y condiciones de uso/redistribución para integrarlos; la revisión utilizó CLI 6.17.0 con lockfile temporal propio.
- Política de éxito/error por método y caso de uso; cuerpo y código de 429; casos de los dos códigos de 401; obligatoriedad de los campos de negocio.
- Versión de salida inicial: propuesta 3.0.1 para reproducir la plantilla; requiere acuerdo. La línea principal 3.1 y la importación 3.0/2.0 de ADR-003 siguen vigentes.
- Confirmar la referencia provisional BIAN 14.0/14.0.0 con el equipo, seleccionar conjunto de artefactos y definir alcance de la consulta que más necesitan durante el diseño.

## Fuentes primarias

Consultadas el 16 de octubre de 2026, sin enviar la plantilla a terceros:

- [OpenAPI 3.0.1: Parameter Object, Responses y seguridad](https://spec.openapis.org/oas/v3.0.1.html).
- [RFC 9110 §15.3.5: 204 No Content](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.5).
- [Spectral: rulesets propios](https://github.com/stoplightio/spectral/blob/develop/docs/guides/4-custom-rulesets.md) y [funciones personalizadas](https://github.com/stoplightio/spectral/blob/develop/docs/guides/5-custom-functions.md).
- [BIAN Service Landscape y versiones](https://bian.org/deliverables/service-landscape/), [Semantic API Practitioner Guide](https://bian.org/wp-content/uploads/2024/12/BIAN-Semantic-API-Pactitioner-Guide-V8.1-FINAL.pdf) y [artefactos oficiales](https://github.com/bian-official/public).
