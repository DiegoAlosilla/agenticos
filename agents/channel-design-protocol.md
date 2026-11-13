# Protocolo de diseño de canal

Una petición de diseño inicia el flujo completo. Pide al desarrollador las decisiones de negocio que falten y ejecuta tú las consultas, la generación y la apertura del editor.

## Entrevista

1. Resume la historia de negocio, qué inicia el flujo y cuándo se considera terminado. Conserva las decisiones que el desarrollador ya dio. Haz rondas de hasta cuatro preguntas y espera sus respuestas. Evita pedir una spec o código de partida.
2. Pregunta por la identidad que entrega el frontend, quién conserva el estado, qué dato conecta los pasos y quién decide cada resultado. Para el préstamo, sigue por condiciones de evaluación, entradas y salidas de la simulación, datos y consentimiento de la confirmación, cuenta de abono, idempotencia y resultado incierto del desembolso. Prioriza las preguntas que cambian una dependencia o la división de responsabilidades.
3. Cuando esté disponible, ejecuta `npm run channel -- guide --input <contexto.json>` con el resumen, respuestas y puntos abiertos. Usa sus preguntas como sugerencias y deja al desarrollador las decisiones. El modelo local no recibe contratos completos y el flujo puede seguir si está detenido.

## Evidencia para decidir

4. Prepara las dependencias del proyecto si faltan e inicia `npm run channel:editor` en un proceso separado si el fork de Agenticos aún no está disponible. Esto prepara el núcleo y enlaza el catálogo. Si hay catálogo institucional, usa `CHANNEL_CONTRACTS_DIR` para el editor y las consultas, o pasa `--repo <clon local>` en ambos. Usa `npm run channel -- search --query "<términos>"` y `npm run channel -- operation --ref <commit> --file <archivo> --method <método> --path <ruta>` para revisar las operaciones candidatas. Identifica los contratos ficticios si usas el catálogo demo. Presenta método, ruta, revisión, entradas necesarias y respuesta relevante. Vincula solo lo acordado y demostrado por el contrato. Deja pendientes cuando falte una operación o el mapeo de datos.
5. Usa `npm run channel -- bian --query "<propósito>" --action <acción>` para consultar las referencias BIAN locales. Verifica que la responsabilidad y la acción correspondan. Presenta nombre UX, ruta institucional y referencia BIAN como elementos distintos. Cuando ninguna operación encaje, deja la equivalencia pendiente. Conserva el método y ruta reales para cada operación Business reutilizada.
6. Propón cuántos servicios UX hay según responsabilidad, dueño, ciclo de vida y límites del canal. Varias etapas pueden pertenecer al mismo UX. Para el caso de préstamos, plantea un solo UX si el desarrollador confirma que el recorrido, el dueño y el ciclo de vida son comunes. Los consumos existentes pertenecen a Business o Producto según la evidencia de la sesión.

## Especificación y entrega

7. Presenta decisiones, límites UX, orden de llamadas, alternativas y pendientes al desarrollador. Mantén una `spec.json` con el formato de [la guía](../docs/channel-design.md) en la carpeta de trabajo de la sesión. Describe resultados de negocio y reglas confirmadas. Registra qué elementos requieren implementación nueva y cuáles se reutilizan para aplicar los colores del diagrama. Si el desarrollador quiere un bosquejo parcial, usa `calls[].pending` y `pending`, y explicita qué comportamiento sigue en discusión. Usa esquemas, códigos y rutas propuestos solo si se acordaron como parte del bosquejo.
8. Con las decisiones recogidas, ejecuta `npm run channel -- build --input <spec.json> --open` para generar la spec revisable, un OpenAPI por servicio y el `.drawio`, y abrirlo en el fork. Si el editor está en otro puerto, usa `--editor-url`. Si la apertura falla, conserva los archivos generados, comprueba el editor y vuelve a intentar la apertura. Presenta la ruta de salida, el escenario principal, las variantes y las decisiones que faltan. El recorrido animado representa el diseño.
