import { getCollection } from 'astro:content';
import { regionOf } from './regions';
import type { Orderable } from './ordering';

export interface PriceRow extends Orderable {
  examId: string;
  kind: 'particular' | 'convenio' | 'promocion';
  providerWebsite?: string;
  /** Prestador local: se muestra solo al filtrar por región en el cotizador. */
  regionalOnly: boolean;
  fonasaLevel?: 1 | 2 | 3;
  sourceUrl?: string;
  verifiedAt: Date;
  note?: string;
  stale: boolean;
}

/** Un precio verificado hace más de estos días se marca como "por reconfirmar". */
export const STALE_DAYS = 90;

let rowsCache: Promise<PriceRow[]> | undefined;

/** Una fila por precio y comuna. Se calcula una sola vez por build. */
export function getPriceRows(): Promise<PriceRow[]> {
  rowsCache ??= loadRows();
  return rowsCache;
}

async function loadRows(): Promise<PriceRow[]> {
  const [files, providers] = await Promise.all([getCollection('prices'), getCollection('providers')]);
  const byId = new Map(providers.map((p) => [p.id, p.data]));
  const now = Date.now();
  const rows: PriceRow[] = [];

  for (const file of files) {
    const provider = byId.get(file.data.provider.id);
    if (!provider) continue;
    for (const o of file.data.offers) {
      const subs = o.subdivisions?.length ? o.subdivisions : [o.subdivision];
      const stale = (now - o.verifiedAt.getTime()) / 86_400_000 > STALE_DAYS;
      for (const subdivision of subs) {
        rows.push({
          examId: o.exam,
          amount: o.amount,
          kind: o.kind,
          subdivision,
          providerName: provider.name,
          providerWebsite: provider.website,
          regionalOnly: provider.regionalOnly,
          fonasaLevel: provider.fonasaLevel,
          sourceUrl: o.sourceUrl,
          verifiedAt: o.verifiedAt,
          note: o.note,
          stale,
        });
      }
    }
  }
  return rows;
}

/** Cantidad de ofertas publicadas (un precio válido en varias comunas cuenta una vez). */
export async function countOffers(): Promise<number> {
  return (await getCollection('prices')).reduce((n, f) => n + f.data.offers.length, 0);
}

/* ---------- Páginas de examen: un renglón por oferta, con todas sus comunas ---------- */

export interface OfferRow extends PriceRow {
  subdivisions: string[];
}

/**
 * Junta las filas por comuna de un mismo precio (prestador, tipo, monto y fecha) en una sola.
 * `subdivision` queda con la primera comuna en orden alfabético, solo para poder ordenar.
 */
export function groupOffers(rows: PriceRow[]): OfferRow[] {
  const map = new Map<string, OfferRow>();
  for (const r of rows) {
    const key = [r.providerName, r.kind, r.amount, r.verifiedAt.getTime(), r.sourceUrl ?? '', r.note ?? ''].join('|');
    let g = map.get(key);
    if (!g) {
      g = { ...r, subdivision: undefined, subdivisions: [] };
      map.set(key, g);
    }
    if (r.subdivision && !g.subdivisions.includes(r.subdivision)) g.subdivisions.push(r.subdivision);
  }
  const collator = new Intl.Collator('es', { sensitivity: 'base' });
  for (const g of map.values()) {
    g.subdivisions.sort(collator.compare);
    g.subdivision = g.subdivisions[0];
  }
  return [...map.values()];
}

/* ---------- Cotizador: ofertas por examen, cargadas bajo demanda ---------- */

/** Oferta tal como la recibe el navegador. El examen va en el nombre del archivo. */
export interface ClientOffer {
  provider: string;
  website: string;
  kind: string;
  subdivisions: string[];
  regionalOnly: boolean;
  fonasaLevel: number;
  amount: number;
  verifiedAt: string;
}

export interface OfferIndex {
  /** Ofertas por código de examen; un precio igual en varias comunas viaja una sola vez. */
  byExam: Map<string, ClientOffer[]>;
  /** Región de cada comuna con precios. */
  subRegions: Record<string, string>;
}

let indexCache: Promise<OfferIndex> | undefined;

export function getOfferIndex(): Promise<OfferIndex> {
  indexCache ??= buildIndex();
  return indexCache;
}

async function buildIndex(): Promise<OfferIndex> {
  const rows = await getPriceRows();
  const byExam = new Map<string, ClientOffer[]>();
  const subRegions: Record<string, string> = {};
  const grouped = new Map<string, ClientOffer>();

  for (const r of rows) {
    const verifiedAt = r.verifiedAt.toISOString().slice(0, 10);
    const key = [r.examId, r.providerName, r.kind, r.amount, verifiedAt].join('|');
    let o = grouped.get(key);
    if (!o) {
      o = {
        provider: r.providerName,
        website: r.providerWebsite ?? '',
        kind: r.kind,
        subdivisions: [],
        regionalOnly: r.regionalOnly,
        fonasaLevel: r.fonasaLevel ?? 0,
        amount: r.amount,
        verifiedAt,
      };
      grouped.set(key, o);
      const list = byExam.get(r.examId);
      if (list) list.push(o);
      else byExam.set(r.examId, [o]);
    }
    if (r.subdivision && !o.subdivisions.includes(r.subdivision)) {
      o.subdivisions.push(r.subdivision);
      const region = regionOf(r.subdivision);
      if (!region) console.warn(`[cotizador] La comuna "${r.subdivision}" no está en src/lib/regions.ts: no tendrá región.`);
      subRegions[r.subdivision] = region ?? '';
    }
  }
  return { byExam, subRegions };
}
