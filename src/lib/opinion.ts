import { getCollection } from 'astro:content';

export const topicLabels: Record<string, string> = {
  precios: 'Por qué cuesta lo que cuesta',
  metodologia: 'Metodologías',
  calidad: 'Calidad de los resultados',
  derivacion: 'Derivación de muestras',
  urgencia: 'Qué no puede esperar',
  sistema: 'Sistema de salud y órdenes',
  comunicacion: 'Comunicación en salud',
  preparacion: 'Preparación del examen',
  resultados: 'Entender un resultado',
};

/** En desarrollo se ven los borradores (con marca); en producción no se publican. */
export async function getOpinion() {
  const all = await getCollection('opinion', (e) => import.meta.env.DEV || !e.data.draft);
  return all.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
}
