#!/usr/bin/env python3
"""
Convierte el "Valor prestaciones año 2026" (arancel particular) del Hospital Clínico Universidad de
Chile (HCUCH, redclinica.cl) en un CSV para scripts/import-prices.py.

El PDF trae dos columnas: ARANCEL PARTICULAR y ARANCEL FONASA MLE. La segunda coincide con el
valor total de Nivel 3 de nuestro catálogo FONASA, y se usa como VERIFICACIÓN CRUZADA de que cada
código quedó emparejado con su precio: si no coincide con ningún nivel, la fila se descarta.

Uso:
  pdftotext -layout ARANCEL_PUBLICACION_2026_V5.0.pdf hcuch.txt
  python scripts/sources/hcuch.py hcuch.txt salida.csv --verified 2026-11-09
  python scripts/import-prices.py salida.csv

Fuente pública: https://www.redclinica.cl/informacion-al-paciente/aranceles-2026.aspx
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
re_pair = re.compile(amt + r'\s+\$\s+' + amt + r'\s*$')


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
        particular = int(mp.group(1).replace(',', ''))
        fonasa = int(mp.group(2).replace(',', ''))
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
        levels = {l['total'] for l in catalog[cid]['levels'].values()}
        if fonasa not in levels:
            mismatch.append((cid, fonasa, sorted(levels)))
            continue
        found.setdefault(cid, particular)

    print(f'{len(found)} exámenes verificados contra el arancel FONASA; '
          f'{len(mismatch)} descartados por no coincidir; {ambiguous} bloques ambiguos', file=sys.stderr)
    for m in mismatch[:15]:
        print('  descartado', m, file=sys.stderr)

    with open(a.out, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['exam_code', 'provider_id', 'provider_name', 'provider_kind', 'provider_website', 'subdivision',
                    'amount', 'kind', 'source_url', 'verified_at', 'note'])
        for cid in sorted(found):
            w.writerow([cid, 'hospital-clinico-universidad-de-chile', 'Hospital Clínico Universidad de Chile',
                        'clinica', 'https://www.redclinica.cl', 'Independencia', found[cid], 'particular',
                        'https://www.redclinica.cl/informacion-al-paciente/aranceles-2026.aspx', a.verified,
                        'Arancel particular 2026, horario hábil (8:00 a 20:00; sábados 8:00 a 13:00). '
                        'Fuera de horario o festivos: recargo de 50%'])


if __name__ == '__main__':
    main()
