import { getCollection } from 'astro:content';

export interface Level {
  total: number;
  benef: number;
}

export interface ArancelItem {
  id: string; // "03-01-045"
  code: string; // "03 01 045"
  name: string;
  official: string;
  section: string;
  levels: Partial<Record<'1' | '2' | '3', Level>>;
  slug: string;
  /** Slug de la guía de preparación, si existe. */
  guide?: string;
  fasting?: { required: boolean; hours?: number };
}

export const LEVELS = ['1', '2', '3'] as const;

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function slugOf(id: string, name: string) {
  let base = slugify(name);
  if (base.length > 50) base = base.slice(0, 50).replace(/-[^-]*$/, '');
  return `${base}-${id.replaceAll('-', '')}`;
}

/** Catálogo completo (oficial FONASA), enlazado con las guías publicadas. */
export async function getArancel(): Promise<ArancelItem[]> {
  const [items, guides] = await Promise.all([
    getCollection('arancel'),
    getCollection('exams', (e) => !e.data.draft),
  ]);
  const guideByCode = new Map(guides.map((g) => [g.data.fonasa.id, g]));

  return items
    .map((i) => {
      const g = guideByCode.get(i.id);
      return {
        id: i.id,
        code: i.data.code,
        name: i.data.name,
        official: i.data.official,
        section: i.data.section,
        levels: i.data.levels,
        slug: slugOf(i.id, i.data.name),
        guide: g?.id,
        fasting: g?.data.fasting,
      } satisfies ArancelItem;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export const fastingText = (f?: ArancelItem['fasting']) =>
  !f ? 'Consulta al prestador' : f.required ? `Ayuno${f.hours ? ` de ${f.hours} h` : ''}` : 'Sin ayuno especial';
