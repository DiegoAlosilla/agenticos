# Protocolo de diseño de canal

## Entrevista

1. Resume la historia de negocio, qué inicia el flujo y cuándo se considera terminado. Conserva las decisiones que el desarrollador ya dio. Haz rondas de hasta cuatro preguntas y espera sus respuestas. Evita pedir una spec o código de partida.
2. Pregunta por la identidad que entrega el frontend, quién conserva el estado, qué dato conecta los pasos y quién decide cada resultado. Para el préstamo, sigue por condiciones de evaluación, entradas y salidas de la simulación, datos y consentimiento de la confirmación, cuenta de abono, idempotencia y resultado incierto del desembolso. Prioriza las preguntas que cambian una dependencia o la división de responsabilidades.
3. Cuando esté disponible, ejecuta `npm run channel -- guide --input <contexto.json>` con el resumen, respuestas y puntos abiertos. Usa sus preguntas como sugerencias y deja al desarrollador las decisiones. El modelo local no recibe contratos completos y el flujo puede seguir si está detenido.

## Evidencia para decidir

4. Usa `npm run channel -- search --query "<términos>"` y `npm run channel -- operation --ref <commit> --file <archivo> --method <método> --path <ruta>` para revisar las operaciones candidatas. Si hay catálogo institucional, pasa `--repo <clon local>` o usa `CHANNEL_CONTRACTS_DIR`. Identifica los contratos ficticios si usas el catálogo demo. Presenta método, ruta, revisión, entradas necesarias y respuesta relevante. Vincula solo lo acordado y demostrado por el contrato. Deja pendientes cuando falte una operación o el mapeo de datos.
5. Usa `npm run channel -- bian --query "<propósito>" --action <acción>` para consultar las referencias BIAN locales. Verifica que la responsabilidad y la acción correspondan. Presenta nombre UX, ruta institucional y referencia BIAN como elementos distintos. Cuando ninguna operación encaje, deja la equivalencia pendiente. Conserva el método y ruta reales para cada operación Business reutilizada.
6. Propón cuántos servicios UX hay según responsabilidad, dueño, ciclo de vida y límites del canal. Varias etapas pueden pertenecer al mismo UX. Para el caso de préstamos, plantea un solo UX si el desarrollador confirma que el recorrido, el dueño y el ciclo de vida son comunes. Los consumos existentes pertenecen a Business o Producto según la evidencia de la sesión.

## Especificación y entrega

7. Presenta decisiones, límites UX, orden de llamadas, alternativas y pendientes al desarrollador. Mantén una `spec.json` con el formato de [la guía](../docs/channel-design.md) en la carpeta de trabajo de la sesión. Describe resultados de negocio y reglas confirmadas. Registra qué elementos requieren implementación nueva y cuáles se reutilizan para aplicar los colores del diagrama. Si el desarrollador quiere un bosquejo parcial, usa `calls[].pending` y `pending`, y explicita qué comportamiento sigue en discusión. Usa esquemas, códigos y rutas propuestos solo si se acordaron como parte del bosquejo.
8. Ejecuta `npm run channel -- build --input <spec.json>` para entregar spec revisable, OpenAPI por servicio y `.drawio`. Si el usuario quiere verlo, inicia `npm run channel:editor` en un proceso separado y genera con `--open`, o abre el `.drawio` generado en el fork. Presenta la ruta de salida, el escenario principal, las variantes y las decisiones que faltan. El recorrido animado representa el diseño.
