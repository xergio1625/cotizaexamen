import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';

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

/** Guía de preparación de un examen. No incluye interpretación de resultados. */
const exams = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/exams' }),
  schema: z.object({
    title: z.string(), // "Hemograma"
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
  }),
});

/**
 * Un precio observado: examen × prestador × fecha.
 * Siempre con fuente y fecha de verificación (transparencia).
 */
const prices = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/prices' }),
  schema: z.object({
    exam: reference('exams'),
    provider: reference('providers'),
    /** Entero en la moneda de site.config (CLP no usa decimales). */
    amount: z.number().int().nonnegative(),
    kind: z.enum(['particular', 'convenio', 'promocion']).default('particular'),
    subdivision: z.string().optional(), // comuna, si el precio es por sucursal
    sourceUrl: z.string().url().optional(),
    verifiedAt: z.coerce.date(),
    note: z.string().optional(),
  }),
});

export const collections = { exams, providers, prices };
