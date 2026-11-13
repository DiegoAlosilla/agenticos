# Handoff entre agentes de canal

Cinco agentes diseñan una API de canal. Cada uno es dueño de una fase y de un archivo o de una sección de la spec. Se comunican mediante archivos en la carpeta de sesión.

| Agente | Fase | Escribe | Habla con el desarrollador |
| --- | --- | --- | --- |
| [`channel-design`](channel-design.agent.md) | Orquestación y transiciones | `state.json` | En las transiciones y en el checkpoint de límites UX |
| [`channel-discovery`](channel-discovery.agent.md) | Entrevista de negocio | `brief.json` | Durante la entrevista |
| [`channel-architect`](channel-architect.agent.md) | Forma UX, BIAN, recorrido y build | Secciones de diseño de `spec.json` | Solo sobre su dominio |
| [`channel-contract`](channel-contract.agent.md) | Catálogo Git y contratos UX | Secciones de contratos de `spec.json` | Solo sobre su dominio |
| [`channel-reviewer`](channel-reviewer.agent.md) | Revisión y cierre | `review.json` | Al cierre, para confirmar el resultado |

## Carpeta de sesión

Cada diseño vive en `runs/channel/<AAAA-MM-DD>-<slug>/`:

- `state.json`: fase actual, ciclo e iteraciones automáticas.
- `brief.json`: requerimiento de negocio.
- `spec.json`: diseño, con el formato de [la guía](../docs/channel-design.md#formato-de-la-spec).
- `review.json`: hallazgos y veredicto.
- `build/propuesta-*/`: una salida por cada ejecución de `build`. Las anteriores se conservan.

Ejecuta el CLI desde la raíz del proyecto con `npm run channel -- <comando>`.

## Propiedad de la spec

Cada agente edita solo sus secciones. Para pedir un cambio en una sección ajena, registra un hallazgo dirigido a su dueño.

| Dueño | Secciones de `spec.json` |
| --- | --- |
| Architect | `version`, `project`, `frontend`, `goal`, `decisions`, `pending`, `services[]` (`id`, `title`, `responsibility`, `status`), `stages[]` (`id`, `title`, `purpose`, `service`, `rules`, `frontendStatus`, `apimStatus`, `bian`), el orden de `stages[].calls[]` con `layer`, `purpose` y `status`, y `scenarios[]` |
| Contract | `catalogCommit`, `services[].components`, `services[].security`, `stages[].operation`, `stages[].success`, `stages[].calls[].contract`, `stages[].calls[].outcome`, `stages[].calls[].pending` y `stages[].calls[].mapping` |

Architect y contract pueden añadir entradas a `pending`. Cada entrada empieza por el dueño entre corchetes, por ejemplo `[contract] Falta la operación de conciliación`.

## Decisiones de negocio

Las decisiones de negocio pertenecen a discovery: identidad, estado, regla, quién decide cada resultado y alcance. Architect y contract solo preguntan sobre su dominio. Si encuentran una decisión de negocio abierta, la registran en `state.json.openQuestions` con `owner: "discovery"` y devuelven el control al orquestador.

## `state.json`

```json
{
  "phase": "discovery | architect | checkpoint | contract | build | review | done",
  "cycle": 1,
  "autoFixes": 0,
  "uxShape": ["servicio-ux: etapa-1 (BIAN Dominio/Acción), etapa-2 (pendiente)"],
  "openQuestions": [{"owner": "discovery", "question": "...", "from": "architect"}]
}
```

`cycle` sube cuando el desarrollador rechaza el resultado. `autoFixes` vuelve a 0 en cada ciclo.

## `brief.json`

```json
{
  "story": "Historia de negocio resumida",
  "trigger": "Qué inicia el flujo",
  "done": "Cuándo termina",
  "frontend": "Canal",
  "identity": "Dato de identidad que entrega el frontend",
  "state": "Quién conserva el estado y qué dato conecta los pasos",
  "steps": [{"id": "simular", "goal": "...", "decidedBy": "...", "inputs": ["..."], "outputs": ["..."], "outcomes": ["aprobado", "rechazado"]}],
  "decisions": ["Acuerdo confirmado por el desarrollador"],
  "pending": ["Decisión de negocio abierta"],
  "ready": true
}
```

`ready: true` indica que cada paso tiene objetivo, responsable de la decisión, entradas, salidas y resultados, o que la decisión correspondiente está en `pending` y el desarrollador aceptó avanzar con ella abierta.

## `review.json`

```json
{
  "cycle": 1,
  "build": "build/propuesta-xxxx",
  "findings": [
    {"id": "R1", "owner": "architect | contract | discovery", "kind": "technical | business", "severity": "blocking | major | minor", "where": "stages[simular].operation", "finding": "...", "expected": "..."}
  ],
  "verdict": "pending | accepted | rejected",
  "developerFeedback": "Comentario textual cuando el desarrollador rechaza"
}
```

## Flujo

1. **Discovery** entrevista hasta `brief.json.ready`.
2. **Architect** escribe sus secciones.
3. **Checkpoint**: el orquestador presenta la forma UX y espera el ok del desarrollador.
4. **Contract** escribe sus secciones.
5. **Architect** ejecuta `build --open`.
6. **Reviewer** revisa. Los hallazgos `technical` + `blocking` vuelven a su dueño hasta 2 veces por ciclo. Después, el reviewer pregunta al desarrollador si el resultado es el esperado.
7. Si el desarrollador rechaza el resultado, empieza otro ciclo desde discovery con una ronda sobre lo que falta. En ese ciclo, cada agente edita de forma incremental y conserva los acuerdos vigentes. El checkpoint se repite solo si cambió `uxShape`, que lista los servicios UX, sus etapas y sus referencias BIAN.
