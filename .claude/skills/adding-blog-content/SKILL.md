---
name: adding-blog-content
description: Use when the owner of nmlemus.github.io asks to add, publish, translate, fix or edit a post, article or any content on the blog ("agrega este contenido", "publica este artículo", "add this post", "cambia esta sección"), whether the source is pasted text, a LinkedIn post, a Markdown file or an HTML document.
---

# Adding content to nmlemus.github.io

## Overview

Every post exists in English (primary, unprefixed URL), Spanish (`/es/`) and Portuguese (`/pt/`, Brazilian). The owner's text and facts are the source of truth: you convert, tidy and translate, you do not rewrite the argument or invent anything. Nothing goes live until the owner says so in chat.

Paths below are relative to the repo root. Scripts live in `.claude/skills/adding-blog-content/scripts/` (call them `S/...` here) and run with `python3` / `zsh` from the repo root.

## 1. Intake

1. Read the whole source before touching anything. Run `npm ci` if `node_modules/` is missing.
2. Decide with defaults instead of questions:
   - New post vs. edit: a new post, unless the owner names an existing post or section. If the topic overlaps an existing post, still make it new and mention the overlap in step 6.
   - slug: kebab-case from the English title (`src/content/blog/<slug>/`)
   - `date`: today, unless the owner gives a date. Dates inside the source (a "compiled on" stamp, the original LinkedIn date) are not the publish date.
   - `tags`: 1 to 3, reusing existing ones (`grep -h '^tags:' src/content/blog/*/en.md`), English kebab-case
   - `description`: one sentence summarising the post. It is shown as the subtitle right under the title, so it must not repeat the key idea or the first paragraph word for word.
   - SVG text labels are translated; the source file stays where the owner put it
3. Ask only what you cannot default or infer from the source. If the owner already answered, don't ask again. Collect any remaining doubts for step 6 instead of stopping.

## 2. Write `en.md`

The owner's language wins: if the source is in Spanish, `es.md` is the owner's text (tidied per step 3) and `en.md` is its translation; same for Portuguese. English is still the primary URL.

| Source | How |
|---|---|
| HTML with tables/SVG | `python3 S/html_to_post.py <file.html> <slug> --date … --tags a,b --description "…"` writes `en.md`; then hand-edit the header leftovers at the top (KPIs into a table) |
| Pasted text / LinkedIn / Markdown | write the file in the source's language directly |

Editing an existing post:
- Apply the change to all three files. The owner's wording goes verbatim into the file of the language they wrote it in; translate it for the other two.
- Keep the author's opening key idea first and their closing line last. "Add at the end" goes before the closing line; mention that in step 6.
- Content changes (not typo fixes) get `updated: <today>` in all three frontmatters.
- Leave other text untouched, including older number formats.

A "key idea" / "idea clave" / thesis line in any source goes first, as a blockquote: `> **Key idea:** …` (`> **Idea clave:** …`, `> **Ideia-chave:** …`), wording unchanged.

Markdown rules (the build or the reader breaks otherwise):
- Frontmatter: `title`, `description`, `date`, `tags`, optional `updated`, optional `draft: true` (keeps it off the site).
- The title is the page's h1: body headings start at `##` and never skip a level.
- Currency is `\$5`; bare `$` is math (`$x$`, `$$…$$`, KaTeX).
- Diagrams: `<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:<⅔ of viewBox width>px" …>…</svg></div><figcaption>…</figcaption></figure>`, no blank line anywhere inside. The card is white, so keep the SVG's own colours.
- Images (none used yet): `public/img/blog/<slug>/name.png`, referenced as `/img/blog/<slug>/name.png`; confirm `npm run verify` passes.

## 3. Editorial pass (faithful, not creative)

- Remove AI-writing tells and document metadata: colophons, "compiled on…", "generated with AI" footers, emoji bullets, em-dash floods, filler. List every removal in step 6 so the owner can put one back. If your harness has the `humanizer` skill, use it only to spot tells; skip its "add voice/opinions" rewriting, because this pass is faithful.
- Keep the author's own framing (key idea, thesis, first-person notes) word for word. If you think one should go, ask; deleting one got it restored on request.
- A table, figure or analogy that appears with no sentence tying it to the text around it gets a short lead-in, and a connecting line if the next section doesn't follow from it. If an analogy has stages, say what each stage is in the real system.
- Bridges restate or point ("Two metrics separate them:"); they don't conclude. No new numbers, sources, quotes or claims. List every sentence you added in step 6.

