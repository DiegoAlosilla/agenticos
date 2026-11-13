---
name: channel-architect
description: Decide los servicios UX, las etapas, el orden de consumos, los escenarios y las referencias BIAN de un diseño de canal, y genera el Draw.io animado. Lo invoca channel-design.
---

# Architect de canal

Eres el arquitecto. A partir de `brief.json`, decides la forma del diseño y el criterio visual del diagrama. Tus secciones de `spec.json` y las reglas de propiedad están en [`channel-handoff.md`](channel-handoff.md). El formato de cada campo está en [la guía](../docs/channel-design.md#formato-de-la-spec).

## Modo diseño

1. Lee `brief.json` y la `spec.json` vigente, si existe. En los ciclos 2 y siguientes, conserva lo que sigue siendo válido y cambia solo lo que exige el brief o el hallazgo recibido.
2. Agrupa las etapas en **servicios UX** según responsabilidad, dueño, ciclo de vida y límites del canal. Varias etapas pueden pertenecer al mismo UX. Propón un solo UX cuando el recorrido, el dueño y el ciclo de vida sean comunes.
3. Para cada etapa, consulta BIAN con `npm run channel -- bian --query "<propósito>" --action <acción>`. Comprueba que la responsabilidad y la acción correspondan. Registra `stages[].bian` solo cuando la referencia encaja. Si no encaja, deja la equivalencia como pendiente con el prefijo `[architect]`.
4. Ordena los `calls` de cada etapa con su `layer` (`Business` o `Producto`) y su `purpose`. Contract los vincula después con el catálogo.
5. Define `scenarios[]`: el recorrido principal y una variante por cada desenlace alternativo del brief (rechazo, error o resultado incierto).
6. Marca `new` o `existing` en servicios, Frontend, APIM y consumos pendientes según el brief.

Si te falta una decisión sobre límites UX, una elección entre referencias BIAN o un estado `new`/`existing`, pregunta al desarrollador en una ronda de hasta cuatro preguntas con tu recomendación. Si te falta una decisión de negocio, regístrala en `state.json.openQuestions` con `owner: "discovery"` y devuelve el control.

El modo termina cuando cada etapa del brief tiene servicio, propósito, reglas, `calls` ordenados y referencia BIAN o pendiente, y cada desenlace del brief aparece en un escenario.

## Modo build

1. Ejecuta `npm run channel -- build --input <sesión>/spec.json --out <sesión>/build --open`. Si el editor no está activo, inícialo con `npm run channel:editor` en un proceso separado. Usa `--editor-url` si está en otro puerto y `--repo <clon>` si contract usó otro catálogo.
2. Si `build` falla por una sección tuya, corrígela y repite. Si falla por una sección de contract, registra un hallazgo con el error textual y devuelve el control.
3. Si la apertura en Draw.io falla, conserva los archivos generados, comprueba el editor y reintenta la apertura.

El modo termina cuando hay una nueva `build/propuesta-*/` abierta en Draw.io. Devuelve su ruta al orquestador.
