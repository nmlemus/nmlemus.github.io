# Blog personal trilingüe con estética de terminal — Diseño

- **Fecha:** 2026-09-24
- **Repo:** `nmlemus/nmlemus.github.io` (rama de trabajo `astro-rewrite`)
- **Estado:** aprobado en conversación, pendiente de revisión del spec escrito

## 1. Objetivo

Reemplazar la plantilla beautiful-jekyll por un blog personal propio, desde cero, cuyo propósito es
**publicar ideas y construir autoridad técnica** en IA generativa, sistemas agénticos y arquitectura IA/ML.

No es un negocio: sin monetización, sin embudo, sin servicios de pago para el autor ni para los lectores.

### Criterios de éxito

1. Escribir un post = crear un `.md`, pedir traducción, revisar, `git push`. Nada más.
2. Todo el contenido existe en **EN (principal), ES y PT**. El build falla si falta una traducción.
3. Calidad "competitiva": carga rápida (sin JS salvo lo mínimo), SEO multilingüe correcto (`hreflang`, `canonical`, sitemap, datos estructurados), preview atractiva al compartir en LinkedIn.
4. Identidad visual propia, que no parezca plantilla ni generada por IA: basada en la terminal real del autor.
5. Costo de hosting: cero (GitHub Pages).

### Fuera de alcance (YAGNI, se puede añadir después sin rehacer)

Newsletter por email, comentarios, búsqueda, analítica, Mermaid, MDX, modo noche del modo lectura.

## 2. Decisiones y alternativas rechazadas

| Decisión | Elegido | Rechazado y por qué |
|---|---|---|
| Generador | **Astro** (estático) | Hugo: plantillas Go incómodas, OG images y diseño a medida más costosos. MkDocs Material: se ve como documentación. Jekyll: i18n requiere plugins no soportados por Pages; lento y poco mantenido. |
| Traducción | En sesión de Claude Code, revisada por el autor | Script CI con API de Claude: requiere secreto, cuesta por traducción y publica sin revisión humana. |
| Suscripción | Solo RSS por idioma | Buttondown (gratis solo hasta 100 subs), Substack (gratis pero 3 listas para 3 idiomas), newsletter propia en Firebase (Firebase no envía email gratis; entregabilidad y bajas = complejidad injustificada). |
| Idioma por defecto | EN sin prefijo; ES/PT con prefijo | Redirección automática por idioma del navegador: perjudica rastreo y molesta al lector. |
| Diagramas | Ninguno por ahora | Mermaid en build exige navegador headless. |

## 3. Arquitectura de URLs e i18n

```
/                         home (en)
/blog/                    listado (en)
/blog/<slug>/             artículo (en)
/blog/tags/<tag>/         listado filtrado por etiqueta (en)
/projects/                proyectos (en)
/about/                   sobre mí (en)
/rss.xml                  feed (en)
/es/…  /pt/…              mismas rutas con prefijo de idioma (incluye /es/rss.xml, /pt/rss.xml)
/og/<lang>/<slug>.png     imagen Open Graph generada por post
/sitemap-index.xml        sitemap con alternates hreflang
/404.html                 404 único (Pages sirve uno solo): mensaje en EN/ES/PT a la vez, sin JS
```

- **El slug es idéntico en los 3 idiomas.** El cambio de idioma de cualquier página es reemplazar el prefijo.
- Cada página declara `<html lang>`, `canonical` a sí misma, y `alternate hreflang` para `en`, `es`, `pt` y `x-default` (→ versión EN).
- La ruta `/ml/` no se crea: está ocupada por otro repo de Pages del autor.
- Textos de interfaz en `src/i18n/ui.ts`, tipados para que falte una clave = error de compilación.

## 4. Modelo de contenido

```
src/content/blog/<slug>/en.md
src/content/blog/<slug>/es.md
src/content/blog/<slug>/pt.md
```

Frontmatter (validado con esquema de colección de Astro):

```yaml
title: string            # requerido
description: string      # requerido, se usa en listado, meta description y OG
date: YYYY-MM-DD         # requerido, idéntico en los 3 idiomas
updated: YYYY-MM-DD      # opcional
tags: [string]           # requerido (≥1), idéntico en los 3 idiomas, slugs en inglés
draft: boolean           # opcional, default false; nunca se publica
```

Tiempo de lectura: calculado en build, no escrito a mano.

### Reglas de validación (el build falla con mensaje claro)

1. Cada carpeta de post tiene exactamente `en.md`, `es.md` y `pt.md`.
2. `date` y `tags` coinciden entre los 3 archivos.
3. Si cualquiera de los 3 tiene `draft: true`, el post completo se excluye.

