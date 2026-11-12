#!/usr/bin/env python3
"""
Importa precios de prestadores desde un CSV (editable en Excel) y genera los JSON del sitio:
un archivo por prestador en src/content/prices/<prestador>.json (ver scripts/pricefile.py).

Uso:
  python scripts/import-prices.py precios.csv                 # escribe en src/content
  python scripts/import-prices.py precios.csv --out otra/ruta # carpeta alternativa (pruebas)
  python scripts/import-prices.py precios.csv --check         # solo valida, no escribe
  python scripts/import-prices.py precios.csv --replace       # reemplaza TODAS las ofertas de los prestadores del CSV

Por defecto se combina con lo ya cargado: un precio del CSV (mismo examen, tipo y comuna) pisa al
anterior y el resto de las ofertas del prestador se conserva. Con --replace el CSV es la lista completa.

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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pricefile import from_atoms, read_provider_file, to_atoms, write_provider_file

ROOT = Path(__file__).resolve().parent.parent
KINDS_PROVIDER = {'laboratorio', 'clinica', 'centro-medico', 'otro'}
KINDS_PRICE = {'particular', 'convenio', 'promocion'}
REQUIRED = ['exam_code', 'provider_id', 'provider_name', 'provider_kind', 'amount', 'kind', 'source_url', 'verified_at']


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def norm_code(raw):
    if re.fullmatch(r'sf-[a-z0-9-]+', raw.strip()):  # examen sin código FONASA (src/data/examenes-sin-fonasa.json)
        return raw.strip()
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
    ap.add_argument('--replace', action='store_true')
    a = ap.parse_args()

    valid_codes = {r['id'] for r in json.load(open(a.arancel, encoding='utf-8'))}
    extra = ROOT / 'src' / 'data' / 'examenes-sin-fonasa.json'
    if extra.exists():
        valid_codes |= {r['id'] for r in json.load(open(extra, encoding='utf-8'))}
    errors, providers, atoms = [], {}, {}
    seen = set()

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

            dup = (code, pid, row['kind'], sub)
            if dup in seen:
                errors.append(f'fila {n}: precio duplicado (mismo examen, prestador, tipo y comuna)')
                continue
            seen.add(dup)
            atoms.setdefault(pid, {})[(code, row['kind'], sub)] = {
                'amount': int(row['amount']),
                'sourceUrl': row['source_url'],
                'verifiedAt': row['verified_at'],
                'note': row.get('note', ''),
            }

    if errors:
        print('ERRORES, no se escribió nada:')
        print('\n'.join(' - ' + e for e in errors))
        sys.exit(1)

    print(f'{sum(len(a) for a in atoms.values())} precios (por comuna) de {len(providers)} prestadores: OK')
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
        prev = out / 'providers' / f'{pid}.json'
        if prev.exists():
            old = json.loads(prev.read_text(encoding='utf-8'))
            for k in ('regionalOnly', 'fonasaLevel'):  # datos editoriales: se conservan al reimportar
                if old.get(k):
                    rec[k] = old[k]
        (out / 'providers' / f'{pid}.json').write_text(json.dumps(rec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for pid, new_atoms in atoms.items():
        path = out / 'prices' / f'{pid}.json'
        merged = {} if a.replace else to_atoms(read_provider_file(path))
        merged.update(new_atoms)
        write_provider_file(path, pid, from_atoms(merged))
        print(f'  {pid}: {len(from_atoms(merged))} ofertas en total')
    print(f'Escrito en {out}')


if __name__ == '__main__':
    main()
