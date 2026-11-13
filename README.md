# CotizaExamen

Sitio estático (Astro + TypeScript) con precios y preparación de exámenes de laboratorio en Chile.

```bash
npm install
npm run dev      # desarrollo
npm run build    # astro check + build a dist/
```

## Dónde se cambia qué
- **Todo lo configurable:** `site.config.ts` (país, dominio, moneda, módulos, firma, correo).
- **Guías de preparación:** `src/content/exams/*.md`.
- **Precios y prestadores:** `src/content/prices|providers/*.json`, un archivo por prestador (ver `src/content/README.md`).
- **Despliegue y dominio:** `.github/workflows/deploy.yml`, `public/CNAME`, `docs/DNS.md`.

## Línea estratégica: informar, no comparar
CotizaExamen **no es un comparador de precios**. El autor es profesional de laboratorio y el precio es solo una
variable entre varias (calidad analítica, utilidad clínica, costo del traslado, condiciones de la muestra). Resumir un
examen en "el más barato" puede llevar al paciente a un error. Por tanto:
- No se publican "el más barato", "ahorro máximo", "desde $X" en títulos, textos ni FAQ, ni rankings de prestadores.
- El orden por defecto es alfabético; el precio es una opción de orden, nunca la vista inicial.
- Las páginas que muestran precios incluyen `PrecioNoEsTodo` (aviso) y enlazan a `/sobre-el-sitio/#no-es-un-comparador`.
- Cualquier función nueva (resúmenes, calculadoras, alertas) se evalúa contra esta línea antes de construirse.

## Reglas editoriales
- Sin dinero de prestadores: orden solo por precio, comuna o alfabeto (`src/lib/ordering.ts`).
- Sin interpretación de resultados individuales.
- Todo precio con fuente pública y fecha de verificación.

## Antes de publicar
- [ ] Definir `author.displayName` y `contactEmail` en `site.config.ts`.
- [ ] Completar el párrafo sobre Consensus Lab en `/sobre-el-sitio/`.
- [ ] Revisión clínica de cada guía.
- [ ] Cargar precios reales y validar el JSON-LD (validator.schema.org).
- [ ] Revisión legal de privacidad y aviso legal.
