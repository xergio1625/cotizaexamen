#!/usr/bin/env python3
"""
Convierte el "Catálogo de prestaciones" (arancel ambulatorio) de Clínica Bupa Santiago en un CSV
para scripts/import-prices.py. Solo toma exámenes de laboratorio (códigos FONASA grupo 03) que
existan en nuestro catálogo, con el valor PARTICULAR HÁBIL (que la clínica define como "valor máximo
por prestación").

Uso:
  pdftotext -layout cbs_ambulatorio.pdf bupa.txt
  python scripts/sources/bupa.py bupa.txt salida.csv --clinic santiago --verified 2026-11-09
  python scripts/import-prices.py salida.csv

Fuente pública: https://www.clinicabupasantiago.cl/informaciones/nuestros-aranceles
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

# Clínicas Bupa que publican el mismo "Catálogo de prestaciones" (valor particular máximo, horario hábil).
CLINICS = {
    'santiago': dict(id='clinica-bupa-santiago', name='Clínica Bupa Santiago', subdivision='La Florida',
                     website='https://www.clinicabupasantiago.cl',
                     source='https://www.clinicabupasantiago.cl/informaciones/nuestros-aranceles'),
    'antofagasta': dict(id='clinica-bupa-antofagasta', name='Clínica Bupa Antofagasta', subdivision='Antofagasta',
                        website='https://www.clinicabupaantofagasta.cl',
                        source='https://www.clinicabupaantofagasta.cl/informacion-al-paciente/aranceles'),
    'renaca': dict(id='clinica-bupa-renaca', name='Clínica Bupa Reñaca', subdivision='Viña del Mar',
                   website='https://www.clinicabuparenaca.cl',
                   source='https://www.clinicabuparenaca.cl/informacion-al-paciente/nuestros-aranceles'),
}
ROOT = Path(__file__).resolve().parent.parent.parent
re_code = re.compile(r'^\s*(\d{6,7})(?:\s|$)')
re_price = re.compile(r'\$\s*(\d{1,3}(?:\.\d{3})*)\s*$')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('txt')
    ap.add_argument('out')
    ap.add_argument('--clinic', choices=sorted(CLINICS), default='santiago')
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
        # Un mismo código con precios distintos son variantes (otra muestra o técnica): no se atribuye
        # ninguno de los precios al examen, para no mostrar el de otra variante.
        print('CONFLICTOS omitidos (mismo código, precios distintos):', conflicts[:10], file=sys.stderr)
        for cid, *_ in conflicts:
            seen.pop(cid, None)

    with open(a.out, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['exam_code', 'provider_id', 'provider_name', 'provider_kind', 'provider_website', 'subdivision',
                    'amount', 'kind', 'source_url', 'verified_at', 'note'])
        for cid in sorted(seen):
            c = CLINICS[a.clinic]
            w.writerow([cid, c['id'], c['name'], 'clinica', c['website'], c['subdivision'], seen[cid], 'particular',
                        c['source'], a.verified,
                        'Catálogo de prestaciones 2026, valor particular máximo, horario hábil'])
    print(f'{len(seen)} exámenes de laboratorio extraídos; {skipped_multi} bloques ambiguos omitidos')


if __name__ == '__main__':
    main()
