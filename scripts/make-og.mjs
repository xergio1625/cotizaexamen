// Genera las imágenes para compartir (1200x630 PNG): una por defecto y una por artículo de Opinión.
// Uso: node scripts/make-og.mjs   (vuelve a ejecutarlo si cambias un título o una ilustración)
// Los PNG se commitean: así el build no depende de las fuentes del servidor.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml');
const W = 1200, H = 630;
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif";
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function wrap(text, max) {
  const lines = [];
  let cur = '';
  for (const w of text.split(/\s+/)) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

const brand = `<text x="60" y="84" font-family="${FONT}" font-size="40" font-weight="700" fill="#2f4638">Cotiza<tspan fill="#a4533c">Examen</tspan></text>`;
const bg = `<rect width="${W}" height="${H}" fill="#fbfaf6"/><rect width="${W}" height="14" fill="#4f6f5c"/><rect x="${W - 300}" width="300" height="14" fill="#c9806a"/>`;

async function render(svg, out) {
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(out);
  console.log('✓', out);
}

// Imagen por defecto
await render(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${bg}
  <circle cx="990" cy="340" r="190" fill="#dde8db"/><circle cx="1070" cy="250" r="90" fill="#f7e3dc"/>
  <text x="70" y="290" font-family="${FONT}" font-size="104" font-weight="700" fill="#2f4638">Cotiza<tspan fill="#a4533c">Examen</tspan></text>
  <text x="74" y="372" font-family="${FONT}" font-size="40" fill="#24332a">Precios y preparación de tus</text>
  <text x="74" y="424" font-family="${FONT}" font-size="40" fill="#24332a">exámenes de laboratorio</text>
  <text x="74" y="548" font-family="${FONT}" font-size="30" fill="#566459">cotizaexamen.cl · Sitio independiente</text></svg>`,
  'public/og-default.png',
);

// Una por artículo de Opinión
const dir = 'src/content/opinion';
for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
  const raw = readFileSync(`${dir}/${f}`, 'utf8').replace(/\r\n/g, '\n');
  const fm = yaml.load(raw.split('\n---\n')[0].replace(/^---\n/, ''));
  const slug = f.replace(/\.md$/, '');
  let size = 48, lines = wrap(fm.title, 21);
  if (lines.length > 5) { size = 40; lines = wrap(fm.title, 26); }
  const title = lines.map((l, i) => `<text x="60" y="${190 + i * (size + 16)}" font-family="${FONT}" font-size="${size}" font-weight="700" fill="#24332a">${esc(l)}</text>`).join('');

  let art = '';
  if (fm.image) {
    let svg = readFileSync(`public${fm.image}`, 'utf8');
    // Versión estática: sin animaciones y con todo visible.
    svg = svg.replaceAll('system-ui,sans-serif', "'Segoe UI',Arial,sans-serif").replace('<style>', '<style>*{animation:none!important;opacity:1!important;stroke-dashoffset:0!important}');
    const hero = await sharp(Buffer.from(svg), { density: 216 }).resize(540, 243).png().toBuffer();
    art = hero;
  }
  const base = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${bg}${brand}
    <rect x="60" y="106" width="64" height="5" rx="2" fill="#c9806a"/>${title}
    <text x="60" y="590" font-family="${FONT}" font-size="26" fill="#566459">Opinión · cotizaexamen.cl</text>
    <rect x="${W - 600}" y="${H / 2 - 135}" width="560" height="270" rx="22" fill="#f1f5ee" stroke="#d9e1d5" stroke-width="3"/></svg>`,
  );
  let img = sharp(base);
  if (art) img = img.composite([{ input: art, left: W - 590, top: Math.round(H / 2 - 121) }]);
  await img.png({ compressionLevel: 9 }).toFile(`public/img/og/${slug}.png`);
  console.log('✓ public/img/og/' + slug + '.png');
}
