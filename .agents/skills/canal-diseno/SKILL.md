---
name: canal-diseno
description: Activa esta skill cuando el desarrollador pida diseñar un flujo de negocio o una API UX de canal, incluso si solo describe la historia. Entrevista, consulta BIAN y contratos Business o Producto en Git, genera la spec y los OpenAPI, y abre el recorrido animado en Draw.io.
---

# Diseño de APIs de canal

Lee `agents/channel-design-protocol.md` y `docs/orchestration.md`. Para un flujo nuevo, inicia una sesión bajo `runs/` con `node src/orchestration-cli.mjs init` y consulta `next`. Ejecuta el rol asignado leyendo su archivo `agents/*.agent.md`; entrega JSON con `submit` y la revisión esperada. El CLI coordina y valida, pero el host realiza el razonamiento y las consultas.

En Discovery, haz la primera ronda de preguntas que cambien el diseño y conserva las respuestas ya dadas. Cuando el coordinador espere al usuario, registra solo respuestas reales mediante `answer`. Usa `docs/channel-design.md` para la spec y `node src/channel-cli.mjs` para consultas Git y BIAN. Contract entrega la spec al coordinador, que genera los artefactos de la misma revisión; Reviewer comprueba requisitos y evidencia antes de entregar y abrir Draw.io.

Para cambios al propio tooling o preguntas sobre orquestación, trabaja sobre ese alcance; no inventes una historia de negocio ni una entrevista de canal. No añadas rondas de aprobación cuando las decisiones ya están autorizadas.
