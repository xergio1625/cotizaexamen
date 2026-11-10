import { getCollection } from 'astro:content';
import type { Orderable } from './ordering';

export interface PriceRow extends Orderable {
  examId: string;
  kind: 'particular' | 'convenio' | 'promocion';
  providerWebsite?: string;
  sourceUrl?: string;
  verifiedAt: Date;
  note?: string;
  stale: boolean;
}

/** Un precio verificado hace más de estos días se marca como "por reconfirmar". */
export const STALE_DAYS = 90;

export async function getPriceRows(): Promise<PriceRow[]> {
  const [prices, providers] = await Promise.all([getCollection('prices'), getCollection('providers')]);
  const byId = new Map(providers.map((p) => [p.id, p.data]));
  const now = Date.now();

  return prices.flatMap((p) => {
    const provider = byId.get(p.data.provider.id);
    if (!provider) return [];
    return [
      {
        examId: p.data.exam.id,
        amount: p.data.amount,
        kind: p.data.kind,
        subdivision: p.data.subdivision,
        providerName: provider.name,
        providerWebsite: provider.website,
        sourceUrl: p.data.sourceUrl,
        verifiedAt: p.data.verifiedAt,
        note: p.data.note,
        stale: (now - p.data.verifiedAt.getTime()) / 86_400_000 > STALE_DAYS,
      },
    ];
  });
}
