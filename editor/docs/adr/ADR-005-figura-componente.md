# ADR-005 — Contenedor de API y operación como componente editable

Fecha: 14 de octubre de 2026 (America/Lima). Estado: aceptado por solicitud visual del usuario.

## Decisión

Las inserciones nuevas del catálogo, la prueba ficticia y las operaciones pendientes usan un contenedor rectangular amarillo, cabecera de API, símbolo de componente en la esquina y una operación interna con `«MÉTODO»` y ruta. Se sigue la estructura de la referencia visual del usuario con nombres ficticios. `«APIUX»` y `«APIBS»` solo proceden de la clasificación manual; sin clasificación se muestra `«API»`. No se generan conectores que sugieran llamadas inexistentes.

Se usan únicamente vértices/estilos nativos del editor fijado: contenedor y `shape=component`. API y operación son editables por separado; el modo oscuro adapta los colores mediante Draw.io. El resumen del contrato sigue disponible en el inspector.

El contenedor conserva la referencia canónica, identidad visual y notas. `contractVisualRole` distingue contenedor, operación y decoración; la relación padre/hijo es explícita, sin inferir propiedad por posición. Seleccionar el hijo resuelve el contrato a través del contenedor. Copiar el hijo con el portapapeles nativo incluye su contenedor; continúa el bloqueo si falta la revisión en el destino. No se duplica el snapshot ni se cambia el formato de registro.

Las figuras anteriores no se convierten al abrir. **Extras → Usar figura de componente** convierte una figura seleccionada vinculada o pendiente, conserva id/notas/referencia/conexiones y guarda la etiqueta previa en `authorLabel`. Amplía explícitamente la caja a un mínimo de 360×170; mantiene su posición. La conversión y las inserciones se deshacen como una transacción. No se modifica el editor base ni el intérprete OpenAPI.

## Verificación

`tests/integration/component.spec.mjs`: editor real, relación padre/hijo, consulta desde operación interna, edición de etiqueta y movimiento, conector al hijo, copia desde hijo, conversión de caja anterior, undo/redo, guardado físico y reapertura en perfil nuevo con notas/etiqueta/identidad/terminal de conexión conservados. La suite anterior mantiene duplicación de páginas, inspector y recorrido sin extensión. Ejemplo: [figura ficticia](../../examples/diagrams/figura-componente-ficticia.drawio); [captura](../evidence/figura-componente.png).

Fuera de alcance: migración masiva de diagramas, agrupación automática por título de API y aplicación de colores institucionales. El usuario puede editar los estilos con las herramientas del editor.
## Extensión acordada en entrega 1.10

14 de octubre de 2026 (America/Lima). [ADR-009](ADR-009-tab-contratos-nativo.md) añade «Agregar todos» por API: un contenedor visual con hijos de operación, cada uno con referencia propia al registro. La selección/copia/inspección individual usa ese hijo vinculado directamente; los hijos decorativos de las figuras anteriores siguen resolviendo al contenedor vinculado. Se conserva el formato del registro y no se convierten figuras al abrir. La distribución inicial afecta únicamente al grupo nuevo solicitado.

## Ajuste 1.11 solicitado por el usuario

Agregar todos usa una sola fila de izquierda a derecha, con contenedor tan ancho como requieran sus operaciones; no redistribuye grupos existentes. Seleccionar el padre muestra la API completa, seleccionar el hijo muestra el contrato completo con ese endpoint expandido. Los padres de 1.10 resuelven la API por las referencias explícitas de sus hijos, sin escribir metadatos nuevos ni inferir identidad por su presentación. Detalles en ADR-009.
