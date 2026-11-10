import type { CollectionEntry } from 'astro:content';

type ExamData = CollectionEntry<'exams'>['data'];

export const fastingLabel = (d: ExamData) =>
  !d.fasting
    ? 'Consulta al prestador'
    : d.fasting.required
      ? `Ayuno${d.fasting.hours ? ` de ${d.fasting.hours} h` : ''}`
      : 'Sin ayuno especial';
