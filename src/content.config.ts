import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { readFile } from 'node:fs/promises';

/**
 * Esquema de datos reutilizable (también por el sitio hermano .com).
 * Nada aquí depende de Chile: país, moneda y subdivisión vienen de site.config.ts.
 */

const examCategory = z.enum([
  'hematologia',
  'bioquimica',
  'hormonas',
  'inmunologia',
  'microbiologia',
  'orina-y-deposiciones',
  'coagulacion',
  'otros',
]);

/**
 * Catálogo oficial de exámenes: Libro Arancel MLE de FONASA (grupo 03, laboratorio).
 * Es la identidad de cada examen (código FONASA) y su valor de referencia por nivel.
 * Se genera con scripts/parse-arancel.py; no se edita a mano.
 * Para otro país, se reemplaza este catálogo por el equivalente local.
 */
const levelValue = z.object({ total: z.number().int().positive(), benef: z.number().int().nonnegative() });
/**
 * El catálogo junta dos archivos con la misma forma:
 *  - src/data/fonasa-mle-2026.json: el arancel oficial (id = código FONASA, "03-01-045").
 *  - src/data/examenes-sin-fonasa.json: exámenes especializados que FONASA no valoriza (id = "sf-...", sin niveles).
 *    Sirven para registrar el examen y recibir precios de prestadores aunque no exista valor oficial.
 */
const CATALOG_FILES = ['src/data/fonasa-mle-2026.json', 'src/data/examenes-sin-fonasa.json'];
const arancel = defineCollection({
  loader: {
    name: 'catalogo-examenes',
    load: async ({ store, parseData, generateDigest }) => {
      store.clear();
      for (const f of CATALOG_FILES) {
        const rows = JSON.parse(await readFile(f, 'utf-8')) as { id: string }[];
        for (const row of rows) {
          const data = await parseData({ id: row.id, data: row });
          store.set({ id: row.id, data, digest: generateDigest(row) });
        }
      }
    },
  },
  schema: z.object({
    code: z.string(), // "03 01 045"
    official: z.string(), // denominación oficial completa
    name: z.string(), // nombre corto legible
    section: z.string(),
    levels: z.record(z.enum(['1', '2', '3']), levelValue),
  }),
});

/**
 * Guía de preparación de un examen. No incluye interpretación de resultados.
 * Una guía se asocia a un examen del arancel mediante `fonasa`.
 */
const exams = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/exams' }),
  schema: z.object({
    title: z.string(), // "Hemograma"
    fonasa: reference('arancel'), // código FONASA del examen, p. ej. "03-01-045"
    aliases: z.array(z.string()).default([]), // "Recuento sanguíneo completo"
    category: examCategory,
    summary: z.string().max(200), // qué es, en una frase (sin interpretar valores)
    sample: z.enum(['sangre', 'orina', 'deposiciones', 'saliva', 'otra']),
    fasting: z.object({
      required: z.boolean(),
      hours: z.number().int().positive().optional(),
      note: z.string().optional(),
    }),
    preparation: z.array(z.string()).default([]), // pasos para el paciente
    turnaround: z.string().optional(), // "24 horas"
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    updated: z.coerce.date(),
    /** Los borradores no se publican. */
    draft: z.boolean().default(true),
  }),
});

/** Prestadores (laboratorios, clínicas, centros). Solo datos factuales. */
const providers = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/providers' }),
  schema: z.object({
    name: z.string(),
    kind: z.enum(['laboratorio', 'clinica', 'centro-medico', 'otro']),
    website: z.string().url().optional(),
    subdivisions: z.array(z.string()).default([]), // comunas con sucursal
    acceptsWalkIn: z.boolean().optional(),
    requiresMedicalOrder: z.boolean().optional(),
    /** Solo aparece en la búsqueda del cotizador al filtrar por región (las fichas de precio por examen sí lo listan). */
    regionalOnly: z.boolean().default(false),
    /**
     * Nivel de inscripción del prestador en FONASA (Modalidad Libre Elección): 1, 2 o 3.
     * Con FONASA el prestador cobra el arancel de su nivel; no puede cobrar otro valor por esas prestaciones.
     * Solo se informa cuando el propio prestador lo declara; si no se sabe, se deja vacío.
     */
    fonasaLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  }),
});

/**
 * Precios observados: UN archivo por prestador (`prices/<prestador>.json`) con todas sus ofertas.
 * Cada oferta es examen × tipo × fecha, siempre con fuente y fecha de verificación (transparencia).
 * Un archivo por prestador (y no uno por precio) mantiene el build rápido y el repositorio liviano
 * aunque se carguen cientos de laboratorios. Se genera con scripts/import-prices.py.
 */
const offer = z.object({
  exam: z.string().regex(/^(\d{2}-\d{2}-\d{3}|sf-[a-z0-9-]+)$/), // código FONASA con guiones, p. ej. "03-01-045"; "sf-..." = examen sin código FONASA
  /** Entero en la moneda de site.config (CLP no usa decimales). */
  amount: z.number().int().nonnegative(),
  kind: z.enum(['particular', 'convenio', 'promocion']).default('particular'),
  subdivision: z.string().optional(), // comuna, si el precio es por sucursal
  subdivisions: z.array(z.string()).optional(), // varias comunas con el mismo precio (alternativa a `subdivision`)
  sourceUrl: z.string().url().optional(),
  verifiedAt: z.coerce.date(),
  note: z.string().optional(),
});

const prices = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/prices' }),
  schema: z.object({
    provider: reference('providers'),
    offers: z.array(offer),
  }),
});

/**
 * Opinión: artículos de análisis del autor sobre precios, metodologías, calidad y proceso.
 * Es opinión profesional, no consejo médico individual ni interpretación de resultados.
 * Cada artículo debe sostener sus afirmaciones con fuentes (`sources`) o declarar que es experiencia.
 */
const opinionTopic = z.enum([
  'precios', // por qué un examen cuesta más o menos
  'metodologia', // técnicas y equipos
  'calidad', // calidad analítica, acreditación, control
  'derivacion', // toma de muestra local y análisis en otra ciudad
  'urgencia', // qué no puede esperar
  'sistema', // FONASA, isapres, bonos, órdenes
  'comunicacion', // cómo se comunica la salud
  'preparacion', // ayuno, horarios y errores al prepararse para el examen
  'resultados', // conceptos generales para leer un resultado (nunca interpretación de un caso)
]);

const opinion = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/opinion' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().max(240),
    topic: opinionTopic,
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Evidencia: normas, guías, publicaciones, aranceles, datos propios del sitio. */
    sources: z.array(z.object({ label: z.string(), url: z.string().url().optional() })).default([]),
    /** Códigos FONASA de exámenes de los que se habla (para enlazar a su ficha). */
    relatedExams: z.array(reference('arancel')).default([]),
    /** Ilustración principal (SVG animado en public/img/opinion/) y su texto alternativo. */
    image: z.string().optional(),
    imageAlt: z.string().default(''),
    draft: z.boolean().default(true),
  }),
});

export const collections = { arancel, exams, providers, prices, opinion };
