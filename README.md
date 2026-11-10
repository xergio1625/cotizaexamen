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
- **Precios y prestadores:** `src/content/prices|providers/*.json` (ver `src/content/README.md`).
- **Despliegue y dominio:** `.github/workflows/deploy.yml`, `public/CNAME`, `docs/DNS.md`.

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