## 4. Translate the other two languages yourself

Natural, not literal. Identical across the three files: `date`, `tags`, code blocks, inline code, URLs, numbers' digits, `\$` escapes, heading levels, table shapes and SVG geometry. Translate the title, description, prose, SVG `<text>`, `<title>`, `<desc>` and `<figcaption>`. Keep common English terms (embeddings, chunking, reranker) and one glossary per post.

Numbers: EN and ES use the source's separators (the owner writes `12,000` and `0.5`); PT uses Brazilian ones (`12.000`, `0,5`). Keep a currency sign as the source wrote it; don't guess its currency.

## 5. Verify: all must pass

```bash
python3 S/parity.py <slug> es && python3 S/parity.py <slug> pt   # every line OK
python3 S/preserve.py <slug> <lang>   # existing posts only (compares with git HEAD), for each language touched
npm test && npm run build && npm run verify
```
Then look at it: `python3 -m http.server 8767 -d dist >/dev/null 2>&1 & echo $!` (note the PID), then `zsh S/shot.sh http://localhost:8767/blog/<slug>/ <tmpdir>/en.png 1280 900` (and `/es/…`, `/pt/…`), writing PNGs outside the repo, and read them. Make the height tall enough to include the part you changed. Headless Chrome won't lay out narrower than ~500px, so a 390px shot looks clipped even on the live site. Compare with the live page before blaming your change. When done, `kill <PID>`. If port 8767 is taken, pick another; never kill a process you didn't start.

After any fix, run all of step 5 again.

## 6. Show the owner and wait

Write to the owner in their language:
- where the post will live (three URLs)
- the sentences you added and the lines you removed
- open doubts: overlap with an existing post, anything a reader could see as inconsistent with the rest of the post, ambiguous currency, date, placement
- that the checks pass

Then ask whether to publish. Only a clear yes in chat counts.

## 7. Publish

```bash
git checkout -b <branch> && git add src/content/blog/<slug>/ && git commit -m "content: <what> (EN/ES/PT)"
git push -u origin <branch>
gh pr create --repo nmlemus/nmlemus.github.io --base master --head <branch> --title "…" --body "…"
gh pr checks <n> --repo nmlemus/nmlemus.github.io --watch
gh pr merge <n> --repo nmlemus/nmlemus.github.io --merge
gh run watch <run-id> --repo nmlemus/nmlemus.github.io --exit-status   # deploy on master
curl -s "https://nmlemus.github.io/<es/|pt/>blog/<slug>/?nc=$RANDOM" | grep -c "<new sentence>"
git checkout master && git pull origin master && git branch -d <branch> && git push origin --delete <branch>
```
`--repo` is mandatory: the repo is a fork, and plain `gh` targets the upstream (daattali/beautiful-jekyll). Don't push straight to master. Add your harness's commit and PR attribution.

## Common mistakes

| Mistake | Fix |
|---|---|
| pandoc on the raw HTML, or `-t markdown` | `html_to_post.py` (gfm, SVG stashed, layout divs and source TOC dropped) |
| Blank line inside an SVG: diagram prints as text | collapse it; `preserve.py` flags it |
| Recolouring SVGs for dark mode | not needed: the diagram card is white |
| `$40M` renders as math | `\$40M` |
| Deleting the author's favourite line while humanizing | keep it; ask first |
| A table dropped in with no lead-in or link to the next section | add the bridge sentences |
| Dropping a row or a number in a translation | `parity.py` must be all OK |
| `12,000` left as is in PT (reads as twelve) | `12.000` in PT |
| Description = the key idea: it prints twice under the title | summarise instead |
| Translating the owner's Spanish into Spanish-from-English | the owner's language file is their text |
| `gh pr create` without `--repo` | opens against the upstream fork |
| Merging before the owner's OK | step 6 |
| Stopping at "merged" | check the three live URLs, sync master, delete the branch |
