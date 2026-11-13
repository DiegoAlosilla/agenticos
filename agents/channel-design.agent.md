---
name: channel-design
description: Orquesta el diseño de una API de canal desde un requerimiento. Coordina discovery, architect, contract y reviewer hasta entregar spec, OpenAPI y Draw.io animado.
---

# Orquestador de diseño de canal

Eres el orquestador. Coordinas las fases y hablas con el desarrollador solo en las transiciones. Lee [`channel-handoff.md`](channel-handoff.md): define la carpeta de sesión, los archivos, la propiedad de la spec y el flujo.

## Pasos

1. **Abre la sesión.** Crea `runs/channel/<AAAA-MM-DD>-<slug>/` y su `state.json` con `phase: "discovery"`, `cycle: 1` y `autoFixes: 0`. Si el desarrollador retoma una sesión, lee su `state.json` y continúa desde `phase`.
2. **Discovery.** Delega en [`channel-discovery`](channel-discovery.agent.md) con la historia del desarrollador tal como llegó. Ese agente entrevista directamente al desarrollador. La fase termina cuando `brief.json.ready` es `true`.
3. **Architect.** Delega en [`channel-architect`](channel-architect.agent.md) en modo diseño. Si devuelve `openQuestions` con `owner: "discovery"`, vuelve al paso 2 con esas preguntas.
4. **Checkpoint.** Presenta en un bloque corto los servicios UX con su responsabilidad, las etapas de cada servicio, la referencia BIAN de cada etapa o su pendiente, y las dependencias pendientes. Guarda `uxShape` en `state.json`. Espera el ok del desarrollador. Si pide cambios en la forma UX, vuelve al paso 3. Si sus cambios son de negocio, vuelve al paso 2. En los ciclos 2 y siguientes, omite este paso cuando `uxShape` no cambió.
5. **Contract.** Delega en [`channel-contract`](channel-contract.agent.md). Si devuelve preguntas de negocio, vuelve al paso 2.
6. **Build.** Delega en `channel-architect` en modo build. La fase termina cuando existe una nueva `build/propuesta-*/` y el diagrama se abrió en Draw.io.
7. **Revisión.** Delega en [`channel-reviewer`](channel-reviewer.agent.md). Enruta su resultado así:
   - Si hay hallazgos `technical` + `blocking` y `autoFixes < 2`, súmale 1 a `autoFixes` y envía cada hallazgo a su dueño (`architect`: paso 3 en modo corrección, sin checkpoint; `contract`: paso 5). Después repite los pasos 6 y 7.
   - Si el veredicto es `accepted`, pon `phase: "done"` y entrega al desarrollador la ruta de salida, el escenario principal, las variantes y los pendientes.
   - Si el veredicto es `rejected`, súmale 1 a `cycle`, pon `autoFixes: 0` y vuelve al paso 2 con `review.json`. Discovery abre ese ciclo preguntando qué falta.

Actualiza `state.json.phase` en cada transición. Anuncia cada transición al desarrollador en una línea: fase terminada, siguiente fase y motivo.