Implementadas como función pura `validatePosts(entries)` en `src/lib/posts.ts`, invocada por el único punto
de acceso al contenido (`getPosts(lang)`), de modo que ninguna página puede saltársela.

### Contenido inicial

- **3 posts** migrados desde LinkedIn (textos completos leídos del perfil del autor):
  1. "The model decides what. Code decides how." (post sobre tools vs. modelo)
  2. "How Coding Harness Affects Token Consumption" (artículo, serie *The AI Game*)
  3. "An Essential Guide to Safe Development Practices in the Era of Vibe Coding" (artículo, serie *The AI Game*)
- **Sobre mí** y **Proyectos** redactados a partir del perfil de LinkedIn (snapshot 2026-09-24). Sin datos inventados:
  todo dato (fechas, cifras, títulos) debe existir en el perfil.
- Se eliminan el post de TensorFlow Lite y todo el contenido de la plantilla.

## 5. Páginas

Toda página comparte: barra de pestañas estilo iTerm (navegación) + contenido presentado como sesión de terminal.

| Página | Metáfora | Contenido |
|---|---|---|
| Home | `whoami` → `ls -t writing/` → prompt vacío con cursor | Nombre, rol, bio breve, "currently: dsagent"; últimos 5 posts (fecha, min, archivo, título, descripción, tags); enlace a RSS |
| Blog | `ls -t writing/` | Todos los posts; enlaces a páginas de tag |
| Tag | `ls writing/ \| grep #<tag>` | Posts con esa etiqueta |
| Artículo | `cat <slug>.md` | Frontmatter visible como YAML (incluye `also_in: [es, pt]` enlazado); índice como salida de `grep '^## '` cuando hay ≥3 secciones h2; cuerpo; notas al pie; prompt final `share --linkedin --x --copy-link` |
| Proyectos | `ls -l projects/` | DSAgent, patente de detección de fallas sísmicas (Dell EMC), BioSyS/T-arenal, HPC4E y el resto de proyectos listados en LinkedIn |
| Sobre mí | `cat about.md` + `git log --pretty='%ad %s'` | Bio en prosa + trayectoria como log (UCI → Dell EMC → LNCC PhD → UFF → P&G), educación, enlaces (LinkedIn, GitHub, Lattes) |
| 404 | comando fallido | `zsh: no such file or directory` con segmento de estado de error rojo (✘); mensaje y enlaces a home en los 3 idiomas |

## 6. Sistema visual

Origen: configuración real del autor (iTerm2 + oh-my-zsh + powerlevel10k), leída de su máquina el 2026-09-24.

### Modos (3)

| Modo | Cuándo | Paleta |
|---|---|---|
| Terminal oscuro | por defecto si el sistema está en oscuro | Solarized Dark |
| Terminal claro | por defecto si el sistema está en claro | Solarized Light |
| Lectura | botón `[reader]` en la barra de pestañas | Sepia |

- La preferencia de modo lectura se guarda en `localStorage` (con `try/catch`; sin almacenamiento el sitio funciona igual).
- Un script inline en `<head>` aplica el modo antes del primer pintado (sin parpadeo).
- En modo lectura se ocultan prompt, marco y YAML; queda columna centrada (~36em), texto justificado con guiones, sangría entre párrafos, título y cita centrados, tablas estilo libro.

### Tokens de color

Solarized (terminal oscuro/claro): `base03 #002b36`, `base02 #073642`, `base01 #586e75`, `base00 #657b83`, `base0 #839496`, `base1 #93a1a1`,
`base2 #eee8d5`, `base3 #fdf6e3`, `yellow #b58900`, `orange #cb4b16`, `red #dc322f`, `magenta #d33682`, `violet #6c71c4`, `blue #268bd2`,
`cyan #2aa198`, `green #859900`. Texto de prosa en oscuro: `#a9b7b7` (más contraste que `base0`).

Prompt p10k (xterm-256 → hex): SO `#303030`/fg `#ffffff`, directorio `#5f5fd7`/fg `#ffffff` bold, git limpio `#00af5f`/fg `#000000`,
estado OK `#00af5f`, estado error `#af5f5f`, hora `#444444`/fg `#eeeeee`, marco y relleno `·` `#6c6c6c`, carácter `❯` `#5fd700`.
Separadores powerline `U+E0B0` / `U+E0B2`, icono Apple `U+F179`, rama `U+E0A0`.

