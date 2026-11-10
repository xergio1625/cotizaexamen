#!/usr/bin/env python3
"""
Importa precios de prestadores desde un CSV (editable en Excel) y genera los JSON del sitio.

Uso:
  python scripts/import-prices.py precios.csv                 # escribe en src/content
  python scripts/import-prices.py precios.csv --out otra/ruta # carpeta alternativa (pruebas)
  python scripts/import-prices.py precios.csv --check         # solo valida, no escribe

Columnas (ver docs/precios-plantilla.csv):
  exam_code         código FONASA, con o sin separadores: 03-02-047, "03 02 047" o 0302047
  provider_id       identificador en minúsculas, sin espacios: laboratorio-ejemplo
  provider_name     nombre visible
  provider_kind     laboratorio | clinica | centro-medico | otro
  provider_website  (opcional) https://...
  subdivision       (opcional) comuna de la sede; vacío = vale para todas
  amount            entero en CLP, sin puntos ni símbolo: 4500
  kind              particular | convenio | promocion
  source_url        OBLIGATORIO: página pública donde se ve el precio
  verified_at       OBLIGATORIO: fecha en que viste el precio, AAAA-MM-DD
  note              (opcional) aclaración breve

Regla editorial: todo precio necesita fuente pública y fecha. Sin acuerdos comerciales.
"""
import argparse
import csv
import json
import re
import sys
import unicodedata
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KINDS_PROVIDER = {'laboratorio', 'clinica', 'centro-medico', 'otro'}
KINDS_PRICE = {'particular', 'convenio', 'promocion'}
REQUIRED = ['exam_code', 'provider_id', 'provider_name', 'provider_kind', 'amount', 'kind', 'source_url', 'verified_at']


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def norm_code(raw):
    digits = re.sub(r'\D', '', raw)
    if len(digits) != 7:
        raise ValueError(f'código FONASA inválido: "{raw}"')
    return f'{digits[:2]}-{digits[2:4]}-{digits[4:]}'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('csv')
    ap.add_argument('--out', default=str(ROOT / 'src' / 'content'))
    ap.add_argument('--arancel', default=str(ROOT / 'src' / 'data' / 'fonasa-mle-2026.json'))
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()

    valid_codes = {r['id'] for r in json.load(open(a.arancel, encoding='utf-8'))}
    errors, providers, prices = [], {}, {}

    with open(a.csv, encoding='utf-8-sig', newline='') as f:
        sample = f.read(4096)
        f.seek(0)
        delim = ';' if sample.count(';') > sample.count(',') else ','  # Excel en español exporta con ;
        reader = csv.DictReader(f, delimiter=delim)
        missing = [c for c in REQUIRED if c not in (reader.fieldnames or [])]
        if missing:
            sys.exit(f'Faltan columnas: {missing}')
        for n, row in enumerate(reader, start=2):
            row = {k: (v or '').strip() for k, v in row.items() if k}
            if not any(row.values()):
                continue
            try:
                for c in REQUIRED:
                    if not row.get(c):
                        raise ValueError(f'falta "{c}"')
                code = norm_code(row['exam_code'])
                if code not in valid_codes:
                    raise ValueError(f'el código {code} no existe en el arancel')
                pid = row['provider_id']
                if pid != slug(pid):
                    raise ValueError(f'provider_id debe ser minúsculas y guiones: "{pid}" -> "{slug(pid)}"')
                if row['provider_kind'] not in KINDS_PROVIDER:
                    raise ValueError(f'provider_kind debe ser uno de {sorted(KINDS_PROVIDER)}')
                if row['kind'] not in KINDS_PRICE:
                    raise ValueError(f'kind debe ser uno de {sorted(KINDS_PRICE)}')
                if not re.fullmatch(r'\d+', row['amount']) or int(row['amount']) <= 0:
                    raise ValueError(f'amount debe ser un entero positivo sin puntos: "{row["amount"]}"')
                if not re.match(r'^https?://', row['source_url']):
                    raise ValueError('source_url debe empezar con http(s)://')
                if row.get('provider_website') and not re.match(r'^https?://', row['provider_website']):
                    raise ValueError('provider_website debe empezar con http(s)://')
                try:
                    vd = date.fromisoformat(row['verified_at'])
                except ValueError:
                    raise ValueError(f'verified_at debe ser AAAA-MM-DD: "{row["verified_at"]}"')
                if vd > date.today():
                    raise ValueError('verified_at está en el futuro')
            except ValueError as e:
                errors.append(f'fila {n}: {e}')
                continue

            prov = providers.setdefault(pid, {'name': row['provider_name'], 'kind': row['provider_kind'], 'subdivisions': set()})
            if prov['name'] != row['provider_name']:
                errors.append(f'fila {n}: provider_id "{pid}" aparece con nombres distintos')
            if row.get('provider_website'):
                prov['website'] = row['provider_website']
            sub = row.get('subdivision', '')
            if sub:
                prov['subdivisions'].add(sub)

            fname = f"{code}-{pid}-{row['kind']}-{slug(sub) or 'todas'}.json"
            if fname in prices:
                errors.append(f'fila {n}: precio duplicado (mismo examen, prestador, tipo y comuna)')
                continue
            rec = {'exam': code, 'provider': pid, 'amount': int(row['amount']), 'kind': row['kind']}
            if sub:
                rec['subdivision'] = sub
            rec['sourceUrl'] = row['source_url']
            rec['verifiedAt'] = row['verified_at']
            if row.get('note'):
                rec['note'] = row['note']
            prices[fname] = rec

    if errors:
        print('ERRORES, no se escribió nada:')
        print('\n'.join(' - ' + e for e in errors))
        sys.exit(1)

    print(f'{len(prices)} precios de {len(providers)} prestadores: OK')
    if a.check:
        return

    out = Path(a.out)
    (out / 'providers').mkdir(parents=True, exist_ok=True)
    (out / 'prices').mkdir(parents=True, exist_ok=True)
    for pid, p in providers.items():
        rec = {'name': p['name'], 'kind': p['kind']}
        if p.get('website'):
            rec['website'] = p['website']
        rec['subdivisions'] = sorted(p['subdivisions'])
        (out / 'providers' / f'{pid}.json').write_text(json.dumps(rec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for fname, rec in prices.items():
        (out / 'prices' / fname).write_text(json.dumps(rec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Escrito en {out}')


if __name__ == '__main__':
    main()
