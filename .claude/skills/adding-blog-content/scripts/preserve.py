"""Check that an edited post kept every fact of a previous version (default: git HEAD).

Usage: python3 preserve.py <slug> [lang=en] [git-ref=HEAD]
Reports lost code, URLs, numbers, figures and heading changes. Exit 1 if anything was lost.
Losses the owner explicitly asked for are fine: say so in the report instead of hiding them.
Run from the repo root.
"""
import re
import subprocess
import sys
from collections import Counter

FIG = re.compile(r'<figure class="diagram">.*?</figure>', re.S)


def parts(md):
    body = md.split('\n---\n', 1)[1]
    figs = FIG.findall(body)
    prose = FIG.sub('', body)
    code = re.findall(r'```.*?```', prose, re.S)
    return figs, code, re.sub(r'```.*?```', '', prose, flags=re.S)


def numbers(text):
    return Counter(re.findall(r'\d{4}-\d{2}-\d{2}|(?<![\w.])\d+(?:[.,]\d+)*', text.replace('\\', '')))


def main(slug, lang='en', ref='HEAD'):
    path = f'src/content/blog/{slug}/{lang}.md'
    old = subprocess.run(['git', 'show', f'{ref}:{path}'], capture_output=True, text=True, check=True).stdout
    new = open(path, encoding='utf-8').read()
    ofigs, ocode, oprose = parts(old)
    nfigs, ncode, nprose = parts(new)
    problems = []

    if ocode != ncode:
        problems.append('fenced code blocks changed')
    lost_inline = Counter(re.findall(r'`[^`\n]+`', oprose)) - Counter(re.findall(r'`[^`\n]+`', nprose))
    if lost_inline:
        problems.append(f'inline code lost: {dict(lost_inline)}')
    url = r'https?://[^\s)>\]]+'
    lost_urls = set(re.findall(url, old)) - set(re.findall(url, new))
    if lost_urls:
        problems.append(f'urls lost: {sorted(lost_urls)}')
    lost_numbers = numbers(oprose) - numbers(nprose)
    if lost_numbers:
        problems.append(f'numbers lost from prose/tables: {dict(lost_numbers)}')
    title = lambda f: (re.search(r'<title[^>]*>(.*?)</title>', f, re.S) or re.search('', '')).group(0)
    if [title(f) for f in ofigs] != [title(f) for f in nfigs]:
        problems.append('figures missing or reordered')
    if any('\n\n' in f for f in nfigs):
        problems.append('blank line inside a figure (ends the Markdown HTML block, breaks the SVG)')
    oh = Counter(re.findall(r'^(#{2,4}) ', oprose, re.M))
    nh = Counter(re.findall(r'^(#{2,4}) ', nprose, re.M))
    if oh != nh:
        problems.append(f'headings per level changed: {dict(oh)} -> {dict(nh)}')

    print(f'words: {len(oprose.split())} -> {len(nprose.split())} | numbers added: {dict(numbers(nprose) - numbers(oprose))}')
    print('\n'.join('PROBLEM: ' + p for p in problems) or 'OK: facts, URLs, code and figures preserved')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    if not 2 <= len(sys.argv) <= 4:
        sys.exit(__doc__)
    main(*sys.argv[1:])
