# Asistencia BIAN con IA local

En **Contratos → Consultar BIAN**, escribe un propósito y pulsa **Sugerir con IA local**. El filtro de acción sigue siendo manual. La pestaña **Sugerencias IA** muestra candidatos a la izquierda; seleccionar **Revisar operación oficial** abre a la derecha definición, operación y método/ruta literales. **Por qué lo sugiere la IA · no oficial** despliega razón y límites separados de la fuente. En panel estrecho, **← Dominios** recupera la lista; en ancho suficiente ambas columnas permanecen visibles. **Agregar endpoint al lienzo** crea la referencia BIAN habitual, deshacible. La pestaña **Catálogo** conserva búsqueda por palabras sin IA. Opciones de idioma, procedencia y ayuda se agrupan al pie. Las explicaciones no son definiciones oficiales ni una certificación de diseño.

La búsqueda por palabras sigue disponible sin IA. El servidor no contacta al motor al abrir el editor o escribir: solo al pedir sugerencias. Si falta el motor/modelo o la respuesta es inválida, muestra el diagnóstico y conserva la búsqueda habitual.

## Preparar y arrancar en Windows x64

Desde este checkout y con Node/npm del proyecto:

```powershell
npm run ai:prepare
```

La preparación explícita descarga Ollama **0.40.10** y verifica SHA-256 antes de extraer. Descarga **embeddinggemma:300m** y **qwen3:4b-instruct-2507-q4_K_M**, y comprueba sus digests contra [config/bian-ai.json](../config/bian-ai.json). Necesita Internet y varios GB de disco: paquete comprimido de unos 1,59 GB, motor extraído y unos 3,12 GB de pesos. Se conserva todo en `.runtime/bian-ai`, ignorado por Git; no se modifica ni repara la instalación global de Ollama. Detén otro Ollama si ya ocupa el puerto 11434. No descarga modelos durante el arranque habitual o una consulta.

Después, deja estas dos terminales abiertas:

```powershell
# Terminal 1: motor local, sin funciones de nube
npm run ai:serve
```

```powershell
# Terminal 2: editor
npm start
```

Abrir [editor local](http://127.0.0.1:8080/?lang=es&ui=kennedy&mode=device). Detener cada proceso con Ctrl+C. `ai:serve` verifica el ejecutable preparado y los modelos fijados; establece `OLLAMA_NO_CLOUD=1`, escucha solo en `127.0.0.1:11434` y utiliza el directorio de modelos del proyecto. El servidor comprueba versión, digest y capacidades; rechaza modelos con metadatos de ejecución remota. No configura CORS abierto ni añade destinos a la CSP del navegador.

La preparación automatizada está limitada a **Windows x64**. Otros sistemas podrían usar Ollama de la misma versión, con los dos modelos/digests fijados, nube deshabilitada y la misma dirección loopback; ese recorrido no está certificado. No cambiar nombres/digests para esquivar un error sin revisar compatibilidad, licencias y pruebas.

## Qué recibe la IA

Solo se envían al servidor del propio equipo el propósito (hasta 600 caracteres) y la acción seleccionada. El motor recibe ese propósito y fragmentos del catálogo público BIAN fijado. No recibe el XML del diagrama, contratos importados, snapshots, notas de figuras o borradores. No se ejecutan APIs ni se descargan referencias.

La recuperación compara embeddings de todos los dominios elegibles, recupera operaciones de hasta ocho dominios y combina orden semántico y léxico. El explicador compara hasta doce candidatos y devuelve hasta tres identificadores. El servidor valida cada identificador; el navegador vuelve a contrastar dominio/método/ruta, filtro, commit y huella. Las fuentes y las referencias se construyen desde el catálogo. Las razones generadas se muestran como texto, separado de las definiciones oficiales.

Índices, consultas y sugerencias permanecen en memoria. No se escriben en `.drawio`, localStorage, archivos de historial ni registros de consultas. El índice derivado se pierde al reiniciar el servidor; el catálogo sigue siendo la fuente de verdad. Cada instancia de servidor admite una consulta de IA a la vez. La primera consulta puede tardar más al preparar el índice; el límite es de cuatro minutos. Cancelar, cambiar propósito/filtro/documento o salir de la consulta descarta respuestas tardías y cancela la petición al motor. Los pesos pueden permanecer temporalmente en RAM según keep_alive de Ollama.

## Comprobar

```powershell
npm test
# Con ai:serve ya iniciado y recursos preparados:
npm run test:ai:real
```

Las pruebas de núcleo/interfaz usan dobles identificados para errores, límites, IDs inventados, escape, cancelación y disponibilidad. `test:ai:real` usa embeddings y generación **reales**, abre el editor en Chromium y compara tres propósitos ficticios con la búsqueda léxica. Bloquea destinos externos en Node/Chromium durante el recorrido; el proceso Ollama preparado tiene la nube deshabilitada. No es una auditoría de firewall del sistema ni una evaluación humana de utilidad. Resultados y límites finales se registran en [compatibilidad](compatibilidad.md) y [progreso](progreso.md).

El modelo pequeño puede escoger una operación demasiado general, priorizar mal candidatos o explicar de forma imprecisa. Identificadores válidos no garantizan una recomendación semánticamente correcta. Revisar producto, responsabilidad, etapa, definición oficial y datos faltantes sigue siendo necesario.

Motor y pesos tienen licencias propias: [Ollama MIT](https://github.com/ollama/ollama/blob/v0.40.10/LICENSE), [Qwen3-4B-Instruct-2507 Apache-2.0](https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507), [EmbeddingGemma y términos Gemma](https://huggingface.co/google/embeddinggemma-300m). Se conservan los avisos de los paquetes/modelos descargados; no se incluyen pesos en Git. Diseño y aceptación: [ADR-013](adr/ADR-013-asistencia-bian-ia-local.md).
