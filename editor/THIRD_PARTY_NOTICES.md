# Atribuciones y licencias

Este proyecto conserva la distribución del editor fuera de Git. No altera sus avisos o marcas y no se presenta como oficial ni patrocinado por Draw.io.

- **Draw.io 32.4.1**, JGraph Holdings Ltd / draw.io AG y contribuidores. Código: Apache-2.0. [Fuente fijada](https://github.com/jgraph/drawio/tree/9034053fba80a435e27d68d374bc564b83917ae9), [licencia](licenses/drawio-Apache-2.0.txt), [README y términos de assets](licenses/drawio-README.md).
- Iconos, stencils y plantillas tienen condiciones adicionales del distribuidor. Conservar los `LICENSE` de `img`, `shapes`, `stencils` y `templates` en el runtime. No trasladar la licencia Apache del código a todos los assets. No se autoriza distribución en ecosistema Atlassian sin revisar los términos específicos. Este proyecto es la distribución local independiente acordada.
- **esbuild 0.28.2**, Evan Wallace y contribuidores: MIT (paquete y binario específico de plataforma). Solo empaquetado/desarrollo.
- **TypeScript 7.0.2**, Microsoft y contribuidores: Apache-2.0. Solo comprobación de tipos/desarrollo.
- **fflate 0.8.3**, Arjun Barrett y contribuidores: MIT. Solo extracción del WAR.
- **@playwright/test / playwright / playwright-core 1.64.0**, Microsoft y contribuidores: Apache-2.0. Solo pruebas. Los navegadores se descargan aparte con sus avisos; no se versionan ni redistribuyen.

Copias de los avisos/licencias de paquetes en `licenses/`. Los paquetes originales también conservan sus avisos dentro de `node_modules`.

- **YAML 2.9.1**, eemeli y contribuidores: ISC. Parser YAML seguro.
- **Ajv 8.20.0**, **ajv-draft-04 1.0.0**, **ajv-formats 3.0.1**, Evgeny Poberezkin y contribuidores: MIT. Validación estructural y formatos; sus licencias se conservan junto a las dependencias transitivas (`fast-uri`, `fast-deep-equal`, `json-schema-traverse`, `require-from-string`).
- **@apidevtools/openapi-schemas 2.1.0**, James Messinger y contribuidores: MIT. Schemas 2.0/3.0.
- **OpenAPI Initiative / Linux Foundation**, schema oficial OpenAPI 3.1 fechado 2022-10-07: fuente, SHA y adaptación de compilación en `config/openapi-validation.json`, copia de [licencia Apache-2.0](licenses/openapi-schemas-Apache-2.0.txt). El archivo descargado se conserva byte por byte. La licencia del código y los avisos de specs se conservan; no se redistribuye el sitio/documentación completa.

## Biblioteca de documentación

- **Swagger UI / swagger-ui-dist 5.33.2**, SmartBear Software y contribuidores: Apache-2.0. [Fuente fijada](https://github.com/swagger-api/swagger-ui/tree/v5.33.2), [licencia](licenses/swagger-ui-dist-Apache-2.0.txt), [avisos del bundle y componentes incluidos](licenses/swagger-ui-dist-bundle-NOTICE.txt). Se empaquetan JavaScript/CSS originales con plugins locales; no se usa CDN. El bundle incluye sus dependencias (React, Redux, Swagger Client y otras); se conservan sus avisos.
- **@scarf/scarf 1.4.0**, dependencia de instalación de swagger-ui-dist: [Apache-2.0](licenses/scarf-Apache-2.0.txt). Analítica deshabilitada expresamente mediante `scarfSettings.enabled=false` en el proyecto; no se importa en el plugin ni se ejecuta en el navegador.

## Datos de consulta BIAN

- **BIAN y contribuidores**, Semantic APIs **14.0.0**, variante **BOM extended OAS 3.x**, commit [`b58bf4c2c300dd018afc084e9bb24b7adaaa3500`](https://github.com/bian-official/public/tree/b58bf4c2c300dd018afc084e9bb24b7adaaa3500): Apache-2.0 según LICENSE del repositorio. [Copia literal de licencia](licenses/bian-Apache-2.0.txt), [manifiesto de fuentes/huellas](data/bian/manifest.json), [alcance](data/bian/README.md). El árbol revisado no contiene NOTICE adicional.
- **Aviso de modificación:** `data/bian/catalog.json` es una extracción local de nombres/definiciones de dominios y operaciones/métodos/rutas/tags; se omiten payloads y modelos. Los textos incluidos conservan el original; la búsqueda española es ayuda propia identificada como `es-en-local/2`. `data/bian/es-support.json` añade nombres traducidos y resúmenes propios para los 258 dominios, versión `es-support/1`, derivados de las definiciones Apache-2.0 y diferenciados del original. La guía y explicaciones de acciones son redacción propia de apoyo; el PDF conceptual enlazado no se redistribuye. Las figuras guardan un extracto de referencia con procedencia, revisión, huella, licencia y atribución. No se incluyen ISO20022/DDD, AsyncAPI, portal, PDFs ni logos. No se extiende la licencia del repositorio al sitio de BIAN. No se presenta patrocinio, producto oficial o certificación BIAN.

## Motor y modelos opcionales de IA local

- **Ollama 0.40.10**, [licencia MIT](https://github.com/ollama/ollama/blob/v0.40.10/LICENSE). Preparación explícita del paquete oficial Windows x64, verificado por SHA-256 en config/bian-ai.json. Se conserva el paquete y todos sus avisos de componentes en .runtime/bian-ai; no se redistribuye el binario en Git.
- **Qwen3-4B-Instruct-2507**, variante Ollama qwen3:4b-instruct-2507-q4_K_M: [Apache-2.0 y ficha de Qwen](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507). Pesos fijados por digest, fuera de Git; licencia conservada en el almacén Ollama descargado.
- **EmbeddingGemma 300M**, embeddinggemma:300m: [ficha y términos Gemma](https://huggingface.co/google/embeddinggemma-300m), licencia Gemma propia de Google. No se presenta como Apache-2.0 ni se extiende a partir de la licencia BIAN. Pesos/licencia en el almacén local, digest fijado. Revisar sus términos antes de redistribuir pesos o una distribución empaquetada; esta entrega no publica ni redistribuye modelos.
- Las explicaciones generadas se identifican como IA, separadas de las definiciones oficiales BIAN y del apoyo español versionado. No se atribuyen a BIAN ni se anuncian como certificación. [Uso y límites](docs/ia-local.md).

## Código propio

El código propio se publica en GitHub sin una licencia abierta adicional. `private: true` en `package.json` evita la publicación accidental del paquete en npm. Los componentes de terceros conservan las licencias indicadas arriba.
