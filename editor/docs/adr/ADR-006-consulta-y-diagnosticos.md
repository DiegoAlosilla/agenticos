# ADR-006 — Consulta visual y diagnósticos de importación

Fecha: 14 de octubre de 2026 (America/Lima). Estado: aceptado como ajuste solicitado por el usuario.

## Problema y decisión

El inspector exponía objetos JSON como vista principal, la procedencia ocupaba demasiado espacio y el validador devolvía un primer error de Ajv poco claro. El usuario señaló problemas al probar distintas entradas públicas y dificultad para comprender la documentación visualmente.

Se mantiene Draw.io local y su adaptador. Una hoja de estilo propia, aislada por clases `ct`, proporciona jerarquía visual, contraste claro/oscuro y dimensiones adaptables sin modificar el editor ni cargar fuentes externas. Catálogo agrupado por API, método y ruta; búsqueda y clasificación manual continúan. El resumen de importación permite abrir directamente el catálogo.

El inspector muestra pestañas Entrada, Respuestas, Seguridad y Fuente. Los parámetros se presentan en tabla, ordenados por ubicación, con tipo y requerimiento; los esquemas muestran campos, composición explícita y referencias expandibles. Respuestas seleccionables por código y MIME; ejemplos seleccionables y separados de los esquemas. Un ejemplo sin schema no implica un esquema inventado. Las cadenas de ejemplo se conservan como cadenas; no se ejecuta HTML ni se descargan ejemplos externos. Seguridad conserva OR/AND, scopes, procedencia y acceso anónimo explícito. Identificadores completos y JSON quedan en Fuente, con generación de vista al expandir.

Límite visual: 6 niveles y presupuesto de 300 nodos por esquema; campos no mostrados siguen en la definición original. No se aplanan `allOf`/`oneOf`/`anyOf`, ni se interpretan siblings legacy como restricciones. El registro, snapshots y referencias no cambian de formato.

## Diagnósticos

Ajv utiliza `allErrors: true`. El núcleo formatea problemas independientes y filtra ruido de ramas alternativas que no corresponden al tipo de objeto; no cambia el resultado de aceptación del validador. Se muestran hasta 50 problemas con puntero y orientación, sin efectuar reparaciones. Los ciclos, referencias y límites se siguen comprobando antes de validar estructura; normalización sigue después. Por ello el informe **no garantiza listar todos los problemas del documento**: una etapa posterior puede detectar otros.

En YAML se informa la primera incidencia con ubicación y explicación; los posteriores pueden ser cascada. Se identifica HTML descargado en lugar del contenido Raw. No se relaja el parser ni se reparan archivos durante la importación. El rechazo mantiene la transacción y el registro intactos.

## Verificación externa acotada

Se fijaron commit y SHA-256 de los nueve contratos de `examples/` de postmanlabs/openapi-to-postman en [config/public-examples.json](../../config/public-examples.json). Los dos JSON de opciones se excluyen por no ser contratos. **Siete originales aceptados; dos rechazados correctamente**: una llave mal indentada en `api-with-examples.yaml` (línea 43) y defectos de Parameter/Security Scheme en `petstore-expanded.yaml`. No se supone que todo archivo de ese repositorio sea válido ni se anuncia cobertura de su suite completa.

`npm run test:corpus` descarga explícitamente esos archivos públicos al directorio ignorado work, verifica huellas, prueba aceptación/rechazo y una reparación local explícita de esa única indentación (2 operaciones). Después de preparar los archivos se pueden reutilizar sin red; el importador no descarga referencias. `npm run test:corpus:browser` requiere el editor local iniciado y comprueba importación real, atomicidad de los rechazos y ejemplo de respuesta de la copia corregida. Es una prueba de desarrollo, no una integración GitHub del producto.

Fuentes originales, copias y capturas de entradas públicas permanecen fuera de ejemplos/evidencias del repositorio. Solo se guardan matriz y resultados sin contenido de los contratos. Las fixtures y capturas de regresión propias son ficticias.

## Evidencias

- [Resultados de los nueve archivos](../evidence/public-examples-results.json), [navegador](../evidence/public-examples-browser-results.json).
- [Entrada visual](../evidence/inspector-entrada.png), [respuestas](../evidence/inspector-respuestas.png), [catálogo](../evidence/catalogo-redisenado.png), [diagnósticos](../evidence/importacion-diagnosticos.png).
- `npm test`: núcleo, regresión completa del editor/portabilidad y dos escenarios de inspector, incluyendo teclado, referencias recursivas, ejemplos sin schema y pantalla estrecha/modo oscuro. Arranque previo no se repite: bootstrap y dependencias no cambiaron. Piloto humano pendiente.
