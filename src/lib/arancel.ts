import { getCollection } from 'astro:content';
import info from '../data/examen-info.json';

/** Datos opcionales por examen (src/data/examen-info.json). */
export interface ExamInfo {
  /** Examen que no admite demora. */
  urgente?: { nota: string };
  /** Estabilidad de la muestra. `derivable`: true si puede tomarse en una ciudad y procesarse en otra. */
  estabilidad?: { texto: string; derivable?: boolean };
}
const infoById = info as unknown as Record<string, ExamInfo>;

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
  /** Examen que FONASA no valoriza (catálogo propio, id "sf-..."). */
  noFonasa: boolean;
  slug: string;
  /** Slug de la guía de preparación, si existe. */
  guide?: string;
  fasting?: { required: boolean; hours?: number };
  urgent?: { note: string };
  stability?: { text: string; derivable?: boolean };
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
        noFonasa: i.id.startsWith('sf-'),
        slug: slugOf(i.id, i.data.name),
        guide: g?.id,
        fasting: g?.data.fasting,
        urgent: infoById[i.id]?.urgente ? { note: infoById[i.id].urgente!.nota } : undefined,
        stability: infoById[i.id]?.estabilidad
          ? { text: infoById[i.id].estabilidad!.texto, derivable: infoById[i.id].estabilidad!.derivable }
          : undefined,
      } satisfies ArancelItem;
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export const fastingText = (f?: ArancelItem['fasting']) =>
  !f ? 'Consulta al prestador' : f.required ? `Ayuno${f.hours ? ` de ${f.hours} h` : ''}` : 'Sin ayuno especial';
