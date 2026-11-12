"""
Formato de los precios: UN archivo por prestador en src/content/prices/<prestador>.json.

  {
    "provider": "bionet",
    "offers": [
      {"exam": "03-01-002", "amount": 12330, "kind": "particular", "subdivisions": [...], ...},
      ...
    ]
  }

Una oferta por línea para que los cambios se lean bien en git. Módulo compartido por
scripts/import-prices.py y scripts/consolidate-prices.py.
"""
import json
from pathlib import Path

FIELDS = ('exam', 'amount', 'kind', 'subdivision', 'subdivisions', 'sourceUrl', 'verifiedAt', 'note')


def read_provider_file(path):
    """Devuelve la lista de ofertas del archivo, o [] si no existe."""
    p = Path(path)
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding='utf-8'))['offers']


def to_atoms(offers):
    """Desagrupa ofertas a átomos {(examen, tipo, comuna): datos}. La comuna '' = vale para todas."""
    atoms = {}
    for o in offers:
        subs = o.get('subdivisions') or ([o['subdivision']] if o.get('subdivision') else [''])
        for s in subs:
            atoms[(o['exam'], o['kind'], s)] = {
                'amount': o['amount'],
                'sourceUrl': o.get('sourceUrl', ''),
                'verifiedAt': o['verifiedAt'],
                'note': o.get('note', ''),
            }
    return atoms


def from_atoms(atoms):
    """Agrupa átomos idénticos (salvo la comuna) en una sola oferta con `subdivisions`."""
    groups = {}
    for (exam, kind, sub), d in atoms.items():
        key = (exam, kind, d['amount'], d['sourceUrl'], d['verifiedAt'], d['note'])
        groups.setdefault(key, []).append(sub)
    offers = []
    for (exam, kind, amount, src, vd, note), subs in sorted(groups.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2], kv[0][4])):
        subs = sorted(s for s in subs if s)
        rec = {'exam': exam, 'amount': amount, 'kind': kind}
        if len(subs) > 1:
            rec['subdivisions'] = subs
        elif subs:
            rec['subdivision'] = subs[0]
        if src:
            rec['sourceUrl'] = src
        rec['verifiedAt'] = vd
        if note:
            rec['note'] = note
        offers.append(rec)
    return offers


def write_provider_file(path, provider_id, offers):
    lines = ',\n'.join('    ' + json.dumps({k: o[k] for k in FIELDS if k in o}, ensure_ascii=False) for o in offers)
    text = f'{{\n  "provider": {json.dumps(provider_id)},\n  "offers": [\n{lines}\n  ]\n}}\n'
    Path(path).write_text(text, encoding='utf-8')
