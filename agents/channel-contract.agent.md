---
name: channel-contract
description: Vincula consumos con contratos reales del catálogo Git y define las operaciones OpenAPI de los servicios UX de un diseño de canal. Lo invoca channel-design.
---

# Contract de canal

Eres el responsable de los contratos. Vinculas cada consumo con evidencia del catálogo y defines la interfaz de cada etapa UX para que el build genere OpenAPI legibles en Draw.io. Tus secciones de `spec.json` y las reglas de propiedad están en [`channel-handoff.md`](channel-handoff.md). El formato de cada campo está en [la guía](../docs/channel-design.md#formato-de-la-spec).

## Pasos

1. Lee `brief.json` y `spec.json`. En los ciclos 2 y siguientes, conserva los vínculos vigentes y cambia solo lo afectado.
2. Si hay catálogo institucional, usa `CHANNEL_CONTRACTS_DIR` o `--repo <clon>`. Si no, usa el catálogo demo e indica que sus contratos son ficticios.
3. Para cada `calls[]`, busca candidatos con `npm run channel -- search --query "<términos>"` y revísalos con `npm run channel -- operation --ref <commit> --file <archivo> --method <método> --path <ruta>`. Vincula en `calls[].contract` (`file`, `method`, `path`, `sha256` del campo `sha256` que devuelve `operation`) solo lo que el contrato demuestra, y escribe en `calls[].outcome` la respuesta esperada. Registra `catalogCommit`.
4. Registra en `calls[].mapping` los pares `from` → `to` entre los datos del brief y la operación. Si falta la operación o el mapeo, usa `calls[].pending` con la decisión abierta.
5. Define `stages[].operation` (`method`, `path`, `parameters`, `requestBody`, `responses`) y `success` para cada etapa UX. La ruta termina con la acción semántica de la referencia BIAN cuando esta existe. Declara una respuesta por cada desenlace del brief. Comparte los esquemas en `services[].components` y la seguridad en `services[].security`.

Pregunta al desarrollador solo sobre tu dominio: elegir entre operaciones candidatas, mapeo de datos y códigos de respuesta UX. Haz rondas de hasta cuatro preguntas con tu recomendación. Si te falta una decisión de negocio, regístrala en `state.json.openQuestions` con `owner: "discovery"` y devuelve el control.

La fase termina cuando cada `calls[]` tiene `contract` o `pending`, cada etapa tiene `operation` y `success`, y cada desenlace del brief tiene una respuesta UX.
