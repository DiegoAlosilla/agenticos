---
name: service-change
description: Analiza un cambio de API sobre un microservicio existente y entrega una propuesta de contrato y arquitectura. El servicio es una fuente de solo lectura.
---

# Diseño de cambios en microservicios

1. Identifica el microservicio, su OpenAPI vigente y el objetivo del cambio. Lee el contrato, las operaciones vecinas y solo las fuentes de arquitectura o implementación necesarias para entender el estado actual. Cita archivo y líneas al presentar los hallazgos. Mantén el repositorio del servicio en modo lectura durante toda la tarea. Guarda los artefactos de trabajo bajo `runs/service-change/` de Agenticos.
2. Abre con hasta cuatro preguntas sobre decisiones que cambien el contrato o el recorrido. Usa los hechos disponibles antes de preguntar. Aclara éxito, errores, validación, efectos sobre dependencias, orden de llamadas y qué pasa si hay fallos parciales o reintentos. Espera las respuestas y conserva las decisiones ya dadas. En la demo de cuentas, pregunta por borrado repetido (`204` o `404`), validación del ID, orden entre BD y Redis, y evento de borrado. Usa las opciones de la demo como preguntas, no como respuestas confirmadas.
3. Propón el cambio del OpenAPI y su impacto en los consumidores. Distingue comportamiento actual, acuerdos nuevos y pendientes. Describe escenarios por resultado y marca componentes reutilizados y cambios propuestos. Si un pendiente no impide revisar la propuesta, regístralo en la spec. Si cambia el resultado de un escenario, consúltalo primero.
4. Completa `spec.json` según [la guía](../docs/service-change.md). Si hace falta, prepara las dependencias y arranca `npm run channel:editor` en otro proceso de Agenticos. Ejecuta `npm run channel -- change --contract <contrato-base> --input <spec.json> --open`. Si el editor usa otro puerto, pasa `--editor-url`. Comprueba que el OpenAPI propuesto mantiene la versión y las demás operaciones del contrato base y que cada respuesta del recorrido figura en el contrato. Entrega la spec, el OpenAPI propuesto, el `.drawio` y los pendientes. Presenta los recorridos como diseño para revisión.
