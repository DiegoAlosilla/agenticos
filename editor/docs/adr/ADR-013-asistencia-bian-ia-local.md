# ADR-013 — Asistencia BIAN con IA local opcional

Fecha: 23 de octubre de 2026 (America/Lima). Estado: implementado y comprobado con límites por solicitud expresa del usuario. [Resumen y evidencias](../evidence/bian-ai-summary.json).

## Alcance autorizado

El usuario aprueba la propuesta «propósito → candidatos BIAN con explicación». Se amplían ADR-011/012 únicamente para esta asistencia opcional. La búsqueda léxica y el editor funcionan sin modelos. No se retoma autoría, no se explican contratos privados mediante IA, no se ejecutan APIs ni se infieren dependencias del dibujo.

## Arquitectura y datos

La vista envía solo propósito (hasta 600 caracteres) y filtro de acción a una ruta del mismo origen. El servidor local mantiene la CSP connect-src 'self' y conecta exclusivamente con Ollama en http://127.0.0.1:11434; no es un proxy genérico. Valida Host/Origin, método, tipo/tamaño/estructura del cuerpo; rechaza URLs, contratos y modelos enviados por el cliente. No registra consultas/respuestas ni las escribe en archivos, figuras, snapshots, localStorage o cachés persistentes.

La recuperación combina búsqueda léxica y embeddings multilingües: compara todos los dominios del catálogo fijado, recupera operaciones de dominios candidatos y selecciona un conjunto acotado respetando el filtro manual. El modelo explicativo recibe exclusivamente ese conjunto y el propósito, como datos no confiables. Devuelve identificadores opacos de candidatos, razones y límites en JSON estructurado. Se valida la respuesta contra la lista cerrada; nombres, rutas, fuente/commit/huella y referencias se reconstruyen desde el catálogo, nunca del texto generado. Razones se muestran como texto escapado, identificadas como sugerencias de IA, no definiciones oficiales. El usuario revisa fuentes y decide Agregar endpoint; se reutiliza bianRef formato 1 y su transacción.

Índices derivados solo en memoria, con identidad de catálogo, modelo y digest; se descartan al reiniciar o cambiar modelo. No son fuente de verdad. No se modifica el manifiesto BIAN ni sus originales/apoyos españoles. El modelo no completa huecos oficiales. No se muestran porcentajes de confianza.

## Motor y disponibilidad

Ollama es una dependencia opcional externa a npm, sin instalación global ni descargas automáticas al arrancar/consultar. Se prepara explícitamente en .runtime, ignorado por Git, con versión y SHA-256 del paquete. Los modelos se fijan por nombre y digest en configuración; se comprueba instalación/digest y metadatos locales antes de inferir. El proceso administrado se inicia con nube deshabilitada y escucha loopback; se rechazan modelos remotos. Las licencias propias de motor/modelos se documentan por separado, sin redistribuir pesos en Git.

Solicitud explícita, cancelación y tiempos/tamaños máximos; una sola inferencia por servidor. Cancelar/cambiar propósito, filtro, documento o salir de la consulta invalida resultados tardíos. Modelo ausente, motor caído, respuesta inválida y saturación dan diagnóstico recuperable. La consulta léxica se conserva. La disponibilidad no equivale a calidad semántica validada.

## Aceptación

Probar motor real con ejemplos ficticios y registrar modelo/digest/duración/resultados; comparar candidatos con búsqueda actual sin afirmar mejora no medida. Probar controles con doble, identificadores inventados/duplicados, filtros, JSON malformado, límites, destinos/orígenes rechazados, timeout/cancelación y limpieza entre documentos. Regresión BIAN/Swagger, inserción/undo, persistencia y colores/teclado/ancho mínimo. Probar arranque ordinario sin motor y recorrido con red externa bloqueada tras preparación. Separar evidencia real de dobles; documentar si hardware o motor impiden inferencia real. No publicar ni subir archivos.

Fuentes técnicas consultadas: [Ollama embed](https://docs.ollama.com/api/embed), [chat](https://docs.ollama.com/api/chat), [modelos locales](https://docs.ollama.com/api/tags), [modo sin nube](https://docs.ollama.com/faq).

La asistencia con IA local opcional de [ADR-013](ADR-013-asistencia-bian-ia-local.md) fija Ollama 0.40.10 (paquete Windows x64 con SHA-256), Qwen3-4B-Instruct-2507 Q4_K_M y EmbeddingGemma 300M (nombre/digest exactos en config/bian-ai.json). El límite de solicitud es 4 KiB; propósito de 600 caracteres, solo propósito/acción, cuatro minutos, una consulta simultánea y respuestas del motor de hasta 4 MiB. Índices de dominios/operaciones solo en memoria de una instancia ligada a catálogo y digests fijados. Se comprueba versión/capacidades y ausencia de metadatos remotos antes de cada inferencia. El navegador conserva connect-src 'self'; las únicas rutas nuevas forman un servicio cerrado, no un proxy Ollama genérico.

## Resultado comprobado

TypeScript/build, 32 pruebas de núcleo (también con fetch deshabilitado y destinos externos bloqueados), regresión final 23/23 escenarios de navegador y seis comprobaciones de arranque desde clon limpio aprobados. Tres propósitos ficticios con embeddings y chat reales, modelo 4B fijado: 128,264 / 89,971 / 76,550 s en CPU; resultados y límites separados de las pruebas con dobles. Motor realmente ausente comprobado desde UI, con búsqueda y documento/undo conservados. Se verificó preparación y arranque final con los modelos fijados, sin instalación global. [Resumen](../evidence/bian-ai-summary.json), [inferencias reales](../evidence/bian-ai-real-results.json), [regresión](../evidence/bian-ai-regression-results.json), [clon limpio](../evidence/bian-ai-startup-results.json).

Límites: no se midió mejora con personas; una consulta ambigua sigue produciendo candidatos y el modelo puede inferir datos no publicados. Solo Windows x64/equipo registrado, sin certificación de aceleración GPU o firewall de Ollama. Revisión oficial manual obligatoria. No se publican archivos ni se crea commit/push. La autoría sigue en pausa. El arranque limpio detectó y corrigió conservación de bytes Git para BIAN en .gitattributes (ver ADR-011), sin alterar datos/huellas.

### Presentación Lista y detalle — 24/10/2026

El usuario elige Lista y detalle entre las propuestas visuales. ADR-009 concreta esta presentación: cabecera compacta; Catálogo/Sugerencias IA separados; candidatos con selección visible a la izquierda y referencia a la derecha; al reducir por debajo de 460 px útiles se conserva navegación accesible mediante regreso y foco. Razones/límites generados plegables, diferenciados de originales oficiales. El botón de consulta sigue siendo explícito, conserva cancelación/validación y la misma petición propósito/acción; no cambia recuperación, modelo, digests ni API del motor. Opciones de idioma y procedencia al pie. No se repite inferencia real por un cambio de presentación: sus evidencias anteriores permanecen históricas; la integración visual se verifica con dobles identificados y regresión del editor.
