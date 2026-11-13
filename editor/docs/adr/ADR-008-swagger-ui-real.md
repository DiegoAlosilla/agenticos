# ADR-008 — Swagger UI real dentro del lateral de Draw.io

14 de octubre de 2026 (America/Lima). Aceptado por instrucción expresa del usuario: reutilizar la librería de Swagger, en el lateral nativo de formato. Sustituye únicamente la decisión de renderer propio de ADR-006/007. **ADR-009 sustituye la cabecera separada y la selección automática por una pestaña nativa Contratos con consulta de API completa; se mantiene la elección y configuración de la librería de este ADR.**

## Decisión

Usar `swagger-ui-dist` **5.33.2** exacto, JavaScript/CSS empaquetados por esbuild con el plugin local, sin CDN ni otra web. Es Swagger UI, la librería de documentación adecuada para la vista solicitada; no se añade un segundo editor de definiciones Swagger Editor. El paquete dist trae React/Swagger Client y su renderer completo; se elige para reutilizar el bundle oficial sin introducir un montaje React independiente. Coste: bundle mayor, medido en compatibilidad; no se promete el peso anterior.

Endpoint/Catálogo/Formato siguen compartiendo la columna derecha de Draw.io 32.4.1. Seleccionar padre o hijo actualiza automáticamente una sola operación. Consultar en catálogo usa el mismo renderer sin insertar. Formato conserva los hijos y acciones nativos. Las notificaciones de ancho debidas al ajuste responsive no deben robar la pestaña activa; el conmutador explícito de Formato mantiene su función.

## Separación y persistencia

`contracts` conserva parser, validación, dialectos y modelo canónico; no importa Swagger, DOM ni Draw.io. `inspector/swagger.ts` recibe una copia del documento ya aceptado y el OperationView seleccionado. `drawio-adapter/endpoint-dock.ts` solo relaciona selección/archivo/registro con esa vista.

Swagger resuelve referencias internas para su presentación; no es el criterio de aceptación ni sustituye normalización/validación. Se entrega el documento completo, sin recortar paths ni convertir versiones. Un plugin filtra taggedOperations por método/ruta y evita duplicar una operación con varios tags. Se solicita también la resolución del Path Item: la resolución de solo la operación dejaba sin resolver los parámetros referenciados heredados de la ruta. Referencias entre rutas conservan el documento completo para su resolución.

Un único root/estado de Swagger por editor, reutilizado al seleccionar/previsualizar/cambiar de archivo. Los cambios de contrato invalidan el cache de subárboles de Swagger, incluso si se conserva la misma identidad. No se crea una raíz React por clic. Shadow DOM aísla CSS y controles del editor. La fuente de verdad sigue siendo el snapshot original del registro, no el estado Redux ni un ejemplo generado.

Sin cambio de formato de registro, snapshots, referencias, identidad, geometrías, notas, conexiones o undo. La fuente original se crea como texto al desplegar «Snapshot y seguridad efectiva»; no se serializa el modelo mutado por Swagger.

## Consulta local

- `spec` en memoria; sin URL de contrato/config, validatorUrl=null, queryConfigEnabled=false, deepLinking=false y persistAuthorization=false.
- supportedSubmitMethods vacío, tryItOutEnabled=false, sin controles de autorización. `requestInterceptor`, fn.fetch y fn.execute rechazan red. Se omite la resolución de securitySchemes para impedir descubrimiento OIDC; la seguridad efectiva procede del núcleo y se consulta junto al snapshot.
- Descripciones y demás strings originales que pasan por Markdown se muestran como texto literal, incluidas imágenes Markdown/HTML; no se ejecutan ni descargan. Los controles y etiquetas estáticos propios de Swagger mantienen su renderer. CSP local sigue siendo defensa adicional.
- UI de Parameters/Request body/Responses, MIME, ejemplos y Schema de la librería. Example Value puede sintetizar un ejemplo desde el esquema; se identifica como ayuda de Swagger y nunca se añade al contrato/snapshot. No inferir un schema desde ejemplos.
- Tema claro y terminología original de Swagger; funcionan dentro del editor oscuro. Expansión automática inicial de modelo a un nivel, controles estándar para ampliar. Los antiguos límites visuales de renderer propio (6 niveles/300 nodos) se retiran; permanecen los límites de entrada y referencias del núcleo. No se certifica el rendimiento de cualquier schema grande ni todo JSON Schema.
- Callbacks/webhooks conservados en fuente pero sin consulta/navegación añadida. Sin solicitudes reales, subida de contratos, publicación ni conectores.

## Compatibilidad, atribuciones y comprobación

OpenAPI 3.1.x principal, 3.0.x y Swagger 2.0 conservan sus versiones. Plugins internos de Swagger fijados a 5.33.2; una actualización requiere repetir regresiones de selección, herencia, refs, modelos, ejemplos, aislamiento/red y portabilidad.

Licencia Apache-2.0 y avisos de bundle/componentes incluidos conservados en licenses/ y THIRD_PARTY_NOTICES.md. Dependencia transitiva de instalación Scarf desactivada mediante configuración explícita del proyecto; no forma parte del plugin.

Pruebas y resultados finales en [compatibilidad](../compatibilidad.md) y [progreso](../progreso.md). Se mantiene pendiente el piloto humano de etapa 6. Localización de las etiquetas de Swagger, tema oscuro propio y presupuestos con contratos mayores quedan como decisiones posteriores, sin bloquear esta integración.

Referencias primarias: [instalación](https://swagger.io/docs/open-source-tools/swagger-ui/usage/installation/), [configuración](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/), [API de plugins](https://swagger.io/docs/open-source-tools/swagger-ui/customization/plugin-api/). La biblioteca advierte que las APIs internas pueden cambiar sin una versión mayor; por eso se fija versión exacta.
