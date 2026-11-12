# Datos del sitio

- `../data/fonasa-mle-2026.json`: **catálogo oficial de exámenes** (código FONASA y valores por nivel).
  Se genera con `scripts/parse-arancel.py` a partir del PDF; no se edita a mano.
- `exams/`: guías de preparación (Markdown). Cada una se enlaza a un examen con `fonasa: 03-01-045`.
- `../data/examenes-sin-fonasa.json`: exámenes especializados **sin código ni valor FONASA** (id `sf-…`, sin niveles).
  Se cargaron desde el directorio público de BKLAB (Barnafi Krause, laboratorio de derivación, bklab.cl/examenes;
  trazabilidad en `docs/fuentes/bklab-directorio-2026-11-12.csv`). BKLAB no publica precios, así que no hay ofertas
  suyas. Para dar de alta otro examen, agrega una entrada con la misma forma que el arancel; el importador acepta
  `sf-…` en `exam_code`. Sus fichas quedan `noindex` y fuera del sitemap mientras no tengan precios.
- `providers/`: un JSON por prestador (laboratorio, clínica, centro).
- `prices/`: **un JSON por prestador** (`prices/<prestador>.json`) con todas sus ofertas: examen × tipo × fecha.
  No se editan a mano en masa: se generan con `scripts/import-prices.py` (formato en `scripts/pricefile.py`).
  Al compilar, el sitio publica un archivo por examen (`/data/ofertas/<código>.json`) que el cotizador pide
  solo cuando el usuario elige ese examen; así la página no crece al sumar prestadores.
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
   (se combina con lo ya cargado del prestador; con `--replace` el CSV reemplaza todas sus ofertas)
4. `npm run build` para comprobar y luego commit.

El importador exige fuente pública y fecha en cada fila, y rechaza códigos FONASA que no existan.

## Agregar un precio a mano

1. Crea el prestador en `providers/<id>.json` si no existe (el nombre del archivo es su id).
2. Agrega una línea a `prices/<id>.json` dentro de `offers`, con `exam` (código FONASA con guiones, p. ej.
   `03-02-047`), `amount` (entero en CLP), `kind`, `verifiedAt` (fecha en que viste el precio) y `sourceUrl`.
   Si el precio vale en varias comunas, usa `subdivisions: [...]`.
3. Todo precio debe provenir de una fuente pública verificable. Nunca de un acuerdo comercial.
4. Los precios con más de 90 días se marcan "Por reconfirmar" automáticamente.
