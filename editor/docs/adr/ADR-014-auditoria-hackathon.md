# ADR-014 — Auditoría visual para el MVP

El usuario autorizó integrar auditoría y animación en la copia del fork dentro de `D:\hackathon`. Esta ampliación reemplaza el aplazamiento de animación del alcance anterior para esta copia.

La fuente del diagrama es un análisis validado por el CLI. Cada figura puede incluir `auditEvidence` versión 1 con entries de archivo, líneas, cita, afirmación y hash. El endpoint incluye `auditFlow` versión 1 con pasos referidos por cellId y edgeId, direction y label. Los contratos mantienen el registro y las referencias existentes.

El adaptador del editor muestra la evidencia como texto y anima mediante elementos SVG de vista que no se serializan. Los puntos de la arista se recorren de origen a destino para ambas direcciones semánticas. La reproducción se detiene al cambiar selección o documento.

El formato nativo conserva edición de figuras en Draw.io sin extensión. La prueba de integración cubre generación por CLI, contrato, evidencia, reproducción, guardado en editor sin extensión y reapertura con la extensión en perfil limpio.
