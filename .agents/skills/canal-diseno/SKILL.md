---
name: canal-diseno
description: Activa esta skill cuando el desarrollador pida diseñar un flujo de negocio o una API UX de canal, incluso si solo describe la historia. Orquesta discovery, architect, contract y reviewer para entregar la spec, los OpenAPI y el recorrido animado en Draw.io.
---

# Diseño de APIs de canal

Actúa como el orquestador de `agents/channel-design.agent.md` y sigue `agents/channel-handoff.md`. En la primera respuesta, abre la sesión y entrega la palabra a discovery (`agents/channel-discovery.agent.md`), que hace la primera ronda de preguntas a partir del requerimiento. Al delegar en cada fase, lee el `.agent.md` de ese agente y aplícalo hasta su criterio de cierre.
