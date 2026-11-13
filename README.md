# Agenticos · Diseño de APIs de canal

Diseña un flujo desde la historia del desarrollador. Cinco agentes se reparten el trabajo: un orquestador, discovery (entrevista por rondas), architect (forma UX, BIAN y diagrama), contract (catálogo Git y OpenAPI) y reviewer (validación con el desarrollador). Juntos generan una spec, un OpenAPI por servicio UX y un `.drawio` animado. La plantilla baja por Frontend, APIM, MS en AKS y Business / Capa Producto. Las etapas avanzan de izquierda a derecha.

## Demo de préstamos

![Captura del fork de Draw.io con el contrato UX en Swagger, su referencia BIAN y la animación del recorrido de préstamos](docs/media/demo-prestamos-drawio.gif)

El GIF muestra el diagrama generado y un tramo del escenario **Solicitud aprobada**. [Flujo entre agentes](docs/channel-design.md#flujo-y-decisiones-del-agente) · [Prompt y consultas de la demo](docs/channel-design.md#ejemplo-de-entrevista)

Con Node.js 24.18.x, npm y Git, abre una terminal en el repositorio:

```powershell
npm ci
npm run channel:editor
```

En otra terminal:

```powershell
npm run channel:demo -- --open
```

El fork presenta **Contratos**, **BIAN** y **Recorrido** en el panel derecho. Desde **Contratos → Repositorio Business** puedes buscar los [20 contratos ficticios](https://github.com/DiegoAlosilla/business-contracts-demo). La primera ejecución prepara el editor y clona el catálogo.

Para diseñar un flujo nuevo, abre este proyecto en Codex y describe el requerimiento. Discovery inicia la entrevista. El orquestador pide tu aprobación de la forma UX antes de generar los contratos, y el reviewer te pregunta al final si el diagrama y los contratos son los esperados. [Agentes y handoff](agents/channel-handoff.md) La [guía de diseño](docs/channel-design.md) incluye el formato de la spec, el uso de un catálogo propio y la configuración de Qwen local.

## Editor y pruebas

La [guía de estructura del proyecto](docs/project-structure.md) explica las carpetas principales, los módulos de `src/` y cómo pasan los datos del agente al editor.

Agenticos reutiliza la extensión Draw.io de [Backend Java Hackathon](https://github.com/DiegoAlosilla/backend-java-hackathon/tree/3fc4a590a5344f777ea39e96229e4d2be94290c1). El arranque verifica y prepara la distribución de Draw.io. Consulta los [avisos de terceros](editor/THIRD_PARTY_NOTICES.md) y la [guía del editor](docs/editor.md).

Para ejecutar las pruebas del fork, instala el navegador con `npm --prefix editor run test:browser-install` y ejecuta `npm test`. La prueba de integración del catálogo requiere `CHANNEL_CONTRACTS_DIR` apuntando al clon Business bajo `runs/business-contracts-demo`.
