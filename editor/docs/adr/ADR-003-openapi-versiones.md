# ADR-003 — OpenAPI 3.1 principal y compatibilidad anterior

Fecha: 13 de octubre de 2026 (America/Lima). Estado: aceptado; etapa 2 comprobada con límites indicados.

El usuario confirma OpenAPI 3.1.x y pide soportar las anteriores. Se interpreta como **OpenAPI 3.1.x**, **OpenAPI 3.0.x** y **Swagger 2.0**, que son las líneas planteadas en ADR-001. Swagger 1.x y OpenAPI 3.2 quedan fuera. No hace falta otra aprobación: esta ampliación procede de instrucción expresa del usuario.

## Decisiones

- Detectar versión antes de interpretar. Mantener el documento original y su versión; no convertir ni reescribir contratos antiguos como OpenAPI 3.1.
- YAML/JSON autocontenidos con parser mantenido YAML 2.9.1 y parser JSON nativo. Validación estructural con schemas 2.0/3.0 de `@apidevtools/openapi-schemas` 2.1.0 y schema oficial 3.1 fechado 2022-10-07 (fuente/huella fijadas en `config/openapi-validation.json`); Ajv 8.20.0, ajv-draft-04 1.0.0, ajv-formats 3.0.1. Instancias diferenciadas draft-04 y 2020-12; no mezclar dialectos.
- Un modelo de consulta común conserva la procedencia. Adaptadores semánticos distinguen requestBody/content (3.x) de body/formData/consumes/produces (2.0), y conservan esquemas originales sin aplanar composiciones o cambiar nullable por type:null.
- Referencias internas JSON Pointer con resolución acotada y ciclos explícitos. Se rechazan referencias externas antes de toda lectura o descarga. Anchors, bases `$id`, `$dynamicRef` y dialectos personalizados 3.1 no resueltos por esta primera implementación recibirán diagnóstico preciso; nunca interpretar silenciosamente como 3.0. `$schema` estándar es un identificador, no una descarga.
- Callbacks y webhooks se conservan en snapshot; el catálogo inicial contiene operaciones de `paths`. La interfaz indicará la limitación cuando existan.
- Importación como operación pura: prepara contrato, operaciones y nuevo registro antes de que el adaptador escriba al editor. Fallos conservan registro y figuras previos.
- APIs se identifican explícitamente mediante id interno independiente de título, archivo o tags. SHA-256 de bytes identifica una revisión/importación idéntica. La misma operación en APIs distintas sigue siendo distinta. Una revisión nueva no sustituye otra.
- 5 MiB por snapshot y 15 MiB por documento; profundidad, alias y nodos acotados. No es un validador completo de payloads ni ejecuta APIs.

## Evolución del formato

El formato 1 admitía snapshots JSON de la prueba. Los snapshots YAML requieren formato de registro **2**, sin copias transformadas redundantes. Leer formato 1 y formato 2; elevar a 2 solo durante una importación aceptada. Cancelar/rechazar no cambia la versión. No migrar ni inferir vínculos históricos: esta compatibilidad atiende únicamente diagramas producidos por esta extensión. Versiones desconocidas se preservan y bloquean escrituras de la extensión.

## Evidencia requerida

Fixtures ficticias de las tres líneas, JSON/YAML, herencia/reemplazo de parámetros y seguridad, referencias internas/escapes/ciclos, respuestas explícitas/default/rangos, 3.1 boolean/null y siblings de `$ref`, 3.0 nullable, Swagger body/formData. Importación externa/inválida/no soportada rechazada sin cambio del documento. Reimportación deduplicada, métodos/rutas iguales entre APIs distinguibles. Prueba de navegador y snapshot portable sin archivo original.

## Resultado de etapa 2 y adaptación de validación

11 tests del núcleo y 4 escenarios de navegador aprobados (`npm test`); los de navegador incluyen los 3 de regresión de etapa 0 y uno de importación de tres versiones, deduplicación, rechazos atómicos, undo/redo y perfil limpio. Los ejemplos conservan 7 operaciones entre 3 contratos ficticios (3 + 1 + 3).

El schema 3.1 incluido en el paquete es anterior y rechaza `#/...` con formato URI absoluto. Se usa la copia oficial fechada, sin alterar sus bytes. Ajv no resuelve el fallback dinámico `#meta` de ese schema cuando se compila aislado: únicamente en el schema confiable de validación, se reemplaza al compilar por la referencia estática al mismo nodo `#/$defs/schema`. Este importador no acepta dialectos personalizados que redefinan ese fallback. Los Schema Objects originales se conservan y validan separadamente con el metaschema 2020-12; el contrato nunca se compila como código. La adaptación está cubierta por booleanos, nullable, composición y siblings. `media-range` se trata como anotación: no se promete validación completa de gramática MIME.

Registro 1 sigue legible, importar aceptado crea registro 2; unknown bloquea las acciones de escritura. JSON Pointer puro no conoce DOM ni Draw.io; no hay resolvedor de HTTP/archivos. Recursión de esquemas se conserva, ciclos de objetos necesarios para parámetros/responses generan error en lugar de expandir infinitamente.

Corrección adicional comprobada contra OAS 3.1.2 §4.8.20: el schema fechado restringía `Link.parameters` a cadenas y denominaba `Link.server` como `body`. El adaptador de compilación permite valores JSON literales y corrige el campo a `server`; el archivo oficial/huella permanece intacto. Los `$ref` dentro de ejemplos o valores literales de links son datos, no referencias estructurales a descargar. Los links/expresiones se conservan pero no se ejecutan ni se usan como prueba de orquestación. El test de referencias/ausencia de descargas cubre este caso.

Fuentes primarias: [OpenAPI 3.1.2](https://spec.openapis.org/oas/v3.1.2.html), [OpenAPI 3.0.4](https://spec.openapis.org/oas/v3.0.4.html), [Swagger 2.0](https://spec.openapis.org/oas/v2.0.html), [schemas mantenidos](https://github.com/APIDevTools/openapi-schemas), [Ajv y dialectos](https://ajv.js.org/json-schema.html), [YAML](https://eemeli.org/yaml/).
