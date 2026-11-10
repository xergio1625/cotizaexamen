/**
 * Región de cada comuna, para el filtro del cotizador.
 * Se define por comuna (no por prestador) porque un prestador puede tener sedes en varias regiones.
 * Si se carga un precio con una comuna que no está aquí, el cotizador no lo asigna a ninguna región
 * y el build avisa: agrégala a este mapa.
 */
const BY_REGION: Record<string, string[]> = {
  'Arica y Parinacota': ['Arica', 'Putre', 'Camarones', 'General Lagos'],
  'Tarapacá': ['Iquique', 'Alto Hospicio', 'Pozo Almonte', 'Pica'],
  'Antofagasta': ['Antofagasta', 'Calama', 'Mejillones', 'Tocopilla', 'Taltal', 'San Pedro de Atacama'],
  'Atacama': ['Copiapó', 'Vallenar', 'Caldera', 'Chañaral', 'Diego de Almagro'],
  'Coquimbo': ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña', 'Los Vilos', 'Salamanca'],
  'Valparaíso': [
    'Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana', 'Quillota', 'San Antonio', 'Los Andes',
    'San Felipe', 'Limache', 'La Calera', 'Olmué', 'Casablanca', 'Quintero', 'Algarrobo', 'El Quisco', 'Cartagena',
  ],
  'Metropolitana de Santiago': [
    'Santiago', 'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central', 'Huechuraba', 'Independencia',
    'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo',
    'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda', 'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura',
    'Quinta Normal', 'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón', 'Vitacura', 'Puente Alto', 'Pirque',
    'San José de Maipo', 'Colina', 'Lampa', 'Tiltil', 'San Bernardo', 'Buin', 'Calera de Tango', 'Paine', 'Melipilla',
    'Alhué', 'Curacaví', 'María Pinto', 'San Pedro', 'Talagante', 'El Monte', 'Isla de Maipo', 'Padre Hurtado', 'Peñaflor',
  ],
  "O'Higgins": ['Rancagua', 'San Fernando', 'Santa Cruz', 'Machalí', 'Rengo', 'San Vicente', 'Graneros', 'Pichilemu'],
  'Maule': ['Talca', 'Curicó', 'Linares', 'Cauquenes', 'Constitución', 'Parral', 'San Javier', 'Molina'],
  'Ñuble': ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Quirihue'],
  'Biobío': [
    'Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Chiguayante', 'Hualpén', 'Coronel', 'Lota', 'Los Ángeles',
    'Penco', 'Tomé', 'Lebu', 'Cañete', 'Arauco', 'Mulchén', 'Hualqui', 'Nacimiento', 'Cabrero',
  ],
  'La Araucanía': ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Victoria', 'Lautaro', 'Nueva Imperial'],
  'Los Ríos': ['Valdivia', 'La Unión', 'Río Bueno', 'Panguipulli', 'Paillaco', 'Los Lagos'],
  'Los Lagos': ['Puerto Montt', 'Osorno', 'Puerto Varas', 'Castro', 'Ancud', 'Quellón', 'Frutillar', 'Calbuco'],
  'Aysén': ['Coyhaique', 'Puerto Aysén', 'Chile Chico'],
  'Magallanes': ['Punta Arenas', 'Puerto Natales', 'Porvenir'],
};

const key = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const REGION_OF = new Map<string, string>();
for (const [region, comunas] of Object.entries(BY_REGION)) {
  for (const c of comunas) {
    const k = key(c);
    if (REGION_OF.has(k)) throw new Error(`Comuna repetida en regions.ts: ${c}`);
    REGION_OF.set(k, region);
  }
}

export const regionOf = (comuna?: string): string | undefined => (comuna ? REGION_OF.get(key(comuna)) : undefined);
