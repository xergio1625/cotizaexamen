# Datos del sitio

- `exams/` guías de preparación (Markdown).
- `providers/` un JSON por prestador (laboratorio, clínica, centro).
- `prices/` un JSON por precio observado: examen × prestador × fecha.
- `_ejemplos/` formato de referencia con datos FICTICIOS. No se publican (están fuera de las carpetas cargadas).

Para agregar un precio real:

1. Crea el prestador en `providers/<id>.json` si no existe (el nombre del archivo es su id).
2. Crea `prices/<examen>-<prestador>.json` con `exam` (id de la guía, p. ej. `glicemia`), `provider`,
   `amount` (entero en CLP), `verifiedAt` (fecha en que viste el precio) y `sourceUrl` si hay una página pública.
3. Todo precio debe provenir de una fuente pública verificable. Nunca de un acuerdo comercial.
4. Los precios con más de 90 días se marcan "Por reconfirmar" automáticamente.
