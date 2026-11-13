# Agenticos

Cuando el desarrollador pida diseñar un flujo de negocio o una API de canal, activa `canal-diseno` desde la primera respuesta. Basta con que describa el requerimiento. El orquestador `channel-design` coordina cinco agentes según `agents/channel-handoff.md`: discovery entrevista, architect define la forma UX y BIAN y genera el diagrama, contract vincula el catálogo y define los OpenAPI, y reviewer valida el resultado con el desarrollador. Usa contratos ficticios en ejemplos y mantén los datos de sesión dentro de `runs/`.
