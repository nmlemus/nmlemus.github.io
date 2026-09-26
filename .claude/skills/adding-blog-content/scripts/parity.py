"""Structural parity between a post's en.md and one translation.

Usage: python3 parity.py <slug> <es|pt>
Exit 0 only when every check matches. Run from the repo root.
"""
import re
import sys
from collections import Counter

FIG = re.compile(r'<figure class="diagram">.*?</figure>', re.S)


def facts(md):
    fm, body = md.split('\n---\n', 1)
    prose = FIG.sub('', body)
    code = re.findall(r'```.*?```', prose, re.S)
    text = re.sub(r'```.*?```', '', prose, flags=re.S)
    figs = FIG.findall(body)
    no_labels = [re.sub(r'<(title|desc|figcaption)[^>]*>.*?</\1>', '', f, flags=re.S) for f in figs]
    return {
        'frontmatter date/tags': [l for l in fm.splitlines() if l.startswith(('date:', 'tags:'))],
        'headings per level': Counter(len(h) for h in re.findall(r'^(#{2,4}) ', text, re.M)),
        'table shapes': [(len(t.splitlines()), t.splitlines()[0].count('|')) for t in re.findall(r'(?:^\|.*\|\n)+', text, re.M)],
        'raw html tables': text.count('<table'),
        'code blocks (exact)': code,
        'inline code (exact)': Counter(re.findall(r'`[^`\n]+`', text)),
        'urls': sorted(set(re.findall(r'https?://[^\s)>\]]+', body))),
        # digits only: pt writes 12.000 and 0,5 where en writes 12,000 and 0.5
        'numbers in prose': Counter(re.sub(r'[.,]', '', n) for n in re.findall(r'(?<![\w.])\d+(?:[.,]\d+)*', text)),
        'figures': len(figs),
        'svg geometry (exact)': [re.sub(r'>[^<]*<', '><', f).replace('\n', '') for f in no_labels],
        'escapes (\\$, \\>)': (body.count('\\$'), body.count('\\>')),
    }


def main(slug, lang):
    path = f'src/content/blog/{slug}/'
    en = facts(open(path + 'en.md', encoding='utf-8').read())
    tr = facts(open(path + f'{lang}.md', encoding='utf-8').read())
    ok = True
    for key, value in en.items():
        if value == tr[key]:
            print(f'OK   {key}')
            continue
        ok = False
        print(f'DIFF {key}')
        if isinstance(value, Counter):
            print(f'     only in en: {dict(value - tr[key])} | only in {lang}: {dict(tr[key] - value)}')
        elif key == 'svg geometry (exact)':
            print('     figures with changed markup:', [i for i, (a, b) in enumerate(zip(value, tr[key])) if a != b])
        elif key == 'code blocks (exact)':
            print(f'     en: {len(value)} blocks | {lang}: {len(tr[key])} blocks (or same count, different content)')
        else:
            print(f'     en: {value} | {lang}: {tr[key]}')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
