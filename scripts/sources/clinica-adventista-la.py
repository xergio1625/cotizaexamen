#!/usr/bin/env python3
"""
Convierte el arancel 2026 de Clínica Adventista Los Ángeles (Biobío) en un CSV para scripts/import-prices.py.

El PDF trae FONASA y PARTICULAR. La columna FONASA coincide con el valor total de Nivel 3 del arancel MLE
y se usa como VERIFICACIÓN CRUZADA: si no coincide con el catálogo, la fila se descarta.

Uso:
  pdftotext -layout arancelesclinala2026.pdf adventista.txt
  python scripts/sources/clinica-adventista-la.py adventista.txt salida.csv --verified 2026-11-09
  python scripts/import-prices.py salida.csv

Fuente pública: https://clinicaadventista.cl/informacion_paciente.php
PDF: https://clinicaadventista.cl/assets/images/elements/arancelesclinala2026.pdf
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
re_code = re.compile(r'^\s*(\d{6,7})(?:\s|$)')
amt = r'(\d{1,3}(?:,\d{3})*)'
re_pair = re.compile(amt + r'\s+' + amt + r'\s*$')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('txt')
    ap.add_argument('out')
    ap.add_argument('--verified', required=True)
    ap.add_argument('--arancel', default=str(ROOT / 'src' / 'data' / 'fonasa-mle-2026.json'))
    a = ap.parse_args()

    catalog = {r['id']: r for r in json.load(open(a.arancel, encoding='utf-8'))}
    found, buf, ambiguous, mismatch = {}, [], 0, []

    for ln in open(a.txt, encoding='utf-8-sig'):
        mc = re_code.match(ln)
        if mc:
            buf.append(mc.group(1))
        mp = re_pair.search(ln.rstrip())
        if not mp:
            continue
        fonasa = int(mp.group(1).replace(',', ''))
        particular = int(mp.group(2).replace(',', ''))
        codes, buf = buf, []
        if len(codes) != 1:
            ambiguous += 1 if codes else 0
            continue
        digits = codes[0].zfill(7)
        if not digits.startswith('03'):
            continue
        cid = f'{digits[:2]}-{digits[2:4]}-{digits[4:]}'
        if cid not in catalog:
            continue
        if fonasa not in {l['total'] for l in catalog[cid]['levels'].values()}:
            mismatch.append((cid, fonasa))
            continue
        found.setdefault(cid, particular)

    print(f'{len(found)} exámenes verificados; {len(mismatch)} descartados; {ambiguous} bloques ambiguos', file=sys.stderr)
    for m in mismatch[:10]:
        print('  descartado', m, file=sys.stderr)

    with open(a.out, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['exam_code', 'provider_id', 'provider_name', 'provider_kind', 'provider_website', 'subdivision',
                    'amount', 'kind', 'source_url', 'verified_at', 'note'])
        for cid in sorted(found):
            w.writerow([cid, 'clinica-adventista-los-angeles', 'Clínica Adventista Los Ángeles', 'clinica',
                        'https://clinicaadventista.cl', 'Los Ángeles', found[cid], 'particular',
                        'https://clinicaadventista.cl/assets/images/elements/arancelesclinala2026.pdf', a.verified,
                        'Arancel de exámenes de laboratorio 2026, valor particular'])


if __name__ == '__main__':
    main()
