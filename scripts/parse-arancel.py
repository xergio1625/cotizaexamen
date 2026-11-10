#!/usr/bin/env python3
"""
Extrae el GRUPO 03 (Exámenes de laboratorio) del Libro Arancel MLE de FONASA.

Uso:
  pdftotext -layout 1-Libro-Arancel-MLE-2026.pdf arancel.txt
  python scripts/parse-arancel.py arancel.txt src/data/fonasa-mle-2026.json

Salida: lista JSON con id, code, official, name, section y levels (nivel 1-3: total y benef).
Fuente: FONASA, "Arancel de Prestaciones de Salud año 2026, Modalidad Libre Elección".
"""
import json
import re
import sys
from collections import Counter

SECTIONS = {
    'I': 'Sangre, hematología',
    'II': 'Sangre, exámenes bioquímicos',
    'III': 'Hormonas',
    'IV': 'Genética',
    'V': 'Inmunología',
    'VI': 'Exámenes microbiológicos',
    'VII': 'Procedimientos o determinaciones directamente con el paciente',
    'VIII': 'Deposiciones, exudados, secreciones y otros líquidos',
    'IX': 'Orina',
}

# Siglas que deben conservar mayúsculas al pasar a "formato oración".
KEEP = {
    'ADN', 'ARN', 'IGA', 'IGE', 'IGG', 'IGM', 'ASO', 'VIH', 'HIV', 'VDRL', 'HBS', 'HLA', 'ANA', 'ENA',
    'ANCA', 'CMV', 'EBV', 'TORCH', 'ELISA', 'PCR', 'TGP', 'TGO', 'GGT', 'LDH', 'CPK', 'PSA', 'HCG', 'FSH',
    'LH', 'AFP', 'CEA', 'PTH', 'ACTH', 'VHS', 'HDL', 'LDL', 'VLDL', 'DHEA', 'BNP', 'INR', 'ADA', 'ECA',
    'HPV', 'VPH', 'TSH', 'RH', 'RHD', 'AB0', 'HTLV', 'IFI', 'ECG', 'ANTI', 'RN', 'R.N.', 'PTT', 'TTPA',
}

num = r'\d{1,3}(?:\.\d{3})*'
re_code = re.compile(r'^(\d\d \d\d \d{3})\s+(.*)$')
re_nums = re.compile(r'^(.*?)\s{2,}((?:' + num + r'\s+)*' + num + r')\s*$')
re_sec = re.compile(r'^\s*(I|II|III|IV|V|VI|VII|VIII|IX)\.-\s*(.*)$')


def money(s):
    return int(s.replace('.', ''))


def nice_case(text):
    """MAYÚSCULAS -> formato oración, conservando siglas, números romanos y tokens con dígitos."""
    def fix(tok):
        core = re.sub(r'^[^\wÁÉÍÓÚÑ]+|[^\wÁÉÍÓÚÑ]+$', '', tok)
        if not core:
            return tok
        if core in KEEP or re.fullmatch(r'[IVXL]+', core) and len(core) > 1:
            return tok
        if re.search(r'\d', core) and core.upper() == core:
            return tok  # A1C, B12, T4
        if core in ('C/U', 'C/S'):
            return tok
        if not re.search(r'[AEIOUÁÉÍÓÚ]', core) and len(core) >= 2:
            return tok  # sigla sin vocales
        return tok.lower()

    out = ' '.join(fix(t) for t in text.split(' '))
    return out[:1].upper() + out[1:]


def short_name(official):
    """Quita aclaraciones entre paréntesis muy largas; deja el nombre corto."""
    s = official
    while True:
        m = re.search(r'\(([^()]*)\)', s)
        if not m:
            break
        if len(m.group(1)) > 30 or m.group(1).upper().startswith(('INCLUYE', 'NO INCLUYE', 'EN CASO')):
            s = s[: m.start()] + s[m.end():]
        else:
            s = s[: m.start()] + '\u0000' + m.group(1) + '\u0001' + s[m.end():]
    s = s.replace('\u0000', '(').replace('\u0001', ')')
    # paréntesis sin cerrar (nota truncada): cortar ahí
    if s.count('(') > s.count(')'):
        s = s[: s.rfind('(')]
    s = re.sub(r'\s+', ' ', s)
    s = re.sub(r'\s+([,;.])', r'\1', s).strip(' ,.;-')
    return s or official


def main(src_path, out_path):
    text = open(src_path, encoding='utf-8-sig').read()
    i, j = text.index('GRUPO : 03'), text.index('GRUPO : 04')
    lines = text[i:j].split('\n')

    recs, cur, section, anomalies = [], None, None, []

    def attach(rec, nums):
        vals = [money(x) for x in nums.split()]
        if len(vals) not in (2, 4, 6):
            anomalies.append((rec['code'], vals))
            return
        rec['levels'] = {str(k + 1): {'total': vals[2 * k], 'benef': vals[2 * k + 1]} for k in range(len(vals) // 2)}

    for ln in lines:
        s = ln.rstrip()
        if not s.strip():
            continue
        if re.match(r'^\s*(NIVEL 1|CÓDIGO|PRESTC)', s) or 'DENOMINACIÓN' in s:
            continue
        if s.strip().startswith('GRUPO') or s.strip() == 'EXAMENES DE LABORATORIO':
            continue
        ms = re_sec.match(s)
        if ms and not re_code.match(s):
            section = SECTIONS[ms.group(1)]
            continue
        mc = re_code.match(s)
        if mc:
            code, rest = mc.group(1), mc.group(2)
            cur = {'code': code, 'official': '', 'section': section, 'levels': None}
            mn = re_nums.match(rest)
            if mn:
                cur['official'] = mn.group(1).strip()
                attach(cur, mn.group(2))
            else:
                cur['official'] = rest.strip()
            recs.append(cur)
        elif cur is not None:
            body = s.strip()
            mn = re.match(r'^(.*?)\s{2,}((?:' + num + r'\s+)*' + num + r')\s*$', body)
            if mn and cur['levels'] is None:
                cur['official'] += ' ' + mn.group(1).strip()
                attach(cur, mn.group(2))
            else:
                cur['official'] += ' ' + body

    out = []
    for r in recs:
        r['official'] = re.sub(r'\s+', ' ', r['official']).strip()
        assert r['levels'], f"sin valores: {r['code']}"
        for lv in r['levels'].values():
            assert 0 < lv['total'] and lv['benef'] <= lv['total'], r['code']
        out.append({
            'id': r['code'].replace(' ', '-'),
            'code': r['code'],
            'official': r['official'],
            'name': nice_case(short_name(r['official'])),
            'section': r['section'],
            'levels': r['levels'],
        })

    assert not anomalies, anomalies
    assert len({r['id'] for r in out}) == len(out), 'códigos duplicados'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('exámenes:', len(out))
    print('con niveles:', Counter(len(r['levels']) for r in out))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
