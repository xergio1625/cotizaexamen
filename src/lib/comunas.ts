import { getPriceRows } from './prices';
import { getArancel } from './arancel';
import { regionOf } from './regions';

/**
 * Páginas por comuna (subdivisión). Solo existen para comunas con al menos un precio publicado:
 * nunca se crea una página vacía. Todo se deriva de los precios ya cargados; no hay datos nuevos.
 */

export function slugifyComuna(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface ComunaProvider {
  id: string;
  name: string;
  website?: string;
  fonasaLevel?: 1 | 2 | 3;
  /** Cantidad de exámenes con precio de este prestador en la comuna. */
  exams: number;
}

export interface ComunaExam {
  id: string;
  name: string;
  slug: string;
  section: string;
  min: number;
  max: number;
  /** Prestadores distintos con precio de este examen en la comuna. */
  providers: number;
}

export interface Comuna {
  name: string;
  slug: string;
  region?: string;
  providers: ComunaProvider[];
  exams: ComunaExam[];
  newest: Date;
  oldest: Date;
}

let cache: Promise<Comuna[]> | undefined;

export function getComunas(): Promise<Comuna[]> {
  cache ??= build();
  return cache;
}

async function build(): Promise<Comuna[]> {
  const [rows, arancel] = await Promise.all([getPriceRows(), getArancel()]);
  const examById = new Map(arancel.map((e) => [e.id, e]));
  const collator = new Intl.Collator('es', { sensitivity: 'base' });

  const byComuna = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.subdivision) continue;
    const list = byComuna.get(r.subdivision);
    if (list) list.push(r);
    else byComuna.set(r.subdivision, [r]);
  }

  const out: Comuna[] = [];
  for (const [name, list] of byComuna) {
    const provs = new Map<string, { p: ComunaProvider; ids: Set<string> }>();
    const exams = new Map<string, { min: number; max: number; provs: Set<string> }>();
    let newest = list[0].verifiedAt;
    let oldest = list[0].verifiedAt;

    for (const r of list) {
      if (r.verifiedAt > newest) newest = r.verifiedAt;
      if (r.verifiedAt < oldest) oldest = r.verifiedAt;

      let p = provs.get(r.providerName);
      if (!p) {
        p = { p: { id: r.providerId, name: r.providerName, website: r.providerWebsite, fonasaLevel: r.fonasaLevel, exams: 0 }, ids: new Set() };
        provs.set(r.providerName, p);
      }
      p.ids.add(r.examId);

      let e = exams.get(r.examId);
      if (!e) {
        e = { min: r.amount, max: r.amount, provs: new Set() };
        exams.set(r.examId, e);
      }
      e.min = Math.min(e.min, r.amount);
      e.max = Math.max(e.max, r.amount);
      e.provs.add(r.providerName);
    }

    const examList: ComunaExam[] = [];
    for (const [id, e] of exams) {
      const info = examById.get(id);
      if (!info) continue;
      examList.push({ id, name: info.name, slug: info.slug, section: info.section, min: e.min, max: e.max, providers: e.provs.size });
    }
    examList.sort((a, b) => b.providers - a.providers || collator.compare(a.name, b.name));

    out.push({
      name,
      slug: slugifyComuna(name),
      region: regionOf(name),
      providers: [...provs.values()]
        .map(({ p, ids }) => ({ ...p, exams: ids.size }))
        .sort((a, b) => collator.compare(a.name, b.name)),
      exams: examList,
      newest,
      oldest,
    });
  }
  return out.sort((a, b) => collator.compare(a.name, b.name));
}
