#!/usr/bin/env python3
"""
Convierte el "Catálogo de prestaciones" (arancel ambulatorio) de Clínica Bupa Santiago en un CSV
para scripts/import-prices.py. Solo toma exámenes de laboratorio (códigos FONASA grupo 03) que
existan en nuestro catálogo, con el valor PARTICULAR HÁBIL (que la clínica define como "valor máximo
por prestación").

Uso:
  pdftotext -layout cbs_ambulatorio.pdf bupa.txt
  python scripts/sources/bupa-santiago.py bupa.txt salida.csv --verified 2026-11-09
  python scripts/import-prices.py salida.csv

Fuente pública: https://www.clinicabupasantiago.cl/informaciones/nuestros-aranceles
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
re_code = re.compile(r'^\s*(\d{6,7})(?:\s|$)')
re_price = re.compile(r'\$\s*(\d{1,3}(?:\.\d{3})*)\s*$')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('txt')
    ap.add_argument('out')
    ap.add_argument('--verified', required=True, help='AAAA-MM-DD: fecha en que se consultó el documento')
    ap.add_argument('--arancel', default=str(ROOT / 'src' / 'data' / 'fonasa-mle-2026.json'))
    a = ap.parse_args()

    valid = {r['id'] for r in json.load(open(a.arancel, encoding='utf-8'))}
    seen, conflicts, skipped_multi = {}, [], 0
    buf = []  # códigos vistos desde el último precio

    for ln in open(a.txt, encoding='utf-8-sig'):
        mc = re_code.match(ln)
        if mc:
            buf.append(mc.group(1))
        mp = re_price.search(ln.rstrip())
        if mp:
            price = int(mp.group(1).replace('.', ''))
            codes, buf = buf, []
            if len(codes) != 1:
                skipped_multi += 1 if codes else 0
                continue
            digits = codes[0].zfill(7)
            if not digits.startswith('03'):
                continue
            cid = f'{digits[:2]}-{digits[2:4]}-{digits[4:]}'
            if cid not in valid:
                continue
            if cid in seen and seen[cid] != price:
                conflicts.append((cid, seen[cid], price))
            seen.setdefault(cid, price)

    if conflicts:
        print('CONFLICTOS (mismo código, precios distintos); se conserva el primero:', conflicts[:10], file=sys.stderr)

    with open(a.out, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['exam_code', 'provider_id', 'provider_name', 'provider_kind', 'provider_website', 'subdivision',
                    'amount', 'kind', 'source_url', 'verified_at', 'note'])
        for cid in sorted(seen):
            w.writerow([cid, 'clinica-bupa-santiago', 'Clínica Bupa Santiago', 'clinica',
                        'https://www.clinicabupasantiago.cl', 'La Florida', seen[cid], 'particular',
                        'https://www.clinicabupasantiago.cl/informaciones/nuestros-aranceles', a.verified,
                        'Catálogo de prestaciones 2026, valor particular máximo, horario hábil'])
    print(f'{len(seen)} exámenes de laboratorio extraídos; {skipped_multi} bloques ambiguos omitidos')


if __name__ == '__main__':
    main()
