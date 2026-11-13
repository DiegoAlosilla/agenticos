# ADR-007 — Documentación fija al seleccionar un endpoint

Fecha: 14 de octubre de 2026 (America/Lima). Estado: aceptado por solicitud del usuario. Sustituye la ubicación modal del inspector de ADR-006. **La decisión de renderer propio se sustituye por [ADR-008](ADR-008-swagger-ui-real.md); el resto del patrón lateral se mantiene.**

## Decisión de experiencia

La selección de una instancia de endpoint en el lienzo muestra automáticamente sus datos en un lateral derecho fijo. Se retira el botón genérico «Ver contrato»; **Panel de endpoint** permite recuperar el lateral si se ocultó. No se necesita pulsarlo para consultar una figura.

El lateral tiene **Endpoint**, **Catálogo** y **Formato**. Endpoint reutiliza el renderer de tablas/referencias/ejemplos y sus secciones Entrada/Respuestas/Seguridad/Fuente. Catálogo se acopla al mismo lateral, con bloques por método/ruta y acciones Añadir al lienzo, Arrastrar y Consultar. Consultar ofrece una vista previa identificada, sin insertar una figura ni cambiar el diagrama. Alternar con las pestañas conserva búsqueda/clasificación mientras no cambie el documento/registro. La vinculación de una pendiente usa una sesión específica y no se reutiliza como catálogo normal.

Formato muestra los controles nativos de Draw.io. El lateral se puede ocultar; el conmutador nativo del panel también funciona. En pantallas de menos de 900 px, el lateral se superpone de forma cerrable para no reducir el lienzo a una columna inútil. La demo y las evidencias muestran datos ficticios.

## Relación con Swagger

Se imita el patrón de **Swagger UI**, orientado a documentación: método/ruta diferenciados, bloques de operaciones, parámetros, modelos y ejemplos. Se conserva el renderer propio ya probado; **no se integra ni se anuncia Swagger Editor/Swagger UI como dependencia instalada**. Swagger Editor está orientado a editar definiciones, que no es el objetivo del panel. Esta decisión evita introducir otro parser/resolvedor, interfaces de ejecución/autorización o un segundo editor. Una futura sustitución por Swagger UI real requeriría fijar versión/licencias y repetir compatibilidad/aislamiento; no es una promesa de esta entrega.

Referencias primarias: [Swagger UI](https://swagger.io/open-source/swagger-ui/), [configuración](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/). No se copiaron activos ni código del proyecto Swagger.

## Integración y estado

`drawio-adapter/endpoint-dock.ts` concentra eventos de selección, modelo, páginas, archivos, clic y edición terminada. El contenedor raíz y la operación interna resuelven al propietario explícito de `component-figure`. Seleccionar padre e hijo de la misma instancia (caso de undo/redo nativo) sigue consultando una sola operación; dos instancias distintas muestran estado de selección múltiple. No se infiere propiedad por posición.

Sin selección o con figura libre se retira la documentación previa. Las pendientes muestran su método/ruta/propósito y el enlace a vincular. Referencias perdidas o formato desconocido muestran indisponibilidad en el lateral; no eliminan figura ni notas. Los errores de acciones/importación mantienen su informe específico.

Cache solo de lectura por archivo, bytes del registro y revisión; no sustituye snapshots. Cambios de geometría no fuerzan regeneración del documento; cambios de referencia/valor/registro sí. La vista previa se distingue de la selección y un clic sobre la figura ya seleccionada recupera su documentación.

Se añade un elemento a la **columna 4/fila 3 de la cuadrícula del editor 32.4.1**. Comparte espacio con el contenedor de formato nativo, sin reescribir sus hijos ni modificar el código base. CSS acotado y ResizeObserver actualizan solo viewport; ninguna lectura mueve, redimensiona o cambia metadatos de figuras. El formato de registro y las reglas OpenAPI no cambian.

## Verificación

- Nueva prueba de selección mediante clic SVG real, sin botón inspector ni modal; comparación de límites de lienzo/lateral para comprobar reserva de espacio.
- Cambio GET/PATCH, padre/hijo, preview POST sin inserción, recuperación del seleccionado, catálogo con búsqueda preservada, formato/conmutador nativo, ocultar/reabrir, selección vacía/libre/múltiple y ventana estrecha.
- Suite de regresión: catálogo/arrastre/pendiente/vinculación/undo, edición/clipboard/páginas, guardado y perfiles limpios, versión sin plugin, texto seguro y diagnósticos. Tests de arranque adaptan el nombre de control; el bootstrap no cambia y su prueba previa sigue histórica.
- [Captura](../evidence/lateral-endpoint.png), [diagrama](../../examples/diagrams/seleccion-lateral-ficticia.drawio), [regresión completa](../evidence/dock-integration-results.json), [comprobación adicional del lateral](../evidence/dock-focused-results.json).

Compatibilidad certificada únicamente para la versión/tema local probados. Otros layouts del editor requieren verificar la cuadrícula. No cambia el estado pendiente del piloto humano ni se añaden llamadas, web externa, GitHub o publicación.
