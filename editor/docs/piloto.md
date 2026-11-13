# Etapa 6 — Piloto preparado, sin resultados

Preparado el 14 de octubre de 2026 (America/Lima). Pendiente de 3–5 participantes disponibles; no se contactó a nadie. Todas las tareas usan contratos/diagramas ficticios del repositorio. Los tiempos y respuestas reales del piloto se conservarán fuera de Git en `work/piloto/`; el repositorio solo contiene este protocolo y ejemplos ficticios.

## Preparación

1. Confirmar participantes LT/desarrolladores y tiempo para dos recorridos. Explicar el mismo objetivo y brindar la misma ayuda inicial (máximo una demostración de importar/insertar/consultar/guardar). Registrar ayuda adicional.
2. Flujo A: herramientas habituales, Draw.io sin plugin (`contracts=0`) y los contratos locales consultados como documentos. Flujo B: el mismo editor con extensión.
3. Asignar P01/P03/P05 a orden A→B, P02/P04 a B→A para reducir aprendizaje. Usar tareas equivalentes con ids/operaciones ficticios; no dar la solución antes del segundo recorrido.
4. Crear perfiles limpios y diagramas nuevos por recorrido. Ambos tienen acceso a los mismos tres archivos ficticios y herramientas habituales. No ejecutar APIs ni acceder a repositorios reales.

## Tareas equivalentes

| Tarea | Objetivo observable |
|---|---|
| Localización | Encontrar GET `/clientes/{clienteId}` en API de clientes y API de ofertas, distinguir propietario/revisión y hallar PATCH de clientes |
| Consulta | Identificar path requerido, query heredada/reemplazada, request requerido y MIME, varias responses/headers y seguridad global frente a seguridad vacía |
| Construcción | Dibujar tres operaciones, una UX pendiente y una caché libre; conectar y añadir validación manual; vincular pendiente conservando notas y geometría |
| Portabilidad | Guardar, cerrar, reabrir con un perfil limpio sin seleccionar contratos originales y volver a consultar la operación |
| Reutilización | Repetir una búsqueda/consulta breve con mínima ayuda y explicar cómo usaría la herramienta en su siguiente diagrama |

Para la consulta 3.1: GET exige `clienteId` path y `detalle` query, hereda seguridad `demoKey` (`X-Ficticio`). PATCH hereda `detalle` opcional, tiene request JSON requerido y `security: []`. Las respuestas incluyen una revisión concreta del contrato; no prueban comportamiento desplegado. Cambiar a un caso Swagger 2.0 permite comprobar `body` frente a `formData` y MIME efectivos. No inferir que el color/tag identifique un microservicio.

## Registro por participante/recorrido

Guardar un documento local de resultados con: alias, experiencia con Draw.io/OpenAPI, orden, versión del editor/extensión, tiempos separados de localizar/consultar/construir/reabrir, exactitud de cada respuesta, errores de identidad y guardado, asistencia, fricciones y voluntad de reutilización. Usar segundos del mismo reloj y mismas reglas de inicio/fin. No mezclar instalación inicial/descargas con tiempo de tarea.

Ejemplo **ficticio** de estructura (sin mediciones inventadas):

```json
{"participante":"P01","orden":"A-B","recorridos":{"A":{"localizar_s":null,"consultar_s":null,"construir_s":null,"reabrir_s":null,"aciertos":null,"fallos_guardado":null,"ayudas":null},"B":{"localizar_s":null,"consultar_s":null,"construir_s":null,"reabrir_s":null,"aciertos":null,"fallos_guardado":null,"ayudas":null}},"quiere_reutilizar":null,"fricciones":[]}
```

## Evaluación

Por persona, sumar localizar+consultar+construir de A/B. Calcular mejora como `(A − B) / A × 100` y la mediana de mejoras; informar también los tiempos separados, errores y asistencia. No sustituir resultados faltantes por cero. No interpretar tiempos automatizados de importación/búsqueda como tiempos de utilidad de personas.

Umbral provisional de ADR-001: reducción mediana ≥25 %, sin deteriorar exactitud y al menos dos personas interesadas en reutilizarla. Con 3–5 personas, es una señal para decidir, no evidencia estadística generalizable. Registrar una decisión: continuar, corregir o reducir; no aprobar el piloto sin participantes ni anticipar resultados.
