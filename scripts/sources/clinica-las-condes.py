#!/usr/bin/env python3
"""
Convierte el arancel de laboratorio de Clínica Las Condes (CLC) en un CSV para scripts/import-prices.py.

Columnas del PDF: Cod. Fonasa | Valor Público (Amb, Hosp) | Valor Fonasa (Amb, Hosp) | Valor Referencial ISAPRE.
Se usa el VALOR PÚBLICO AMBULATORIO (horario hábil). Reglas de calidad:
  * Verificación cruzada: el "Valor Fonasa Amb" debe coincidir con algún nivel del arancel MLE; si no, se descarta.
  * Un mismo código FONASA puede tener varias filas internas de CLC (variantes: otro líquido, recién nacido,
    etc.) con precios distintos. Si las variantes no coinciden en precio, el código es ambiguo y se omite,
    para no atribuir a un examen el precio de otra variante.

Uso:
  pdftotext -layout Aranceles-Web-CLC-Laboratorio-AAAAMMDD.pdf clc.txt
  python scripts/sources/clinica-las-condes.py clc.txt salida.csv --verified 2026-11-09
  python scripts/import-prices.py salida.csv

Fuente pública: https://www.clinicalascondes.cl/INFORMACION-AL-PACIENTE/Aranceles
"""
import argparse
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
# Decisión editorial para códigos con variantes de precio distintas: se elige la fila que equivale a la
# definición oficial del código FONASA (no la variante de otra muestra, edad o técnica).
#  - 03-01-045 Hemograma: la definición FONASA incluye VHS -> "HEMOGRAMA Y VHS".
#  - 03-02-047 Glucosa en sangre -> la glicemia estándar, no capilar, post carga ni HOMA.
#  - 03-03-024 TSH -> la de adulto, no la neonatal.
#  - 03-01-041 Hemoglobina glicada A1C -> venosa, no capilar.
PREFER = {
    '03-01-045': 'HEMOGRAMA Y VHS',
    '03-02-047': 'GLUCOSA (GLICEMIA)',
    '03-03-024': 'TSH TIROESTIMULANTE',
    '03-01-041': 'HEMOGLOBINA GLICOSILADA',
}
num = r'(\d[\d.]*|-)'
re_row = re.compile(r'^\s*(\w{9,12})\s+(\d+)\s+(.*?)\s{2,}(\d{6,7})\s+' + r'\s+'.join([num] * 6) + r'\s*$')


def money(s):
    return None if s == '-' else int(s.replace('.', ''))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('txt')
    ap.add_argument('out')
    ap.add_argument('--verified', required=True)
    ap.add_argument('--arancel', default=str(ROOT / 'src' / 'data' / 'fonasa-mle-2026.json'))
    a = ap.parse_args()

    catalog = {r['id']: r for r in json.load(open(a.arancel, encoding='utf-8'))}
    by_code = defaultdict(list)
    for ln in open(a.txt, encoding='utf-8-sig'):
        m = re_row.match(ln.rstrip())
        if not m:
            continue
        digits = m.group(4).zfill(7)
        if not digits.startswith('03'):
            continue
        pub, fon = money(m.group(5)), money(m.group(7))
        if pub is None or fon is None or pub <= 0:
            continue
        cid = f'{digits[:2]}-{digits[2:4]}-{digits[4:]}'
        by_code[cid].append((m.group(3).strip(), pub, fon))

    out, no_catalog, bad_fonasa, ambiguous = {}, 0, [], []
    for cid, rows in by_code.items():
        if cid not in catalog:
            no_catalog += 1
            continue
        levels = {l['total'] for l in catalog[cid]['levels'].values()}
        rows = [r for r in rows if r[2] in levels]
        if not rows:
            bad_fonasa.append(cid)
            continue
        prices = {r[1] for r in rows}
        if len(prices) > 1 and cid in PREFER:
            chosen = [r for r in rows if r[0].upper() == PREFER[cid]]
            if len(chosen) == 1:
                prices = {chosen[0][1]}
        if len(prices) > 1:
            ambiguous.append((cid, sorted(prices)))
            continue
        out[cid] = prices.pop()

    print(f'{len(out)} exámenes verificados; {len(ambiguous)} ambiguos omitidos; '
          f'{len(bad_fonasa)} sin coincidencia FONASA; {no_catalog} fuera del catálogo', file=sys.stderr)

    with open(a.out, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['exam_code', 'provider_id', 'provider_name', 'provider_kind', 'provider_website', 'subdivision',
                    'amount', 'kind', 'source_url', 'verified_at', 'note'])
        for cid in sorted(out):
            w.writerow([cid, 'clinica-las-condes', 'Clínica Las Condes', 'clinica', 'https://www.clinicalascondes.cl',
                        'Las Condes', out[cid], 'particular',
                        'https://www.clinicalascondes.cl/INFORMACION-AL-PACIENTE/Aranceles', a.verified,
                        'Valor público ambulatorio, arancel 08-09-2026, horario hábil (8:00 a 20:00; sábados 8:00 a 14:00). '
                        'Recargo de 20% en urgencias y 50% en hospitalización fuera de horario'])


if __name__ == '__main__':
    main()
