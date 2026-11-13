# ADR-004 — Copia de figuras vinculadas entre documentos

Fecha: 14 de octubre de 2026 (America/Lima). Estado: aceptado y comprobado en etapa 5.

Se permite copiar/duplicar figuras dentro de un documento, conservando la referencia y generando id visual nuevo. Al copiar a otro documento, esta versión **bloquea explícitamente** la inserción si falta cualquier revisión/API necesaria. No remapea por nombre, ruta, operationId ni huella de otra API. Esta es la alternativa permitida en ADR-001 §7.4 al transporte/deduplicación preferidos.

La comprobación previa envuelve únicamente `graph.importCells` en la instancia del adaptador. Recorre hijos antes de llamar a la implementación original; si falta un vínculo, informa cómo continuar y no inserta ninguna parte de esa copia. No hay parche a la distribución ni wrapper global. Figuras libres y pendientes siguen el comportamiento normal. Diagramas completos se comparten/reabren con sus snapshots.

Justificación: transportar metadatos en todos los formatos de clipboard y entre navegadores necesita una integración específica. Bloquear la copia incompleta permite cerrar portabilidad sin generar documentación aparentemente válida o inferir la identidad. Una implementación futura de transporte tendrá su propio ADR y reemplazará esta limitación.

Evidencia requerida: copia dentro del mismo documento, id nuevo/referencia compartida y snapshot único; intento en otro documento sin revisión bloqueado sin inserciones; copia de figura libre permitida; guardar/reabrir archivo completo en perfil limpio conserva todo.

Resultado: escenario `tests/integration/portability.spec.mjs` aprobado. Usa `mxClipboard.copy/paste` nativos, id distinto con referencia compartida, páginas duplicadas, guardar archivo completo, editar y descargar con editor sin plugin, reapertura con plugin en contexto nuevo, bloqueo previo de copia incompleta y copia normal de figura libre. No se anuncia transporte de contratos por clipboard.
