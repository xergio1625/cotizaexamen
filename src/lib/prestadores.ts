import { getCollection } from 'astro:content';
import { getPriceRows } from './prices';
import { getArancel } from './arancel';
import { slugifyComuna } from './comunas';

/**
 * Páginas de prestador. Solo existen para prestadores con al menos un precio publicado.
 * El slug es el id del prestador (nombre de su archivo en src/content/providers/).
 */

export interface PrestadorExam {
  id: string;
  name: string;
  slug: string;
  section: string;
  /** Precio más bajo publicado por este prestador para el examen. */
  amount: number;
  /** Arancel FONASA total del examen en el nivel del prestador, si se conoce. */
  fonasaTotal?: number;
  fonasaCopago?: number;
  /** Cuántos prestadores publican precio de este examen (para ordenar por relevancia). */
  popularity: number;
}

export interface Prestador {
  id: string;
  name: string;
  kind: 'laboratorio' | 'clinica' | 'centro-medico' | 'otro';
  website?: string;
  fonasaLevel?: 1 | 2 | 3;
  acceptsWalkIn?: boolean;
  requiresMedicalOrder?: boolean;
  /** Comunas con precio publicado, con la ruta de su página. */
  comunas: { name: string; slug: string }[];
  exams: PrestadorExam[];
  sourceUrls: string[];
  newest: Date;
  oldest: Date;
}

export const kindLabel: Record<Prestador['kind'], string> = {
  laboratorio: 'Laboratorio',
  clinica: 'Clínica',
  'centro-medico': 'Centro médico',
  otro: 'Prestador',
};

let cache: Promise<Prestador[]> | undefined;

export function getPrestadores(): Promise<Prestador[]> {
  cache ??= build();
  return cache;
}

async function build(): Promise<Prestador[]> {
  const [rows, arancel, providers] = await Promise.all([getPriceRows(), getArancel(), getCollection('providers')]);
  const examById = new Map(arancel.map((e) => [e.id, e]));
  const collator = new Intl.Collator('es', { sensitivity: 'base' });

  // Cuántos prestadores distintos publican cada examen.
  const provsByExam = new Map<string, Set<string>>();
  for (const r of rows) {
    const s = provsByExam.get(r.examId);
    if (s) s.add(r.providerId);
    else provsByExam.set(r.examId, new Set([r.providerId]));
  }

  const out: Prestador[] = [];
  for (const p of providers) {
    const mine = rows.filter((r) => r.providerId === p.id);
    if (mine.length === 0) continue;

    const min = new Map<string, number>();
    const comunas = new Set<string>();
    const sources = new Set<string>();
    let newest = mine[0].verifiedAt;
    let oldest = mine[0].verifiedAt;
    for (const r of mine) {
      min.set(r.examId, Math.min(min.get(r.examId) ?? Infinity, r.amount));
      if (r.subdivision) comunas.add(r.subdivision);
      if (r.sourceUrl) sources.add(r.sourceUrl);
      if (r.verifiedAt > newest) newest = r.verifiedAt;
      if (r.verifiedAt < oldest) oldest = r.verifiedAt;
    }

    const level = p.data.fonasaLevel;
    const exams: PrestadorExam[] = [];
    for (const [id, amount] of min) {
      const info = examById.get(id);
      if (!info) continue;
      const lv = level ? info.levels[String(level) as '1' | '2' | '3'] : undefined;
      exams.push({
        id,
        name: info.name,
        slug: info.slug,
        section: info.section,
        amount,
        fonasaTotal: lv?.total,
        fonasaCopago: lv ? lv.total - lv.benef : undefined,
        popularity: provsByExam.get(id)?.size ?? 0,
      });
    }
    exams.sort((a, b) => b.popularity - a.popularity || collator.compare(a.name, b.name));

    out.push({
      id: p.id,
      name: p.data.name,
      kind: p.data.kind,
      website: p.data.website,
      fonasaLevel: level,
      acceptsWalkIn: p.data.acceptsWalkIn,
      requiresMedicalOrder: p.data.requiresMedicalOrder,
      comunas: [...comunas].sort(collator.compare).map((name) => ({ name, slug: slugifyComuna(name) })),
      exams,
      sourceUrls: [...sources],
      newest,
      oldest,
    });
  }
  return out.sort((a, b) => collator.compare(a.name, b.name));
}
