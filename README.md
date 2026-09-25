# nmlemus.github.io

Personal blog of Noel Moreno Lemus, in English, Spanish and Portuguese. Static site built with [Astro](https://astro.build), styled after my own terminal (iTerm2 + Solarized + powerlevel10k), deployed to GitHub Pages.

## Commands

```bash
npm install
npm run dev                      # http://localhost:4321
npm test                         # unit tests (node:test)
npm run build && npm run verify  # build + check links, hreflang, feeds, KaTeX
```

## Writing a post

Each post is a folder with one file per language. English is the main version.

```
src/content/blog/<slug>/en.md
src/content/blog/<slug>/es.md
src/content/blog/<slug>/pt.md
```

Frontmatter (`date` and `tags` must be identical in the three files):

| field | required | notes |
|---|---|---|
| `title` | yes | translated |
| `description` | yes | one sentence; used in lists, SEO and the share card |
| `date` | yes | `YYYY-MM-DD` |
| `updated` | no | `YYYY-MM-DD` |
| `tags` | yes | lowercase-kebab-case, in English: `[agents, reliability]` |
| `draft` | no | `true` keeps the post out of the site (translations not required yet) |

The build fails if a language file is missing, if `date`/`tags` differ, or if a folder/tag isn't kebab-case.

Workflow:

1. Write `en.md` (or start in `es.md` if that's more natural).
2. Ask Claude Code: *translate post `<slug>`*. Review the diff.
3. `git commit` and `git push` to `master`. GitHub Actions publishes in a couple of minutes.

## Math

KaTeX via remark-math/rehype-katex: `$inline$` and

```
$$
\hat{\beta} = (X^\top X)^{-1} X^\top y
$$
```

- Write currency as `\$5` — otherwise `$5 to $10` is parsed as math.
- `katex` is pinned to the exact version `rehype-katex` renders with; a test fails if they diverge (mismatched CSS silently breaks subscripts). Upgrade both together.

## Modes

Terminal dark (Solarized Dark) and terminal light (Solarized Light) follow the system setting. The `[reader]` button switches to a sepia reading mode and is remembered per browser.

## Fonts & licenses

Self-hosted, subset with `pyftsubset`: MesloLGS NF (Apache 2.0, glyphs from Nerd Fonts, MIT) and Literata (SIL OFL 1.1). Licenses in `public/fonts/LICENSE-*`.
