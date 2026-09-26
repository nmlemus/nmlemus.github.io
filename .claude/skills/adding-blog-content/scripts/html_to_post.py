"""Convert an HTML document (prose + tables + inline SVG figures) into a post's en.md.

Usage: python3 html_to_post.py <source.html> <slug> --date YYYY-MM-DD --tags a,b --description "One sentence."
Needs pandoc. Writes src/content/blog/<slug>/en.md (refuses to overwrite). Run from the repo root.

What it handles (each one broke the first conversion when done naively):
- pandoc to gfm, never to markdown: gfm keeps raw HTML for complex cells; 'markdown' drops them as [TABLE].
- SVG figures are cut out before pandoc and pasted back verbatim, wrapped in the site's diagram card.
- Blank lines inside an SVG end the Markdown HTML block and spill the SVG as text: they are collapsed.
- Placeholders carry an END delimiter so FIG1 never matches inside FIG10.
- Layout-only <div>/<section>, <style>, <script> and the document's own <nav> TOC are dropped
  (the site builds its own TOC from the headings).
- Every '$' becomes '\\$' (currency, not math). If the source has real math, restore it by hand.
The <h1> becomes the title; the source's other header blocks are left in the body for you to edit.
"""
import argparse
import re
import subprocess
from pathlib import Path


def pandoc(html):
    return subprocess.run(['pandoc', '-f', 'html', '-t', 'gfm', '--wrap=none'],
                          input=html, capture_output=True, text=True, check=True).stdout


def figure_card(fig):
    svg = re.search(r'<svg.*?</svg>', fig, re.S).group(0)
    svg = re.sub(r"font-family=\"[^\"]*(?:Mono|mono|Courier)[^\"]*\"", 'font-family="Meslo, Menlo, monospace"', svg)
    svg = re.sub(r'<svg ([^>]*?)style="[^"]*"', r'<svg \1', svg)
    view = re.search(r'viewBox="[\d.]+ [\d.]+ ([\d.]+)', svg)
    if view:  # labels stay legible on phones: the card scrolls instead of shrinking below ~2/3 size
        svg = svg.replace('<svg ', f'<svg style="min-width:{round(float(view.group(1)) * 0.67)}px" ', 1)
    svg = re.sub(r'\n\s*\n', '\n', svg)
    cap = re.search(r'<figcaption[^>]*>(.*?)</figcaption>', fig, re.S)
    caption = f'<figcaption>{cap.group(1).strip()}</figcaption>' if cap else ''
    return f'<figure class="diagram"><div class="diagram-scroll">{svg}</div>{caption}</figure>'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source')
    ap.add_argument('slug')
    ap.add_argument('--date', required=True)
    ap.add_argument('--tags', required=True)
    ap.add_argument('--description', required=True)
    args = ap.parse_args()

    out = Path(f'src/content/blog/{args.slug}/en.md')
    if out.exists():
        raise SystemExit(f'{out} exists; edit it instead of regenerating')
    html = Path(args.source).read_text(encoding='utf-8')
    body = html[html.find('<body'):] if '<body' in html else html
    body = re.sub(r'<(style|script)\b.*?</\1>', '', body, flags=re.S)
    title_m = re.search(r'<h1[^>]*>(.*?)</h1>', body, re.S)
    title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip() if title_m else 'TODO title'
    if title_m:
        body = body.replace(title_m.group(0), '', 1)
    body = re.sub(r'<nav\b.*?</nav>', '', body, flags=re.S)

    figures = []
    def stash(m):
        figures.append(figure_card(m.group(0)))
        return f'<p>FIGUREPLACEHOLDER{len(figures) - 1}END</p>'
    body = re.sub(r'<figure\b.*?</figure>', stash, body, flags=re.S)
    body = re.sub(r'</?(?:section|div|article|main|header|footer|body|html)\b[^>]*>', '', body)

    md = pandoc(body)
    assert '[TABLE]' not in md, 'pandoc dropped a table'
    md = re.sub(r'(?<!\\)\$', r'\\$', md)
    for i, fig in enumerate(figures):
        md = md.replace(f'FIGUREPLACEHOLDER{i}END', '\n' + fig + '\n')
    assert 'FIGUREPLACEHOLDER' not in md, 'unreplaced figure'

    tags = ', '.join(t.strip() for t in args.tags.split(','))
    front = (f'---\ntitle: "{title}"\ndescription: "{args.description}"\n'
             f'date: {args.date}\ntags: [{tags}]\n---\n\n')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(front + md.strip() + '\n', encoding='utf-8')
    print(f'{out}: figures={len(figures)} chars={len(md)}')


if __name__ == '__main__':
    main()
