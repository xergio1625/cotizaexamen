import type { APIRoute, GetStaticPaths } from 'astro';
import { getOfferIndex } from '../../../lib/prices';

/**
 * Ofertas de UN examen: /data/ofertas/03-01-045.json
 * El cotizador las pide al elegir el examen, así la página no carga los precios de todos los prestadores.
 */
export const getStaticPaths = (async () => {
  const { byExam } = await getOfferIndex();
  return [...byExam].map(([id, offers]) => ({ params: { id }, props: { offers } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(props.offers), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
