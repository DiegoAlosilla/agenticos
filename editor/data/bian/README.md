# Catálogo local BIAN

Datos de referencia oficiales, separados de ejemplos y fixtures de negocio ficticios. BIAN y contribuidores, Apache-2.0; [licencia literal](../../licenses/bian-Apache-2.0.txt). No se presenta patrocinio ni certificación BIAN.

`catalog.json` es una **proyección modificada**, derivada de Semantic APIs BOM extended OAS 3.x **14.0.0**, commit `b58bf4c2c300dd018afc084e9bb24b7adaaa3500` de [bian-official/public](https://github.com/bian-official/public/tree/b58bf4c2c300dd018afc084e9bb24b7adaaa3500). Se conservan definiciones, nombres, operaciones y rutas literalmente; se omiten modelos/payloads. No se mezclan ISO20022/DDD ni AsyncAPI. 258 dominios y 4.580 operaciones; 16 artefactos no publican operaciones en paths y uno carece de definición de dominio. Los huecos se conservan y registran en manifest.json; no se completan con contenido inventado.

`manifest.json` enumera los archivos fuente, tamaños, Git blob SHA-1 y SHA-256, anomalías, licencia y huella del catálogo derivado. La búsqueda española es ayuda propia en `src/bian/search.ts`, versión `es-en-local/2`, sin alterar los textos oficiales.

`es-support.json`, versión `es-support/1`, contiene nombres traducidos y resúmenes de apoyo propios para los 258 dominios; **no es traducción oficial ni literal completa**. Se identifica por commit de origen, conserva la ausencia de definición de Information Provider Operation y no traduce operationId/rutas/payloads. El original inglés sigue disponible en el visor. La guía y ayuda de 15 acciones se redactan en `src/bian/guidance.ts`; no se distribuye el PDF conceptual enlazado. [ADR-012](../../docs/adr/ADR-012-guia-bian-y-referencias-en-figuras.md) define cobertura, límites e inserción de extractos portables en figuras mediante bianRef.

Verificación de desarrollo reproducible (requiere las dependencias instaladas):

```powershell
node scripts/bian-catalog.mjs --download
node scripts/bian-catalog.mjs
```

La primera orden obtiene **solo fuentes fijadas** a `work/bian/sources`, ignorado. Las siguientes no necesitan red. `--write` vuelve a serializar la misma proyección y comprueba su huella; no cambia la versión ni el manifiesto. No se ejecuta este script al arrancar ni construir el producto. Actualizar datos requiere un ADR revisado, fuentes/condiciones contrastadas, nuevo manifiesto y pruebas; no usar ramas flotantes en runtime.

Decisión, alcance y aceptación: [ADR-011](../../docs/adr/ADR-011-consulta-bian-local.md). Se conserva la licencia del repositorio; no se extiende al portal, PDFs ni otros contenidos de bian.org. No se distribuyen logos ni el sitio. La licencia de publicación del código propio sigue pendiente.
