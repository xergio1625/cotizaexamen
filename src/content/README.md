# Datos del sitio

- `../data/fonasa-mle-2026.json`: **catálogo oficial de exámenes** (código FONASA y valores por nivel).
  Se genera con `scripts/parse-arancel.py` a partir del PDF; no se edita a mano.
- `exams/`: guías de preparación (Markdown). Cada una se enlaza a un examen con `fonasa: 03-01-045`.
- `providers/`: un JSON por prestador (laboratorio, clínica, centro).
- `prices/`: un JSON por precio observado: examen × prestador × fecha.
- `_ejemplos/`: formato de referencia con datos FICTICIOS. No se publican.

## Actualizar el arancel (cada año)

```bash
pdftotext -layout Libro-Arancel-MLE-AAAA.pdf arancel.txt
python scripts/parse-arancel.py arancel.txt src/data/fonasa-mle-AAAA.json
```

Luego apunta `file('src/data/...')` en `src/content.config.ts` al archivo nuevo y revisa que los códigos de las
guías (`fonasa:`) y de los precios (`exam:`) sigan existiendo.

## Agregar precios reales (recomendado: por CSV)

1. Copia `docs/precios-plantilla.csv`, ábrelo en Excel y agrega una fila por precio.
2. Valida sin escribir: `python scripts/import-prices.py mis-precios.csv --check`
3. Genera los archivos: `python scripts/import-prices.py mis-precios.csv`
4. `npm run build` para comprobar y luego commit.

El importador exige fuente pública y fecha en cada fila, y rechaza códigos FONASA que no existan.

## Agregar un precio a mano

1. Crea el prestador en `providers/<id>.json` si no existe (el nombre del archivo es su id).
2. Crea `prices/<codigo>-<prestador>.json` con `exam` (código FONASA con guiones, p. ej. `03-02-047`),
   `provider`, `amount` (entero en CLP), `verifiedAt` (fecha en que viste el precio) y `sourceUrl` si hay una
   página pública.
3. Todo precio debe provenir de una fuente pública verificable. Nunca de un acuerdo comercial.
4. Los precios con más de 90 días se marcan "Por reconfirmar" automáticamente.
