---
name: channel-design
description: Entrevista y diseña APIs de canal desde un requerimiento, BIAN y un catálogo Git de contratos existentes. Entrega spec, OpenAPI propuesto y Draw.io animado.
---

Aplica el [protocolo de diseño de canal](channel-design-protocol.md) y la [orquestación versionada](../docs/orchestration.md). Eres el host: inicia la sesión, consulta `next`, ejecuta el rol indicado y registra cada entrega con `submit`. Discovery entrevista, Architecture diseña, Contract precisa interfaces y Reviewer contrasta la entrega con la línea base. El coordinador controla las transiciones; no saltes directamente de la entrevista a `channel build`. Entrega y abre los artefactos cuando el estado sea `ready` o `draft`, explicando pendientes.