Lectura: fondo `#f6eedb`, superficie `#efe4cc`, texto `#3d3225`, secundario `#5e4f3b`, tenue `#8c7b61`, títulos `#2b2219`, enlaces `#8a4b1f`, líneas `#e3d6b8`.

### Tipografía

- **MesloLGS NF** (Apache 2.0 + glifos Nerd Font): interfaz, prompt, metadatos, código, títulos en modo terminal. 14.5px base.
- **Literata** (OFL): párrafos, entradilla, citas; todo en modo lectura. 17.5px (terminal) / 19.5px (lectura).
- Ambas **autoalojadas** en `public/fonts/` como woff2 subconjuntadas (latin + latin-ext + glifos powerline usados), generadas una vez con `pyftsubset` (herramienta de desarrollo, no dependencia del proyecto). Cero peticiones a terceros.
- Cambiar de fuente = cambiar las variables `--mono` / `--serif`.

### Accesibilidad

- El prompt y el marco son decorativos (`aria-hidden="true"`); la estructura semántica es real (`<nav>`, `<main>`, `<article>`, `h1`/`h2`, `<table>`).
- El cursor parpadeante respeta `prefers-reduced-motion`.
- Contraste de texto ≥ 4.5:1 en los 3 modos.
- El 100% del contenido es HTML seleccionable e indexable (nada dibujado en canvas).

### JavaScript en el cliente

Solo: script de modo (inline, <1 KB) y botón "copy link". Sin frameworks de UI.

## 7. Imágenes Open Graph

Generadas en build (`satori` + `@resvg/resvg-js`), 1200×630, una por post y por idioma: fondo Solarized Dark, línea de prompt p10k,
título, nombre del autor y dominio. Fuentes TTF para satori guardadas en el repo (satori no acepta woff2).

## 8. Despliegue

- **GitHub Actions** en push a `master`: `npm ci` → `npm test` → `astro check` → `astro build` → verificación de HTML generado → deploy a Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`).
- **Configuración de Pages:** cambiar la fuente de "legacy / rama master" a "GitHub Actions". **Requiere confirmación explícita del autor** antes de ejecutarlo.
- Versión de Node: LTS vigente, fijada en `.nvmrc`; versiones de Node y Astro verificadas en documentación oficial al implementar (no supuestas).
- Desarrollo en rama `astro-rewrite`; merge a `master` solo tras revisión del autor en local.
- Se eliminan: Gemfile, `_config.yml`, `_layouts/`, `_includes/`, `_data/`, `_posts/`, `staticman.yml`, `beautiful-jekyll-theme.gemspec`, `docs/index.html`, `.github/` de la plantilla (CI de Jekyll, FUNDING, templates), CHANGELOG, README (reescrito). Se conserva `assets/img/noel.jpeg`.

### Dependencias (aprobadas por el autor)

`astro`, `@astrojs/sitemap`, `@astrojs/rss`, `remark-math`, `rehype-katex`, `satori`, `@resvg/resvg-js`.
Tests con `node:test` (incluido en Node, sin dependencia extra). Cualquier dependencia adicional requiere preguntar primero.

## 9. Verificación

1. **TDD del validador**: tests que fallan primero para cada regla de §4 (falta idioma, `date` distinta, `tags` distintas, draft excluido, caso válido).
2. `astro check` sin errores.
3. **Verificación post-build** (script propio sobre `dist/`): cada artículo tiene `canonical` y los 4 `hreflang` apuntando a URLs existentes; los 3 RSS parsean y listan los mismos slugs; ningún enlace interno roto.
4. Revisión visual en navegador: escritorio y móvil (≥ 360px, sin scroll horizontal), los 3 modos.
5. Lighthouse en home y un artículo: objetivo ≥ 95 en Performance, Accessibility, Best Practices y SEO.
6. **Revisión humana** de todos los textos (EN/ES/PT) antes del merge.

## 10. Flujo de publicación (post-lanzamiento)

1. Crear `src/content/blog/<slug>/en.md` (o empezar en `es.md` si es más natural; EN sigue siendo la versión principal).
2. Pedir a Claude Code "traduce el post `<slug>`" → genera los otros dos archivos con el mismo frontmatter, código y términos técnicos sin traducir.
3. Revisar el diff, `git commit`, `git push` → publicado en ~1–2 min.
4. Documentado en el `README.md` del repo.

## 11. Preguntas abiertas

- Fechas exactas de publicación de los 3 posts de LinkedIn: se leen del propio LinkedIn al migrar.
- Proyectos 3–5 y certificaciones completas: se leen del perfil al implementar.
- Copy final de la bio (home y about): borrador propuesto por Claude, aprobación del autor.
