#!/usr/bin/env python3
"""
Migración única: junta los archivos src/content/prices/<examen>-<prestador>-....json
(uno por precio) en un archivo por prestador: src/content/prices/<prestador>.json.

  python scripts/consolidate-prices.py          # migra y borra los archivos antiguos
  python scripts/consolidate-prices.py --dry    # solo muestra el resumen
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pricefile import from_atoms, to_atoms, write_provider_file  # noqa: E402

PRICES = Path(__file__).resolve().parent.parent / 'src' / 'content' / 'prices'


def main():
    dry = '--dry' in sys.argv
    old_files = sorted(PRICES.glob('*-*-*-*.json'))  # <examen 03-01-002>-<prestador>-...
    by_provider = {}
    for f in old_files:
        rec = json.loads(f.read_text(encoding='utf-8'))
        if 'offers' in rec:
            continue  # ya es un archivo por prestador
        offer = {k: v for k, v in rec.items() if k != 'provider'}
        by_provider.setdefault(rec['provider'], []).append(offer)

    total = 0
    for pid, offers in sorted(by_provider.items()):
        merged = from_atoms(to_atoms(offers))
        total += len(merged)
        print(f'{pid}: {len(offers)} archivos -> {len(merged)} ofertas')
        if not dry:
            write_provider_file(PRICES / f'{pid}.json', pid, merged)
    print(f'{len(old_files)} archivos antiguos -> {len(by_provider)} archivos, {total} ofertas')
    if not dry:
        for f in old_files:
            f.unlink()


if __name__ == '__main__':
    main()
