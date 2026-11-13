# Agenticos · Diseño de APIs de canal

Diseña un flujo desde la historia del desarrollador. El agente entrevista por rondas, contrasta operaciones en BIAN y en un catálogo Git de contratos, y genera una spec, un OpenAPI por servicio UX y un `.drawio` animado. La plantilla baja por Frontend, APIM, MS en AKS y Business / Capa Producto. Las etapas avanzan de izquierda a derecha.

## Demo de préstamos

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

Para diseñar un flujo nuevo, abre este proyecto en Codex, invoca `$canal-diseno` y describe el requerimiento. La [guía de diseño](docs/channel-design.md) incluye el formato de la spec, el uso de un catálogo propio y la configuración de Qwen local.

## Editor y pruebas

Agenticos reutiliza la extensión Draw.io de [Backend Java Hackathon](https://github.com/DiegoAlosilla/backend-java-hackathon/tree/3fc4a590a5344f777ea39e96229e4d2be94290c1). El arranque verifica y prepara la distribución de Draw.io. Consulta los [avisos de terceros](editor/THIRD_PARTY_NOTICES.md) y la [guía del editor](docs/editor.md).

Para ejecutar las pruebas del fork, instala el navegador con `npm --prefix editor run test:browser-install` y ejecuta `npm test`. La prueba de integración del catálogo requiere `CHANNEL_CONTRACTS_DIR` apuntando al clon Business bajo `runs/business-contracts-demo`.
