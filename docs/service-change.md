# Diseñar cambios en un microservicio existente

Abre Agenticos en Codex y describe el cambio. La skill `microservicio-diseno` aplica el [protocolo del agente](../agents/service-change.agent.md). El agente lee el OpenAPI vigente y las fuentes pertinentes del microservicio, entrevista por rondas y guarda una propuesta de diseño para revisión en `runs/service-change/`.

## Ejemplo con el CRUD de cuentas de Hackathon

> Quiero agregar `DELETE /accounts/{id}` al CRUD de cuentas de Hackathon.

La demo parte de un OpenAPI con alta, listado y salud. La primera ronda puede cubrir el resultado de un borrado repetido, la validación del ID, el orden entre BD y Redis y el evento que se publica. Una vez acordados, los casos de cuenta existente, cuenta ausente e identificador inválido pueden ocupar páginas distintas. [Escenario de origen](https://github.com/DiegoAlosilla/backend-java-hackathon/blob/main/docs/delete-design.md)

## Spec y generación

El comando recibe un contrato autocontenido en JSON o YAML y una spec JSON. La propuesta conserva el dialecto y el contenido ajeno a la operación indicada. `replace` requiere la operación OpenAPI completa, incluidos los campos de la operación vigente que se quieran conservar.

| Campo | Contenido |
| --- | --- |
| `version`, `title`, `baselineSha256` | Versión `1`, título de la propuesta y SHA-256 en minúsculas de los bytes del contrato base. |
| `change` | `mode` (`add` o `replace`), `method` en mayúsculas, `path` y `operation` con el objeto OpenAPI de la operación propuesta. |
| `decisions`, `pending` | Listas de acuerdos y decisiones abiertas. |
| `components[]` | `id`, `label`, `kind` (`api`, `service`, `database`, `cache` o `event`) y `status` (`existing` o `new`). El generador reserva `endpoint` para la operación propuesta. |
| `scenarios[]` | `id`, `title`, `response` (código declarado, como `"204"`) y `steps[]`. Cada paso indica `from`, `to`, `direction` (`request` o `response`) y `label`. Empieza con una petición al `endpoint` y termina con su respuesta al solicitante. |

Arranca el editor con `npm run channel:editor`. Desde otra terminal, ejecuta:

```powershell
npm run channel -- change --contract <openapi-base> --input <spec.json> --open
```

La salida incluye `spec.json`, `spec.md`, `openapi.proposed.yaml` y `change.drawio`. En Draw.io, selecciona la operación para consultar Swagger. En **Recorrido**, reproduce la página del escenario que quieras revisar.
