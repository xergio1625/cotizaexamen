/**
 * ÚNICO archivo de configuración del sitio.
 *
 * Para el futuro sitio hermano (.com, mundo hispano) se copia el repositorio
 * y se cambia solo este archivo: país, dominio, moneda, módulos activos y firma.
 * Ningún otro archivo debería contener "Chile", "CLP" ni "cotizaexamen.cl" fijos.
 */

export interface SiteConfig {
  brand: string;
  tagline: string;
  description: string;
  domain: string;
  /** URL canónica sin barra final. */
  url: string;
  lang: string;
  country: {
    code: string; // ISO 3166-1 alpha-2
    name: string;
    /** Gentilicio/área para textos: "en Chile", "en el mundo hispano". */
    areaLabel: string;
    currency: string; // ISO 4217
    locale: string; // para Intl.NumberFormat
    /** Nombre de la unidad geográfica menor para filtros (comuna, ciudad…). */
    subdivisionLabel: string;
  };
  /** Módulos activos. Un módulo apagado no genera rutas ni enlaces. */
  modules: {
    /** Comparador de precios (solo tiene sentido con país definido). */
    prices: boolean;
    /** Guías de preparación del examen. */
    preparation: boolean;
    /** Opinión: artículos de análisis del autor (precios, metodologías, calidad, derivación). */
    opinion: boolean;
    /** Interpretación de resultados (reservado para el sitio .com; NO activar aquí). */
    interpretation: boolean;
  };
  /** Firma editorial. Cambiar aquí nombre o seudónimo. */
  author: {
    displayName: string;
    credential: string;
    credentials: string[];
    /** Opcional: texto corto de presentación. */
    bio?: string;
  };
  /** Transparencia: relación con otro proyecto del mismo dueño. */
  affiliation: {
    name: string;
    url: string;
  };
  contactEmail?: string;
  social: { ogImage: string };
  /** Verificación de Search Console, si se usa (meta tag). */
  googleSiteVerification?: string;
  /** Token de Cloudflare Web Analytics (sin cookies). Vacío = analítica apagada. */
  cloudflareAnalyticsToken?: string;
}

export const siteConfig: SiteConfig = {
  cloudflareAnalyticsToken: 'a2cc36a47a4f4de6801a6c1d1df995c3',
  brand: 'CotizaExamen',
  tagline: 'Precios y preparación de tus exámenes de laboratorio',
  description:
    'Compara precios de exámenes de laboratorio en Chile y aprende cómo prepararte. Sitio independiente: sin dinero de laboratorios ni clínicas.',
  domain: 'cotizaexamen.cl',
  url: 'https://cotizaexamen.cl',
  lang: 'es-CL',
  country: {
    code: 'CL',
    name: 'Chile',
    areaLabel: 'en Chile',
    currency: 'CLP',
    locale: 'es-CL',
    subdivisionLabel: 'comuna',
  },
  modules: {
    prices: true,
    preparation: true,
    opinion: true,
    interpretation: false,
  },
  author: {
    displayName: 'Sergio Inostroza Riffo',
    credential: 'Tecnólogo Médico',
    /** Formación, mostrada en /sobre-el-sitio/. */
    credentials: [
      'Tecnólogo Médico',
      'Magíster en Gerencia y Gestión en Salud',
      'Diplomado en Gestión de Empresas',
    ],
  },
  affiliation: {
    name: 'Consensus Lab',
    url: 'https://consensuslab.cl',
  },
  contactEmail: 'contacto@cotizaexamen.cl',
  social: { ogImage: '/og-default.svg' },
};
