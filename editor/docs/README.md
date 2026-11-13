# Documentación

La versión del proyecto es **1.0.0**. Las entregas de interfaz 1.7–1.11 quedan como historial de desarrollo.

- [Notas de la versión 1.0.0](releases/v1.0.0.md)
- [Inicio, instalación y uso](../README.md)
- [Cambios](../CHANGELOG.md)
- [Alcance y aceptación — ADR-001](../ADR-001-extension-contratos-drawio.md)
- [Compatibilidad y pruebas](compatibilidad.md)
- [Progreso y evidencias](progreso.md)
- [Piloto con personas pendiente](piloto.md)
- [Reglas del proyecto](../AGENTS.md)
- [Atribuciones y licencias de terceros](../THIRD_PARTY_NOTICES.md)

## Decisiones de arquitectura

- [ADR-002: registro portable](adr/ADR-002-registro-etapa-0.md)
- [ADR-003: versiones OpenAPI y dialectos](adr/ADR-003-openapi-versiones.md)
- [ADR-004: copia entre documentos](adr/ADR-004-copia-entre-documentos.md)
- [ADR-005: figuras de API y operaciones](adr/ADR-005-figura-componente.md)
- [ADR-006: consulta y diagnósticos](adr/ADR-006-consulta-y-diagnosticos.md)
- [ADR-007: panel lateral, decisión histórica](adr/ADR-007-panel-endpoint.md)
- [ADR-008: Swagger UI real](adr/ADR-008-swagger-ui-real.md)
- [ADR-009: pestaña nativa, controles y selección actual](adr/ADR-009-tab-contratos-nativo.md)
- [ADR-010: autoría y generación desde figuras — en pausa desde 18/10/2026](adr/ADR-010-autoria-y-generacion-contratos.md)
- [ADR-011: consulta BIAN local, catálogo/fuentes/versiones/licencias](adr/ADR-011-consulta-bian-local.md)
- [ADR-012: guía BIAN, español de apoyo y referencia portable por figura](adr/ADR-012-guia-bian-y-referencias-en-figuras.md)
- [ADR-013: asistencia BIAN con IA local opcional](adr/ADR-013-asistencia-bian-ia-local.md)
- [ADR-014: auditoría visual y animación del Hackathon](adr/ADR-014-auditoria-hackathon.md)
- [ADR-015: diseño de canal y catálogo Git](adr/ADR-015-diseno-canal.md)
- [Preparar y utilizar IA local](ia-local.md)
- [Interfaz BIAN Lista y detalle y pruebas del cambio](compatibilidad.md#bian-lista-y-detalle--24102026)

Estudio de referencia: [estructura de la plantilla, errores, prioridades y consulta BIAN](analisis-generacion-contratos.md). La autoría G1 se retiró de la interfaz el 18/10/2026; se conserva su evidencia histórica y sus datos existentes. **Consulta BIAN disponible en Contratos → Consultar BIAN**, con búsqueda por propósito y definiciones/operaciones oficiales locales. La copia Hackathon incluye el reproductor de recorridos. Spectral institucional no está integrado.

Seguimiento: [ruleset y funciones Spectral, matriz HTTP y ejecución local](analisis-ruleset-spectral.md), con [24 casos ficticios comprobados](evidence/spectral-characterization-results.json). [Catálogo BIAN fijado](../data/bian/README.md): Landscape 14.0 / Semantic APIs BOM OAS 14.0.0, 258 dominios/4.580 operaciones. Es referencia oficial; no declara adopción o reglas institucionales del equipo.

Los reportes y capturas están en `evidence/`; cada afirmación de compatibilidad remite a la evidencia ejecutada y sus límites. Los ejemplos incluidos son ficticios. Runtime, dependencias instaladas, cachés y temporales no se versionan.
