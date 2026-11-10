/**
 * REGLA DE INDEPENDENCIA
 * El orden de los resultados depende SOLO de precio, comuna/subdivisión o alfabeto.
 * No existe (ni debe existir) un criterio "destacado", "patrocinado" ni "recomendado".
 * El tipo OrderKey impide agregar otro criterio sin modificar este archivo a la vista.
 */
export type OrderKey = 'price' | 'subdivision' | 'alpha';

export interface Orderable {
  amount: number;
  subdivision?: string;
  providerName: string;
}

const collator = new Intl.Collator('es', { sensitivity: 'base' });

export function orderOffers<T extends Orderable>(items: T[], key: OrderKey): T[] {
  const byName = (a: T, b: T) => collator.compare(a.providerName, b.providerName);
  const copy = [...items];
  switch (key) {
    case 'price':
      return copy.sort((a, b) => a.amount - b.amount || byName(a, b));
    case 'subdivision':
      return copy.sort(
        (a, b) =>
          collator.compare(a.subdivision ?? '~', b.subdivision ?? '~') || byName(a, b),
      );
    case 'alpha':
      return copy.sort(byName);
  }
}
