# ADR-015 — Diseño de canal y catálogo Git

El asistente de chat externo produce una spec estructurada para flujos sin código base. La spec fija decisiones, escenarios, endpoints UX propuestos, referencias BIAN y la revisión exacta de los contratos Business o Producto. Se genera un OpenAPI 3.1 por UX con el núcleo existente y un `.drawio` nativo con `auditFlow`, `designDecisions`, `designBian` y `contractSource`. Los últimos dos atributos guardan la procedencia para el panel. La animación reutiliza el reproductor de ADR-014.

El generador coloca Frontend, APIM, MS en AKS y Business / Capa Producto en franjas horizontales. Cada etapa ocupa una columna que se ensancha cuando hay varios consumos en la última franja. APIM representa el paso de enrutamiento de la operación UX y las respuestas vuelven por el mismo nivel. El escenario avanza de izquierda a derecha.

`npm run channel:editor` habilita explícitamente el catálogo Git de solo lectura. Su fuente es un clon local configurado al arrancar. El servidor loopback enumera blobs de un commit y valida los OpenAPI con el mismo núcleo del editor. El navegador consulta el índice y solo incorpora el snapshot elegido. El registro y sus operaciones de guardar y reabrir mantienen el formato existente. El arranque ordinario del editor sigue funcionando sin catálogo.

El repositorio demo se clona desde GitHub y contiene 20 contratos ficticios. El servidor del editor no clona URLs que vengan del navegador, no acepta rutas de archivos del sistema y no ejecuta operaciones de los contratos. La actualización del catálogo se hace en el clon.

La guía opcional de entrevista se invoca desde el CLI y usa un único modelo Qwen servido en loopback. Devuelve sugerencias de preguntas, sin aplicar decisiones o cambios al documento. Se conservan la consulta léxica BIAN y la compatibilidad del editor existente. El chat integrado queda como etapa posterior.

Agenticos conserva el fork y el generador en un repositorio independiente. El panel lateral ofrece pestañas separadas para Swagger y Git, BIAN, y animación con criterios y evidencia. Cambiar de pestaña pausa la reproducción y mantiene la figura seleccionada.
