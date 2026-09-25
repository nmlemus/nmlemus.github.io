---
title: "RAG de punta a punta: un tutorial práctico"
description: "Qué es, cómo funciona cada pieza, cómo se evalúa, un ejemplo en producción sobre Azure y una comparación de Azure · Google Cloud · código abierto"
date: 2026-09-25
tags: [rag, retrieval, evaluation]
---

Conectar una base de datos vectorial es la parte fácil de RAG. Que funcione depende de leer bien los documentos, buscar de forma híbrida, aplicar un reranker y medir por separado la recuperación y las respuestas.

En las pruebas de Anthropic (2024), agregar contexto a los chunks, BM25 y un reranker redujo en 67% las fallas de recuperación. Las herramientas comerciales de RAG legal alucinan el 17–33% de las veces (Stanford, 2024), y en el benchmark CRAG de Meta (2024) los mejores sistemas RAG industriales responden sin alucinar solo el 63% de las veces. Para medir todo esto, un juez LLM coincide con los humanos más del 80% de las veces (Zheng et al., 2023).

Verifiqué casi todo lo que aparece aquí contra la documentación oficial y los papers citados el 23 de septiembre de 2026. Algunos detalles de herramientas marcados con † vienen de la experiencia general y no los volví a comprobar. Las funciones marcadas como (preview) existen, pero el proveedor todavía no las recomienda para producción. Las siglas se explican la primera vez que aparecen y están reunidas en el glosario del final; los papers se citan por su nombre en el texto (*SPLADE*, *ColBERT*, *RAGAS*), con autores, año y enlace en las referencias.

## Parte I · Conceptos

### 1. Qué es RAG, explicado con una biblioteca

**RAG** (*Retrieval-Augmented Generation*) significa que, antes de responder, un modelo de lenguaje busca en tus documentos y responde a partir de lo que encontró, citando la fuente.

¿Para qué lo necesitas? Un modelo de lenguaje no conoce los documentos internos de tu empresa, su conocimiento se detiene en una fecha de corte y puede inventar cosas ("alucinar"). Con RAG la respuesta se apoya en documentos concretos que cualquiera puede revisar, y actualizar el conocimiento no obliga a reentrenar el modelo.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:965px" viewBox="0 0 1440 320"  xmlns="http://www.w3.org/2000/svg" role="img"
         aria-labelledby="rag-library-title rag-library-desc">
      <title id="rag-library-title">RAG explicado como una biblioteca</title>
      <desc id="rag-library-desc">Un pipeline de izquierda a derecha con siete etapas (documentos, chunks, índice, búsqueda, reranker, modelo y evaluación) asociadas a la metáfora de una biblioteca: los documentos de la biblioteca se cortan en fichas, se catalogan, un bibliotecario los busca, un experto (el reranker) los filtra, un modelo redacta la respuesta y un profesor la califica, con el paso de generación destacado.</desc>
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#003da5"/></marker>
        <marker id="arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#fedb00"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <!-- ============ ARROWS (drawn before nodes; endpoints share y=184) ============ -->
      <line x1="200"  y1="184" x2="240"  y2="184" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <line x1="400"  y1="184" x2="440"  y2="184" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <line x1="600"  y1="184" x2="640"  y2="184" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <line x1="800"  y1="184" x2="840"  y2="184" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <!-- highlighted handoff: reranker -> model (accent) -->
      <line x1="1000" y1="184" x2="1040" y2="184" stroke="#fedb00" stroke-width="1.2" marker-end="url(#arrow-accent)"/>
      <line x1="1200" y1="184" x2="1240" y2="184" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <!-- ============ STAGE 1 · Library (documents) ============ -->
      <rect x="20" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="30" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">1</text>
      <rect x="40" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="40" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="120" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Biblioteca</text>
      <text x="120" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">documentos</text>
      <text x="120" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Tus archivos fuente</text>
      <text x="120" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">(PDFs, wikis, políticas)</text>
      <!-- ============ STAGE 2 · Index cards (chunks) ============ -->
      <rect x="230" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="240" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">2</text>
      <rect x="240" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="240" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="320" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Fichas</text>
      <text x="320" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">chunks</text>
      <text x="320" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Documentos cortados</text>
      <text x="320" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">en trozos pequeños</text>
      <!-- ============ STAGE 3 · Catalog (index) ============ -->
      <rect x="430" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="440" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">3</text>
      <rect x="440" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="440" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="520" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Catálogo</text>
      <text x="520" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">índice</text>
      <text x="520" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Ordena cada ficha</text>
      <text x="520" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">por palabra y sentido</text>
      <!-- ============ STAGE 4 · Librarian (search) ============ -->
      <rect x="630" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="640" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">4</text>
      <rect x="640" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="640" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="720" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Bibliotecario</text>
      <text x="720" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">búsqueda</text>
      <text x="720" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Trae ~50</text>
      <text x="720" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">fichas candidatas</text>
      <!-- ============ STAGE 5 · Expert (reranker) ============ -->
      <rect x="830" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="840" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">5</text>
      <rect x="840" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="840" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="920" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Experto</text>
      <text x="920" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">reranker</text>
      <text x="920" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Se queda con</text>
      <text x="920" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">las 5 mejores</text>
      <!-- ============ STAGE 6 · Writer (model) · HIGHLIGHT ============ -->
      <rect x="1030" y="96" width="20" height="16" rx="8" fill="rgba(254,219,0,0.20)"/>
      <text x="1040" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">6</text>
      <rect x="1040" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="1040" y="120" width="160" height="128" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.2"/>
      <text x="1120" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Redactor</text>
      <text x="1120" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">modelo</text>
      <text x="1120" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Escribe la respuesta</text>
      <text x="1120" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">con citas</text>
      <!-- ============ STAGE 7 · Teacher (evaluation) ============ -->
      <rect x="1230" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="1240" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">7</text>
      <rect x="1240" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="1240" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="1320" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Profesor</text>
      <text x="1320" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">evaluación</text>
      <text x="1320" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Califica: ¿buscó bien?</text>
      <text x="1320" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">¿respondió bien?</text>
      <!-- ============ LEGEND (horizontal bottom strip) ============ -->
      <line x1="40" y1="280" x2="1400" y2="280" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="300" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">LEYENDA</text>
      <rect x="132" y="292" width="12" height="12" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="152" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Recuperación (ingesta → búsqueda → rerank)</text>
      <rect x="470" y="292" width="12" height="12" rx="2" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.2"/>
      <text x="490" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Generación (paso clave)</text>
      <line x1="720" y1="298" x2="744" y2="298" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <text x="752" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Paso de datos entre etapas</text>
    </svg></div><figcaption>RAG como una biblioteca: documentos → chunks → índice → búsqueda → reranker → modelo → evaluación</figcaption></figure>


Gao et al. (2023/24) describen la evolución del campo en tres etapas:

| Etapa | Idea |
|----|----|
| Naive RAG | Indexar → recuperar los k primeros → pegarlos en el prompt |
| Advanced RAG | Mejorar lo que pasa antes de buscar (reescribir la pregunta, hacer mejor chunking) y después (rerank, compresión) |
| Modular RAG | Piezas intercambiables; flujos adaptativos, iterativos y agénticos |

### 2. Los tres circuitos de un sistema RAG en producción


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 528" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-circuitos-title rag-circuitos-desc">
<title id="rag-circuitos-title">Los tres circuitos de un RAG en producción</title>
<desc id="rag-circuitos-desc">Arquitectura de un RAG con tres circuitos: preparar los documentos (fuentes, parsing y chunking, embeddings, índice), responder cada pregunta (búsqueda híbrida, reranker, modelo con citas) y evaluar con un golden set y muestreo para retroalimentar las mejoras.</desc>
<defs>
<marker id="rag-circuitos-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="rag-circuitos-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="rag-circuitos-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="40" y="40" width="880" height="112" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="44" width="200" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="53" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">PREPARAR DOCUMENTOS · OFFLINE</text>
<rect x="40" y="192" width="880" height="112" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="196" width="176" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="205" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">RESPONDER · CADA PREGUNTA</text>
<rect x="40" y="344" width="880" height="112" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="348" width="248" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="357" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">EVALUAR · ANTES Y EN PRODUCCIÓN</text>
<path d="M 248,100 H 284" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 460,100 H 496" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 672,100 H 708" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 248,252 H 284" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 460,252 H 496" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 672,252 H 708" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 796,128 V 160 Q 796,168 788,168 H 380 Q 372,168 372,176 V 224" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<rect x="552" y="148" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="584" y="157" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">CONSULTA</text>
<path d="M 796,280 V 376" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<rect x="804" y="320" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="832" y="329" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TRAZAS</text>
<path d="M 708,404 H 380 Q 372,404 372,396 V 280" fill="none" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#rag-circuitos-arrow)"/>
<rect x="504" y="384" width="72" height="12" rx="2" fill="#ffffff"/>
<text x="540" y="393" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">MEJORAS</text>
<rect x="72" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="72" y="72" width="176" height="56" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="160" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Fuentes</text>
<text x="160" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">SharePoint · Blob · Drive</text>
<rect x="284" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="284" y="72" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="372" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Parsing + chunking</text>
<text x="372" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">estructura, títulos, tablas</text>
<rect x="496" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="496" y="72" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Embeddings</text>
<text x="584" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">texto → vector</text>
<rect x="708" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="72" width="176" height="56" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="796" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Índice</text>
<text x="796" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">vectores + BM25 + permisos</text>
<rect x="72" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="72" y="224" width="176" height="56" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="160" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Usuario</text>
<text x="160" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">pregunta</text>
<rect x="284" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="284" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="372" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Búsqueda híbrida</text>
<text x="372" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">BM25 + vector · RRF</text>
<rect x="496" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="496" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Reranker</text>
<text x="584" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">top 50 → top 5</text>
<rect x="708" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="796" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Modelo con citas</text>
<text x="796" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">respuesta o “no sé”</text>
<rect x="708" y="376" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="376" width="176" height="56" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="796" y="400" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Evaluación</text>
<text x="796" y="416" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">golden set · muestreo</text>
<line x1="40" y1="480" x2="920" y2="480" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="40" y="500" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEYENDA</text>
<rect x="112" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="112" y="492" width="20" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="144" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">DESTACADO</text>
<rect x="200" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="200" y="492" width="20" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="232" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">PROCESO</text>
<rect x="300" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="300" y="492" width="20" height="12" rx="2" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="332" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FUENTE</text>
<rect x="392" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="392" y="492" width="20" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="424" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">ENTRADA</text>
<line x1="492" y1="496" x2="516" y2="496" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<text x="524" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FLUJO</text>
<line x1="588" y1="496" x2="612" y2="496" stroke="#4f5d75" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#rag-circuitos-arrow)"/>
<text x="620" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">MEJORA / RETROALIMENTACIÓN</text>
</svg></div><figcaption>Figura · Los tres circuitos de un RAG en producción</figcaption></figure>


## Parte II · Preparar los documentos

### 3. Leer bien el documento (parsing)

El parsing influye más que cualquier otro paso, y es el que los equipos más descuidan. Si conviertes un PDF a "texto plano", pierdes los títulos, las tablas se desordenan y cada chunk pierde su contexto.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:670px" viewBox="0 0 1000 340"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-parsing-title rag-parsing-desc">
  <title id="rag-parsing-title">Parsing: texto plano frente a parsing con estructura</title>
  <desc id="rag-parsing-desc">Una comparación de antes y después del parsing de documentos. A la izquierda, la extracción a texto plano aplana un PDF y pierde sus títulos y la estructura de la tabla. Una flecha rotulada modelo de layout apunta al panel derecho, donde el parsing que respeta la estructura conserva la jerarquía de títulos como Markdown y mantiene la tabla.</desc>
  <defs>
    <marker id="rp-arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><polygon points="0 0, 9 3.5, 0 7" fill="#003da5"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- arrow between panels (drawn before boxes) -->
  <line x1="420" y1="180" x2="576" y2="180" stroke="#003da5" stroke-width="1.4" marker-end="url(#rp-arrow)"/>
  <rect x="452" y="160" width="96" height="14" rx="2" fill="#ffffff"/>
  <text x="500" y="170" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle" letter-spacing="0.04em">modelo de layout</text>
  <!-- LEFT: plain-text extraction (structure lost) -->
  <rect x="40" y="72" width="380" height="216" rx="6" fill="#ffffff"/>
  <rect x="40" y="72" width="380" height="216" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
  <text x="60" y="100" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">EXTRACCIÓN A TEXTO PLANO</text>
  <text x="60" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000">PDF original, aplanado</text>
  <text x="60" y="150" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">POLÍTICA DE TELETRABAJO 3.</text>
  <text x="60" y="166" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">Elegibilidad Cargo Días País</text>
  <text x="60" y="182" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">Ger 2 ES 3 Vie opcional...</text>
  <text x="60" y="222" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• títulos perdidos</text>
  <text x="60" y="240" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• la tabla queda en una línea</text>
  <text x="60" y="258" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• cada chunk pierde su contexto</text>
  <!-- RIGHT: structure-aware parsing (highlighted, accent) -->
  <rect x="580" y="72" width="380" height="216" rx="6" fill="#ffffff"/>
  <rect x="580" y="72" width="380" height="216" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="600" y="100" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.12em">CON ESTRUCTURA → MARKDOWN</text>
  <text x="600" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000">Títulos y tabla preservados</text>
  <text x="600" y="146" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000"># Política de teletrabajo<tspan fill="#4d6fa8">   ← h1</tspan></text>
  <text x="600" y="162" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">## 3. Elegibilidad por país<tspan fill="#4d6fa8"> ← h2</tspan></text>
  <text x="600" y="178" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">### 3.2 España<tspan fill="#4d6fa8">   ← h3</tspan></text>
  <text x="600" y="204" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">| Cargo   | Días/semana |</text>
  <text x="600" y="220" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">| Gerente | 2           |</text>
  <text x="600" y="252" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">la tabla sigue siendo tabla →</text>
  <text x="600" y="270" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">el chunk conserva su ruta de títulos</text>
</svg></div><figcaption>Parsing: la extracción a texto plano pierde la estructura; el parsing que respeta la estructura conserva títulos y tablas</figcaption></figure>


Los estudios coinciden en esto:

- Los autores de ColPali (ICLR 2025) "suelen encontrar que optimizar el pipeline de ingesta da mejoras mucho mayores que optimizar el modelo de embeddings". ColPali mismo se salta la extracción de texto y el chunking, e indexa directamente imágenes de las páginas; en el benchmark ViDoRe obtuvo 81.3 nDCG@5 frente a ~65–67 de los pipelines basados en parsing.
- En el estudio de Unstructured sobre FinanceBench (2024), hacer chunking por elementos del documento (títulos, tablas) alcanzó 53.2% de exactitud frente a 48.2% con chunks fijos de 512 tokens, y usó la mitad de chunks.
- Un estudio en turco (2026) encontró que el chunking que tiene en cuenta el layout ayuda mucho más en documentos con tablas que en documentos que solo tienen texto.

Las herramientas habituales son el Document Layout skill (Azure), Document AI Layout Parser (Google) y Docling (IBM, código abierto). La sección 22 las compara.

### 4. Chunking

El chunking divide cada documento en pedazos pequeños (*chunks*) que se indexan por separado.

#### 4.1 Las estrategias

| Estrategia | Cómo divide | Costo |
|----|----|----|
| Tamaño fijo | Cada N tokens, con solapamiento opcional | Mínimo |
| Recursivo | Intenta dividir por párrafo, luego por línea, luego por oración… | Mínimo |
| Por estructura / página | Por las secciones, títulos o páginas del documento | Bajo (requiere buen parsing) |
| Semántico | Corta donde cambia el significado entre oraciones, medido con embeddings | Medio |
| Basado en LLM ("agéntico") | Un modelo decide dónde cortar | Alto |
| Proposiciones | Un modelo reescribe el texto como hechos atómicos | Alto |

#### 4.2 Lo que dice la evidencia: el chunking semántico está sobrevalorado

- Vectara (2024) se preguntó "Is Semantic Chunking Worth the Computational Cost?" y concluyó que "los costos computacionales del chunking semántico no se justifican con mejoras de rendimiento consistentes". El chunking de tamaño fijo ganó en los 4 datasets de documentos reales (en HotpotQA, por ejemplo, F1@5 fue 90.59 con fijo vs 87.37 con semántico). El modelo de embeddings importó más que el chunking.
- Chroma (2024) encontró que la estrategia de chunking mueve el recall hasta un 9%. Su chunker semántico por defecto quedó un poco por debajo del promedio (83.6% de recall), mientras que un chunker recursivo de 200 tokens sin solapamiento llegó a 88.1%. El mejor resultado (91.9%) usó un modelo de lenguaje y costó mucho más.
- NVIDIA (junio de 2025) obtuvo la mejor exactitud promedio (0.648) y la menor varianza entre datasets con chunking **por página**.
- En biomedicina (2026), el chunking semántico ganó +8.4 puntos de F1 en un dataset, pero en los demás el chunking de tamaño fijo "sigue siendo competitivo o mejor". Depende del dominio.

#### 4.3 Lo que sí funciona: agregar contexto a cada chunk

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th>Chunk sin contexto</th>
<th>Chunk con contexto</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>"| Manager | 2 |"</code><br />
<span class="note">→ ¿2 qué? ¿dónde?</span></td>
<td><code>"Remote Work Policy &gt; 3. Eligibility &gt; 3.2 Spain | Manager | 2 days/week |"</code><br />
<span class="note">→ se entiende por sí solo</span></td>
</tr>
</tbody>
</table>

La **Contextual Retrieval** de Anthropic (sep. 2024) pone a un modelo a escribir 50–100 tokens de contexto y los antepone a cada chunk. Medido como la tasa de fallas de recuperación dentro de los 20 primeros resultados, partiendo de una línea base de 5.7%:

- contexto solo en los vectores: 3.7% (−35%)
- contexto en los vectores y en BM25: 2.9% (−49%)
- todo lo anterior más un reranker: 1.9% (−67%)

El costo, que se paga una sola vez, es de ~\$1.02 por millón de tokens de documento con prompt caching. Ten cuidado al citar estas cifras: los tres porcentajes son reducciones respecto a la línea base de 5.7%, así que el aporte propio del reranker es el paso de 2.9% a 1.9%.

El late chunking (Jina, 2024) calcula primero el embedding del documento completo y solo después lo divide, así que cada vector "sabe" de qué documento viene. Mejora nDCG@10 entre +2.7% y +3.6% sin reentrenar.

#### 4.4 Tamaños para empezar

Bhat et al. (2025) sugieren 64–128 tokens para preguntas factuales cortas y 512–1024 tokens para preguntas que necesitan un contexto amplio. Azure recomienda empezar con 512 tokens y 25% de solapamiento, y agregar el título del documento a los chunks intermedios.

Un punto de partida razonable: empieza con chunking recursivo o por sección/página de 256–512 tokens, no partas las tablas, agrega contexto y ajusta midiendo (Parte VI).

### 5. Convertir el texto en vectores (embeddings)

Un **embedding** es una lista de números que representa el significado de un texto. Los textos con significados parecidos quedan cerca unos de otros:


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:549px" viewBox="0 0 820 380"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-embed-title rag-embed-desc">
  <title id="rag-embed-title">Los embeddings acercan los significados parecidos</title>
  <desc id="rag-embed-desc">Un espacio vectorial conceptual. Los puntos de laptop barata y notebook económica quedan juntos porque significan casi lo mismo, mientras que política de vacaciones queda lejos porque no tiene relación. La distancia en el espacio representa la diferencia de significado, no las palabras compartidas.</desc>
  <defs>
    <marker id="re-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#003da5"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- plane -->
  <rect x="40" y="64" width="740" height="256" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
  <text x="56" y="88" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">ESPACIO DE EMBEDDINGS · DISTANCIA = DIFERENCIA DE SENTIDO</text>
  <!-- close pair: connecting line drawn first -->
  <line x1="232" y1="196" x2="360" y2="164" stroke="#003da5" stroke-width="1" stroke-dasharray="4,3"/>
  <rect x="252" y="168" width="80" height="14" rx="2" fill="#ffffff"/>
  <text x="292" y="178" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">cerca</text>
  <!-- point 1: cheap laptop (highlighted accent) -->
  <circle cx="232" cy="196" r="9" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.6"/>
  <text x="232" y="228" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"laptop barata"</text>
  <!-- point 2: inexpensive notebook -->
  <circle cx="360" cy="164" r="9" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.6"/>
  <text x="360" y="148" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"notebook económica"</text>
  <!-- far point: vacation policy -->
  <line x1="256" y1="204" x2="628" y2="268" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-dasharray="2,4"/>
  <rect x="410" y="232" width="60" height="14" rx="2" fill="#ffffff"/>
  <text x="440" y="242" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">lejos</text>
  <circle cx="640" cy="272" r="9" fill="rgba(0,0,0,0.05)" stroke="#4d6fa8" stroke-width="1.4"/>
  <text x="640" y="298" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"política de vacaciones"</text>
  <!-- legend -->
  <line x1="40" y1="344" x2="780" y2="344" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
  <circle cx="52" cy="362" r="6" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="66" y="365" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Significado parecido, vecinos cercanos</text>
  <circle cx="360" cy="362" r="6" fill="rgba(0,0,0,0.05)" stroke="#4d6fa8" stroke-width="1.4"/>
  <text x="374" y="365" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Sin relación, lejos, aunque comparta palabras</text>
</svg></div><figcaption>Los embeddings acercan los significados parecidos y alejan los textos que no tienen relación</figcaption></figure>


| Tipo | Qué es | Ejemplos |
|----|----|----|
| Denso | Cientos o miles de números, todos con valor | text-embedding-3 (OpenAI/Azure), gemini-embedding-001, Qwen3-Embedding, BGE-M3 |
| Disperso aprendido | Lista de términos (casi todos en cero) con pesos, ampliada con términos relacionados | SPLADE, ELSER (Elastic), modo sparse de BGE-M3 |
| Multivector | Un vector por token; se compara token a token | ColBERT, ColPali |

Mide con tus propios datos. Los leaderboards públicos (como MTEB) cambian cada mes y no siempre reflejan tu dominio. Y fija la versión del modelo: si mezclas vectores de modelos distintos, las búsquedas dejan de tener sentido.

### 6. Índice y permisos

El índice guarda cada chunk con su texto, su vector y sus metadatos:

| Campo(s) en el índice              | Para qué sirve                    |
|------------------------------------|-----------------------------------|
| `id, content, content_vector`      | el texto del chunk y su embedding |
| `title, section, page, source_url` | de dónde viene                    |
| `allowed_groups`                   | grupos que pueden verlo           |
| `last_modified`                    | vigencia                          |

Sin `allowed_groups` y un **filtro de seguridad** en cada búsqueda, un pasante podría recibir chunks de documentos del comité ejecutivo.

## Parte III · Recuperación

### 7. BM25: búsqueda por palabras clave

BM25 es el algoritmo clásico de búsqueda por palabras clave (léxica) y el que viene por defecto en Elasticsearch, OpenSearch y Azure AI Search. Funciona sobre un **índice invertido**, que se parece al índice alfabético al final de un libro:

| Término         | Documentos donde aparece (postings) |
|-----------------|-------------------------------------|
| `"remote work"` | doc3, doc7, doc12                   |
| `"manager"`     | doc7, doc9                          |
| `"spain"`       | doc7, doc12, doc15                  |

El puntaje tiene tres partes:

| Ingrediente | Idea | Ejemplo |
|----|----|----|
| Frecuencia del término | Más apariciones = más puntos, pero con saturación (parámetro `k1`, 1.2 por defecto en Elasticsearch †) | 3 veces \> 1 vez, pero 20 veces ≈ 10 veces |
| Rareza del término | Las palabras raras valen más | "ORA-00942" vale mucho; "de" casi nada |
| Largo del documento | Un texto corto que contiene la palabra puntúa más que uno largo (parámetro `b`, 0.75 por defecto †) | Un párrafo específico le gana a un manual entero |

BM25 es rápido, no necesita modelo, se puede explicar y es excelente para términos exactos como códigos, siglas y nombres propios. Su debilidad son los sinónimos: *"laptop barata"* no encuentra *"notebook económica"*.

### 8. Búsqueda semántica: por significado

#### 8.1 Vectores densos (búsqueda de vecinos más cercanos)

Aquí la pregunta se convierte en un vector y recuperas los chunks más cercanos. Hacerlo rápido sobre millones de vectores requiere un índice aproximado, normalmente **HNSW** (un grafo de vecinos).

La búsqueda densa entiende sinónimos, paráfrasis e idiomas distintos. En cambio, es una caja negra (no puedes explicar por qué algo coincidió), puede confundir códigos casi idénticos (ORA-00942 vs ORA-00943) y usa más memoria. La cuantización reduce la memoria comprimiendo los números, por ejemplo a 8 bits o a binario.

#### 8.2 Disperso aprendido (SPLADE, ELSER)

El disperso aprendido (learned sparse) queda entre los dos. Un modelo amplía el texto con términos relacionados y sus pesos, y luego la búsqueda corre sobre un índice invertido, como con BM25:

```
"cheap laptop" → { laptop: 2.1, notebook: 1.8, computer: 1.2, cheap: 1.9, budget: 1.5, price: 0.9 }
```

Es más fácil de explicar que los vectores densos y aun así encuentra sinónimos. El problema es que depende del idioma del modelo (ELSER se recomienda solo para inglés) y tiene un límite de tokens (ELSER codifica los primeros 512 tokens de cada campo).

#### 8.3 Cuál gana

| Consulta | BM25 | Denso | Disperso aprendido |
|----|----|----|----|
| *"laptop barata"* → doc con *"notebook económica"* | No | Sí | Sí |
| *"error ORA-00942"* → doc con ese código | Sí | Poco confiable | Sí |
| *"¿puedo trabajar desde casa?"* → doc con *"teletrabajo"* | No | Sí | Sí, si el idioma está soportado |
| Explicar por qué coincidió | Sí | No | En parte |
| Costo | Mínimo | Modelo + memoria | Modelo |

Ninguno gana siempre, y por eso se combinan.

### 9. Búsqueda híbrida y RRF


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rrf-fusion-title rrf-fusion-desc">
<title id="rrf-fusion-title">Búsqueda híbrida: dos búsquedas, una fusión RRF y un reranker</title>
<desc id="rrf-fusion-desc">La pregunta se busca en paralelo con BM25 y con vectores; RRF fusiona por posición el top 50 de cada lista, un reranker los reordena y los 5 mejores chunks llegan al modelo.</desc>
<defs>
<marker id="rrf-fusion-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="rrf-fusion-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="rrf-fusion-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<path d="M 128,188 H 140 Q 148,188 148,180 V 128 Q 148,120 156,120 H 168" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rrf-fusion-arrow)"/>
<path d="M 128,212 H 140 Q 148,212 148,220 V 272 Q 148,280 156,280 H 168" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rrf-fusion-arrow)"/>
<path d="M 320,120 H 360 Q 368,120 368,128 V 180 Q 368,188 376,188 H 384" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rrf-fusion-arrow)"/>
<path d="M 320,280 H 360 Q 368,280 368,272 V 220 Q 368,212 376,212 H 384" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rrf-fusion-arrow)"/>
<path d="M 528,200 H 592" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rrf-fusion-arrow)"/>
<path d="M 736,200 H 800" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rrf-fusion-arrow)"/>
<rect x="324" y="100" width="32" height="12" rx="2" fill="#ffffff"/>
<text x="340" y="108" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TOP 50</text>
<rect x="324" y="260" width="32" height="12" rx="2" fill="#ffffff"/>
<text x="340" y="268" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TOP 50</text>
<rect x="540" y="180" width="40" height="12" rx="2" fill="#ffffff"/>
<text x="560" y="188" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">FUSIONA</text>
<rect x="744" y="180" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="768" y="188" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">REORDENA</text>
<text x="928" y="64" fill="#2d3142" font-size="14" font-style="italic" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">RRF solo usa posiciones:</text>
<text x="928" y="84" fill="#2d3142" font-size="14" font-style="italic" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">premia el acuerdo entre las dos listas.</text>
<path d="M 628,88 Q 520,100 480,160" fill="none" stroke="rgba(0,0,0,0.40)" stroke-width="1" stroke-dasharray="4,3"/>
<circle cx="480" cy="160" r="2" fill="#2d3142"/>
<rect x="32" y="168" width="96" height="64" rx="6" fill="#ffffff"/>
<rect x="32" y="168" width="96" height="64" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="80" y="204" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Pregunta</text>
<rect x="168" y="88" width="152" height="64" rx="6" fill="#ffffff"/>
<rect x="168" y="88" width="152" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="244" y="112" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">BM25</text>
<text x="244" y="128" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">palabras exactas</text>
<text x="244" y="140" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">índice invertido</text>
<rect x="168" y="248" width="152" height="64" rx="6" fill="#ffffff"/>
<rect x="168" y="248" width="152" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="244" y="272" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Vector</text>
<text x="244" y="288" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">significado</text>
<text x="244" y="300" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">HNSW</text>
<rect x="384" y="168" width="144" height="64" rx="6" fill="#ffffff"/>
<rect x="384" y="168" width="144" height="64" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="456" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">RRF</text>
<text x="456" y="212" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">1/(60 + posición)</text>
<rect x="592" y="168" width="144" height="64" rx="6" fill="#ffffff"/>
<rect x="592" y="168" width="144" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="664" y="192" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Reranker</text>
<text x="664" y="208" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">lee pregunta +</text>
<text x="664" y="220" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">chunk</text>
<rect x="800" y="168" width="128" height="64" rx="6" fill="#ffffff"/>
<rect x="800" y="168" width="128" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="864" y="204" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Top 5 al modelo</text>
<line x1="32" y1="352" x2="928" y2="352" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="32" y="372" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEYENDA</text>
<rect x="120" y="364" width="16" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="144" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Entrada</text>
<rect x="296" y="364" width="16" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="320" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Paso de búsqueda</text>
<rect x="472" y="364" width="16" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="496" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Fusión</text>
</svg></div><figcaption>Figura · Búsqueda híbrida: dos búsquedas, una fusión RRF y un reranker</figcaption></figure>


#### 9.1 El problema

Las dos búsquedas devuelven puntajes en escalas incompatibles:

| Posición | BM25 <span style="font-weight:400">(sin límite superior)</span> | Vector <span style="font-weight:400">(coseno 0.33–1 en Azure)</span> |
|----|----|----|
| 1 | doc_B → 12.4 | doc_A → 0.89 |
| 2 | doc_A → 9.1 | doc_C → 0.87 |
| 3 | doc_D → 3.2 | doc_B → 0.81 |

Sumar 12.4 + 0.81 tiene tanto sentido como sumar euros y kilos.

#### 9.2 La solución: RRF (Reciprocal Rank Fusion)

RRF ignora los puntajes y usa solo la posición de cada documento en cada lista:

```
RRF(doc) = Σ  1 / (k + position of doc in that list)      with k = 60 typically
       over each list
```

Tomemos los mismos rankings de arriba:

| Posición | BM25  | Vector |
|----------|-------|--------|
| 1        | doc_B | doc_A  |
| 2        | doc_A | doc_C  |
| 3        | doc_D | doc_B  |

| Doc   | Aporte de BM25    | Aporte del vector   | Total   | Final |
|-------|-------------------|---------------------|---------|-------|
| doc_A | 1/62 = 0.01613    | 1/61 = 0.01639      | 0.03252 | 1     |
| doc_B | 1/61 = 0.01639    | 1/63 = 0.01587      | 0.03226 | 2     |
| doc_C | 0                 | 1/62 = 0.01613      | 0.01613 | 3     |
| doc_D | 1/63 = 0.01587    | 0                   | 0.01587 | 4     |


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rrf-scores-title rrf-scores-desc">
      <title id="rrf-scores-title">Ejemplo de RRF con k = 60: puntaje por documento</title>
      <desc id="rrf-scores-desc">Puntaje RRF final de cuatro documentos: doc_A 0.03252 y doc_B 0.03226 aparecen en ambas listas y superan con claridad a doc_C 0.01613, solo vectorial, y a doc_D 0.01587, solo BM25.</desc>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <!-- Gridlines: escala 0 → 0.040, 80px = 0.005 (16000 px por unidad) -->
      <line x1="160" y1="64" x2="160" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="160" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.000</text>
      <line x1="240" y1="64" x2="240" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="240" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.005</text>
      <line x1="320" y1="64" x2="320" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="320" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.010</text>
      <line x1="400" y1="64" x2="400" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="400" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.015</text>
      <line x1="480" y1="64" x2="480" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="480" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.020</text>
      <line x1="560" y1="64" x2="560" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="560" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.025</text>
      <line x1="640" y1="64" x2="640" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="640" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.030</text>
      <line x1="720" y1="64" x2="720" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="720" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.035</text>
      <line x1="800" y1="64" x2="800" y2="336" stroke="rgba(0,0,0,0.08)" stroke-width="0.8"/>
      <text x="800" y="352" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">0.040</text>
      <line x1="160" y1="64" x2="160" y2="336" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>
      <line x1="160" y1="336" x2="800" y2="336" stroke="rgba(0,0,0,0.25)" stroke-width="1"/>
      <text x="480" y="376" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.14em">PUNTAJE RRF = Σ 1/(60 + POSICIÓN)</text>
      <text x="148" y="104" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_A</text>
      <rect x="160" y="80" width="520" height="40" fill="#ffffff"/>
      <rect x="160" y="80" width="520" height="40" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="688" y="104" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.03252</text>
      <text x="756" y="104" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">alto en ambas listas</text>
      <text x="148" y="168" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_B</text>
      <rect x="160" y="144" width="516" height="40" fill="#ffffff"/>
      <rect x="160" y="144" width="516" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="684" y="168" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.03226</text>
      <text x="148" y="232" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_C</text>
      <rect x="160" y="208" width="260" height="40" fill="#ffffff"/>
      <rect x="160" y="208" width="260" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="428" y="232" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.01613</text>
      <text x="496" y="232" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">solo vectorial</text>
      <text x="148" y="296" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_D</text>
      <rect x="160" y="272" width="252" height="40" fill="#ffffff"/>
      <rect x="160" y="272" width="252" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="420" y="296" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.01587</text>
      <text x="488" y="296" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">solo BM25</text>
      <text x="40" y="412" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">Posiciones, BM25: B, A, D · Vector: A, C, B</text>
      <line x1="40" y1="436" x2="920" y2="436" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="468" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEYENDA</text>
      <rect x="120" y="456" width="16" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="144" y="468" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Ganador: consenso entre listas</text>
      <rect x="400" y="456" width="16" height="16" rx="4" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="424" y="468" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Otros documentos</text>
    </svg></div><figcaption>Figura · Ejemplo de RRF con k = 60: puntaje por documento</figcaption></figure>


doc_A gana porque está arriba en las dos listas. RRF premia el acuerdo entre los dos métodos.

#### 9.3 ¿Por qué k = 60?

|  | Posición 1 | Posición 2 | Diferencia |
|----|----|----|----|
| k = 0 | 1.000 | 0.500 | el doble: ser 1.º en una sola lista domina |
| k = 60 | 0.0164 | 0.0161 | casi igual: lo que cuenta es quedar bien en varias listas |

El valor viene del paper original (Cormack, Clarke y Büttcher, SIGIR 2009), donde se eligió de forma empírica, y Azure AI Search documenta que funciona mejor con valores pequeños como 60.

#### 9.4 Ventajas, límites y variantes

RRF no necesita calibrar escalas ni entrenar nada, y acepta N listas (BM25, varios vectores, varias reformulaciones de la pregunta). Tiene dos debilidades. Ignora la magnitud, así que ser primero "por mucho" vale lo mismo que ser primero "por poco". Y una lista mala cuenta igual: si la búsqueda vectorial devuelve basura, esa basura también suma puntos.

Hay dos variantes comunes:

- El RRF ponderado le da más peso a una de las listas (por ejemplo, la vectorial ×2). Está disponible en Azure (*vector weighting*), en el `EnsembleRetriever` de LangChain † y en Google Vector Search con `rrf_ranking_alpha`.
- La combinación lineal normaliza los puntajes y los suma con pesos. Aprovecha la magnitud, pero hay que calibrarla con datos. Ejemplos son el retriever `linear` de Elasticsearch y DBSF en Qdrant †.

Ten en cuenta que **RRF no es un reranker.** Solo fusiona listas, y el reranker viene después.

### 10. Estrategias avanzadas de recuperación

| Técnica | Qué hace | Evidencia clave |
|----|----|----|
| Reescritura con historial | Convierte *"¿y cuántos días?"* en una pregunta completa usando el chat anterior | Práctica estándar |
| HyDE | Un modelo escribe una respuesta hipotética y se busca con ella | Compite con retrievers entrenados, sin necesitar etiquetas (Gao et al., 2022) |
| Multi-query / RAG-Fusion | Varias reformulaciones de la pregunta, fusionadas con RRF | Más cobertura; riesgo de desviarse del tema |
| Step-back | Primero pregunta algo más general | +27% en TimeQA, +7% en MuSiQue (Google DeepMind) |
| Descomposición | Divide una pregunta compleja en subpreguntas | Base de la búsqueda agéntica |
| RAPTOR / documento padre | Resúmenes jerárquicos; busca por chunk pequeño y devuelve el grande | RAPTOR + GPT-4: +20% absoluto en QuALITY |
| GraphRAG | Grafo de entidades + resúmenes por comunidad | Mejora las preguntas globales ("¿qué temas se repiten?"). LazyGraphRAG indexa al 0.1% del costo y consulta \>700× más barato. No siempre gana: en búsquedas puntuales el RAG clásico suele igualarlo o superarlo (Han et al., 2025/26; HippoRAG 2) |
| Adaptativo (Self-RAG, Corrective RAG, Adaptive-RAG) | Decide cuándo buscar y cuánto, y corrige si la búsqueda salió mal | Adaptive-RAG enruta según la complejidad de la pregunta |
| Agéntico / "Deep Research" | Búsqueda iterativa entrenada con aprendizaje por refuerzo | Search-R1: +41% (7B) sobre el RAG de base; OpenAI Deep Research tarda de 5 a 30 minutos por tarea |
| Contexto largo vs RAG | ¿Meter todo en el prompt? | Los modelos rinden peor cuando la información está en medio del contexto ("Lost in the Middle"); recuperar demasiado empeora la respuesta; lo eficiente es enrutar cada consulta (Self-Route), y ninguna opción gana siempre (LaRA) |

### 11. Caso de estudio: Elasticsearch

Elasticsearch tiene cuatro piezas "semánticas" distintas, y es fácil confundirlas:


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:670px" viewBox="0 0 1000 360"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-es-title rag-es-desc">
  <title id="rag-es-title">Elasticsearch: tres enfoques de recuperación sobre un tipo de campo</title>
  <desc id="rag-es-desc">Tres enfoques lado a lado en Elasticsearch, A vectores densos kNN, B disperso aprendido con ELSER y C reranking semántico, se apoyan en un tipo de campo compartido, D semantic_text, que divide el texto en chunks, genera los embeddings automáticamente y alimenta los enfoques denso y de reranking semántico.</desc>
  <defs>
    <marker id="es-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#003da5"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- arrows from D up to A and C (drawn before boxes) -->
  <path d="M300 244 V212 Q300 204 292 204 H232 Q224 204 224 196 V180" fill="none" stroke="#003da5" stroke-width="1" marker-end="url(#es-arrow)"/>
  <path d="M700 244 V212 Q700 204 708 204 H768 Q776 204 776 196 V180" fill="none" stroke="#003da5" stroke-width="1" marker-end="url(#es-arrow)"/>
  <!-- A. Dense (kNN) -->
  <rect x="40" y="72" width="280" height="108" rx="6" fill="#ffffff"/>
  <rect x="40" y="72" width="280" height="108" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <rect x="52" y="84" width="20" height="12" rx="2" fill="none" stroke="rgba(0,61,165,0.4)" stroke-width="0.8"/>
  <text x="62" y="93" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">A</text>
  <text x="180" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Denso (kNN)</text>
  <text x="180" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">campo dense_vector</text>
  <text x="180" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">consulta knn (HNSW)</text>
  <!-- B. Learned sparse -->
  <rect x="360" y="72" width="280" height="108" rx="6" fill="#ffffff"/>
  <rect x="360" y="72" width="280" height="108" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <rect x="372" y="84" width="20" height="12" rx="2" fill="none" stroke="rgba(0,61,165,0.4)" stroke-width="0.8"/>
  <text x="382" y="93" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">B</text>
  <text x="500" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Disperso aprendido</text>
  <text x="500" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">ELSER · campo sparse_vector</text>
  <text x="500" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">expande términos, no sinónimos</text>
  <!-- C. Semantic reranking -->
  <rect x="680" y="72" width="280" height="108" rx="6" fill="#ffffff"/>
  <rect x="680" y="72" width="280" height="108" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <rect x="692" y="84" width="20" height="12" rx="2" fill="none" stroke="rgba(0,61,165,0.4)" stroke-width="0.8"/>
  <text x="702" y="93" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">C</text>
  <text x="820" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Reranking semántico</text>
  <text x="820" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">text_similarity_reranker</text>
  <text x="820" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">/ RERANK en ES|QL</text>
  <!-- D. semantic_text (highlighted, underpins A and C) -->
  <rect x="40" y="244" width="920" height="72" rx="6" fill="#ffffff"/>
  <rect x="40" y="244" width="920" height="72" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <rect x="52" y="256" width="20" height="12" rx="2" fill="none" stroke="#fedb00" stroke-width="1"/>
  <text x="62" y="265" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">D</text>
  <text x="500" y="278" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">tipo de campo semantic_text</text>
  <text x="500" y="298" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">hace el chunking y genera los embeddings solo, la opción por defecto más sencilla, que alimenta A y C</text>
  <!-- legend -->
  <line x1="40" y1="336" x2="960" y2="336" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
  <text x="40" y="352" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">LEYENDA</text>
  <rect x="112" y="344" width="12" height="12" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <text x="130" y="353" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Enfoque de recuperación</text>
  <rect x="300" y="344" width="12" height="12" rx="2" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="318" y="353" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Tipo de campo compartido que los alimenta</text>
</svg></div><figcaption>Elasticsearch: tres enfoques de recuperación (A·B·C) sobre el campo compartido semantic_text (D)</figcaption></figure>


- A. Denso: `dense_vector` + consulta `knn`, con cuantización int8, int4 y BBQ. Puedes usar E5 (multilingüe), Jina (a través del Elastic Inference Service) o modelos externos (OpenAI, Azure OpenAI, Cohere, Bedrock, Vertex AI, Hugging Face).
- B. ELSER expande términos. Lo que aporta son asociaciones aprendidas, no sinónimos. En el benchmark BEIR de la propia Elastic mejora nDCG@10 sobre BM25 en un 18% en promedio (10 victorias, 1 empate, 1 derrota). Se recomienda para inglés, lee 512 tokens por campo y requiere una suscripción de pago.
- C. Reranker: el retriever `text_similarity_reranker` o el comando `RERANK` en ES\|QL.
- D. `semantic_text` (GA desde la versión 9.0). Si no fijas `inference_id`, los índices nuevos pueden usar otro modelo después de actualizar de versión, así que **fija siempre el modelo en producción**.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="elastic-retrievers-title elastic-retrievers-desc">
      <title id="elastic-retrievers-title">Elasticsearch: árbol de retrievers para búsqueda híbrida con reranker</title>
      <desc id="elastic-retrievers-desc">Tres niveles anidados: el retriever externo text_similarity_reranker reordena el top 50 con un modelo de rerank; dentro, rrf fusiona dos retrievers standard: match con BM25 sobre content y semantic sobre un campo semantic_text.</desc>
      <defs>
        <marker id="elastic-retrievers-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
        <marker id="elastic-retrievers-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
        <marker id="elastic-retrievers-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="40" y="40" width="880" height="400" rx="8" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <rect x="56" y="32" width="200" height="16" rx="2" fill="#ffffff"/>
      <text x="64" y="44" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">RETRIEVER EXTERNO · RERANK</text>
      <text x="72" y="84" fill="#2d3142" font-size="16" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="start">text_similarity_reranker</text>
      <text x="72" y="108" fill="#2d3142" font-size="12" font-weight="500" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">reordena el top 50 con un modelo de rerank · <tspan font-family="Meslo, Menlo, monospace" font-size="12" font-weight="400" fill="#4f5d75">inference_id</tspan></text>
      <rect x="72" y="136" width="816" height="272" rx="8" fill="#ffffff" stroke="#4f5d75" stroke-width="1"/>
      <rect x="88" y="128" width="64" height="16" rx="2" fill="#ffffff"/>
      <text x="96" y="140" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">FUSIÓN</text>
      <text x="104" y="176" fill="#2d3142" font-size="16" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="start">rrf</text>
      <text x="104" y="196" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="start">rank_window_size 50 · rank_constant 60</text>
      <rect x="104" y="228" width="360" height="148" rx="8" fill="rgba(0,0,0,0.02)" stroke="#2d3142" stroke-width="1"/>
      <rect x="120" y="220" width="120" height="16" rx="2" fill="#ffffff"/>
      <text x="128" y="232" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">RETRIEVER HOJA</text>
      <text x="284" y="276" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="middle">standard · match</text>
      <text x="284" y="308" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">BM25</text>
      <text x="284" y="332" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">sobre el campo content</text>
      <rect x="496" y="228" width="360" height="148" rx="8" fill="rgba(0,0,0,0.02)" stroke="#2d3142" stroke-width="1"/>
      <rect x="512" y="220" width="120" height="16" rx="2" fill="#ffffff"/>
      <text x="520" y="232" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">RETRIEVER HOJA</text>
      <text x="676" y="276" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="middle">standard · semantic</text>
      <text x="676" y="308" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Denso o ELSER</text>
      <text x="676" y="332" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">campo semantic_text</text>
      <text x="40" y="484" fill="#7a8399" font-size="14" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start" font-style="italic">Alternativa a <tspan font-family="Meslo, Menlo, monospace" font-style="normal" font-size="12">rrf</tspan>: el retriever <tspan font-family="Meslo, Menlo, monospace" font-style="normal" font-size="12">linear</tspan> (minmax / l2_norm)</text>
    </svg></div><figcaption>Figura · Elasticsearch: árbol de retrievers para búsqueda híbrida con reranker</figcaption></figure>


Así se ve una búsqueda híbrida con reranker en una sola llamada:

``` json
{
  "retriever": {
    "text_similarity_reranker": {
      "retriever": {
        "rrf": {
          "retrievers": [
            { "standard": { "query": { "match":    { "content": "remote work days manager Spain" } } } },
            { "standard": { "query": { "semantic": { "field": "content_semantic",
                                                     "query": "remote work days manager Spain" } } } }
          ],
          "rank_window_size": 50,
          "rank_constant": 60
        }
      },
      "field": "content",
      "inference_id": "my-rerank-endpoint",
      "inference_text": "remote work days manager Spain",
      "rank_window_size": 50
    }
  }
}
```

También puedes fusionar con el retriever `linear` (normalizadores `minmax` o `l2_norm`) o, en ES\|QL, con `FORK` + `FUSE` (RRF o LINEAR) + `RERANK`. En el formato multi-field, Elastic normaliza los campos léxicos y los semánticos para que cada grupo aporte el 50%.

Ojo con el vocabulario. En Elastic, *"semantic search"* significa buscar con embeddings; en Azure, el *"semantic ranker"* es un reranker.

## Parte IV · Reranking

### 12. Reranking

#### 12.1 Qué es

Un **reranker** toma los ~50–150 candidatos de la búsqueda y los reordena leyendo juntos la pregunta y cada chunk. Eso es más preciso que comparar vectores, pero más lento, así que solo se aplica a unos pocos candidatos.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 464" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="bi-vs-cross-encoder-title bi-vs-cross-encoder-desc">
<title id="bi-vs-cross-encoder-title">Embeddings (bi-encoder) vs. reranker (cross-encoder)</title>
<desc id="bi-vs-cross-encoder-desc">El bi-encoder convierte la pregunta y el chunk en vectores por separado y compara su distancia, rápido para millones de chunks; el cross-encoder lee juntos la pregunta y el chunk y da un puntaje de relevancia preciso para 50–150 candidatos.</desc>
<defs>
<marker id="bi-vs-cross-encoder-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="bi-vs-cross-encoder-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="bi-vs-cross-encoder-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="32" y="56" width="896" height="176" rx="8" fill="#f3f4f6" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
<text x="48" y="76" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">BI-ENCODER · BÚSQUEDA</text>
<rect x="32" y="256" width="896" height="128" rx="8" fill="#f3f4f6" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
<text x="48" y="276" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">CROSS-ENCODER · RERANKER</text>
<path d="M 208,120 H 272" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#bi-vs-cross-encoder-arrow)"/>
<path d="M 208,192 H 272" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#bi-vs-cross-encoder-arrow)"/>
<path d="M 448,120 H 472 Q 480,120 480,128 V 140 Q 480,148 488,148 H 512" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#bi-vs-cross-encoder-arrow)"/>
<path d="M 448,192 H 472 Q 480,192 480,184 V 172 Q 480,164 488,164 H 512" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#bi-vs-cross-encoder-arrow)"/>
<path d="M 272,328 H 336" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#bi-vs-cross-encoder-arrow)"/>
<path d="M 512,328 H 576" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#bi-vs-cross-encoder-arrow)"/>
<rect x="216" y="100" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="240" y="108" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">EMBEDDING</text>
<rect x="216" y="172" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="240" y="180" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">EMBEDDING</text>
<rect x="520" y="308" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="544" y="316" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">PUNTAJES</text>
<rect x="64" y="96" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="96" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="136" y="124" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Pregunta</text>
<rect x="64" y="168" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="168" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="136" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Chunk</text>
<rect x="272" y="96" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="272" y="96" width="176" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="360" y="124" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Vector de pregunta</text>
<rect x="272" y="168" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="272" y="168" width="176" height="48" rx="6" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="360" y="188" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Vector del chunk</text>
<text x="360" y="204" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">precalculado</text>
<rect x="512" y="132" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="512" y="132" width="144" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="152" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Distancia</text>
<text x="584" y="168" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">entre vectores</text>
<rect x="64" y="304" width="208" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="304" width="208" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="168" y="324" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Pregunta + chunk</text>
<text x="168" y="340" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">juntos</text>
<rect x="336" y="304" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="336" y="304" width="176" height="48" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="424" y="324" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Modelo reranker</text>
<text x="424" y="340" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">cross-encoder</text>
<rect x="576" y="304" width="160" height="48" rx="6" fill="#ffffff"/>
<rect x="576" y="304" width="160" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="656" y="332" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Relevancia</text>
<text x="704" y="132" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Rápido</text>
<text x="704" y="148" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Precalculable</text>
<text x="704" y="164" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Millones de chunks</text>
<text x="768" y="308" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Preciso</text>
<text x="768" y="324" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Se calcula por par</text>
<text x="768" y="340" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Solo 50–150 candidatos</text>
<line x1="32" y1="412" x2="928" y2="412" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="32" y="432" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEYENDA</text>
<rect x="120" y="424" width="16" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="144" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Entrada</text>
<rect x="296" y="424" width="16" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="320" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Cálculo</text>
<rect x="472" y="424" width="16" height="12" rx="2" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="496" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Precalculado</text>
<rect x="648" y="424" width="16" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="672" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Reranker</text>
</svg></div><figcaption>Figura · Embeddings (bi-encoder) vs. reranker (cross-encoder)</figcaption></figure>


La arquitectura típica tiene dos etapas: una búsqueda híbrida (que prioriza la cobertura), luego un reranker sobre 100–150 candidatos y, al final, entre 10 y 20 chunks que pasan al modelo que escribe la respuesta.

#### 12.2 Tipos

| Tipo | Ejemplos | Nota |
|----|----|----|
| Cross-encoder clásico | monoBERT, bge-reranker-v2-m3 | monoBERT: +27% en MRR@10 en MS MARCO (2019) |
| Modelo de lenguaje como reranker | RankGPT, RankZephyr (código abierto), Setwise | RankZephyr iguala o supera a GPT-4 |
| Reranker con razonamiento (2025–26) | Rank1, Rank-R1, ReasonRank | En BRIGHT (búsqueda que requiere razonamiento), el mejor modelo de MTEB cae de 59.0 a 18.3; razonar sobre la pregunta suma hasta +12.2 |
| Interacción tardía | ColBERT | Punto intermedio: ~100× más rápido que un reranker BERT |

#### 12.3 Modelos destacados (verificados)

| Modelo | Organización / fecha | Licencia | Dato |
|----|----|----|----|
| Rerank 4 Pro / Fast | Cohere, dic. 2025 | Servicio de pago | \#2 en el leaderboard independiente de Agentset (1627 puntos Elo vs ~1457 de v3.5) |
| zerank-2 | ZeroEntropy | Pesos abiertos | \#1 en Agentset |
| rerank-2.5 | Voyage (MongoDB), ago. 2025 | Servicio de pago | Contexto de 32K, sigue instrucciones |
| Qwen3-Reranker 0.6/4/8B | Alibaba, jun. 2025 | Apache 2.0 | 69.76 en MTEB-R (4B) vs 57.03 de bge-v2-m3 |
| jina-reranker-v3.5 | Jina, jul. 2026 | No comercial | 63.20 en BEIR con 0.6B parámetros |
| mxbai-rerank-large-v2 | Mixedbread, mar. 2025 | Apache 2.0 | 57.49 en BEIR |
| Semantic ranker | Microsoft (Azure AI Search) | Servicio administrado | Reordena el top 50, puntaje de 0 a 4 |
| Ranking API | Google | Servicio administrado | Hasta 1000 chunks por llamada, puntaje de 0 a 1 |

#### 12.4 Reglas prácticas

Un reranker es la mejora más barata y más probada que puedes hacer. En las cifras de Anthropic, agregar solo eso lleva la tasa de fallas de 2.9% a 1.9%.

Pero **el reranker solo reordena lo que la búsqueda encontró.** Si el documento correcto no está entre los candidatos, no te puede salvar, y por eso primero se mide la cobertura de la recuperación (recall).

Lo que hoy distingue a unos rerankers de otros es que siguen instrucciones: les puedes dar reglas de negocio como "prioriza el contenido reciente". Cada proveedor dice ser el mejor, así que mide con tus propios datos.

Algunos complementos valen la pena. MMR elimina chunks redundantes. La compresión con LongLLMLingua da +21.4% de calidad con ~4× menos tokens. Y la posición en el prompt importa: pon lo más relevante al principio o al final ("Lost in the Middle").

## Parte V · Generación y guardrails

### 13. Generación con citas y guardrails

El prompt se ve así:

```
System:   Answer ONLY from the context. Cite every claim as [n].
          If the context does not contain the answer, say "I don't know".
Context:  [1] Remote Work Policy §3.2 Spain, p. 4: "Manager: 2 days/week..."
          [2] 2026 Annex, p. 1: "...starting January 2026, 3 days for..."
Question: remote work days for a manager in Spain
```

Los guardrails actúan antes, durante y después de la generación:

1.  Antes, detectar intentos de manipular el modelo ("jailbreak" o prompt injection).
2.  Durante, si el reranker no deja ningún chunk por encima del umbral, responder "No encontré esa información" en vez de inventar algo.
3.  Después, verificar que cada oración de la respuesta esté respaldada por los chunks. Si la verificación falla, regenerar o responder con cautela.

## Parte VI · Evaluación

### 14. Dos pruebas separadas


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 580" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="eval-cuadrante-title eval-cuadrante-desc">
      <title id="eval-cuadrante-title">Dos pruebas: ¿recuperó bien? ¿respondió bien?</title>
      <desc id="eval-cuadrante-desc">Matriz de 2×2 que cruza si la recuperación encontró los documentos correctos con si la respuesta fue buena, y nombra la acción para cada caso; la prioridad es arreglar primero la recuperación cuando las dos fallan.</desc>
      <defs>
        <marker id="eval-cuadrante-axis-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0 0, 8 4, 0 8" fill="#2d3142"/></marker>
        <marker id="eval-cuadrante-axis-start" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><polygon points="8 0, 0 4, 8 8" fill="#2d3142"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="120" y="276" width="360" height="204" fill="rgba(235,108,54,0.04)"/>
      <rect x="160" y="96" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="176" y="120" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">01 · RECUPERACIÓN NO / RESPUESTA SÍ</text>
      <text x="176" y="152" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Suerte</text>
      <text x="176" y="200" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">El modelo lo sabía de memoria.</text>
      <text x="176" y="216" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Peligroso.</text>
      <rect x="520" y="96" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="536" y="120" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">02 · RECUPERACIÓN SÍ / RESPUESTA SÍ</text>
      <text x="536" y="152" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Todo bien</text>
      <text x="536" y="200" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Mantenlo y monitorea.</text>
      <rect x="160" y="296" width="280" height="160" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="176" y="320" fill="#4f5d75" font-size="8" font-weight="600" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">03 · RECUPERACIÓN NO / RESPUESTA NO</text>
      <text x="176" y="352" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Arregla primero</text>
      <text x="176" y="372" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">la recuperación</text>
      <text x="176" y="408" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Chunking, híbrida, reranker,</text>
      <text x="176" y="424" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">número de resultados.</text>
      <rect x="520" y="296" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="536" y="320" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">04 · RECUPERACIÓN SÍ / RESPUESTA NO</text>
      <text x="536" y="352" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Arregla el prompt</text>
      <text x="536" y="372" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">o el modelo</text>
      <text x="536" y="408" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Alucina o ignora el contexto.</text>
      <line x1="128" y1="276" x2="832" y2="276" stroke="#2d3142" stroke-width="1.2" marker-start="url(#eval-cuadrante-axis-start)" marker-end="url(#eval-cuadrante-axis-end)"/>
      <line x1="480" y1="72" x2="480" y2="480" stroke="#2d3142" stroke-width="1.2" marker-start="url(#eval-cuadrante-axis-start)" marker-end="url(#eval-cuadrante-axis-end)"/>
      <text x="480" y="60" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">SÍ</text>
      <text x="496" y="64" fill="#4f5d75" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Respuesta: ¿respondió bien?</text>
      <text x="480" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">NO</text>
      <text x="116" y="280" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="end" letter-spacing="0.18em">NO</text>
      <text x="844" y="280" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">SÍ</text>
      <text x="832" y="504" fill="#4f5d75" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">Recuperación: ¿encontró los documentos correctos?</text>
      <line x1="40" y1="528" x2="920" y2="528" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="556" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEYENDA</text>
      <rect x="120" y="544" width="16" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="144" y="556" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Prioridad: empieza aquí</text>
      <rect x="360" y="544" width="16" height="16" rx="4" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="384" y="556" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Otros casos</text>
    </svg></div><figcaption>Figura · Dos pruebas: ¿recuperó bien? ¿respondió bien?</figcaption></figure>


Si solo miras la respuesta final, no sabes qué arreglar. Microsoft llama *process evaluation* a la evaluación del paso de recuperación y *system evaluation* a la evaluación de la respuesta.

### 15. El golden dataset (la "clave de respuestas")

El golden dataset es un conjunto de 100 a 300 preguntas, cada una con su respuesta correcta y los documentos que deberían aparecer:

``` json
{"query": "Remote work days, manager, Spain?",
 "ground_truth": "2 days per week; 3 from January 2026 according to the annex",
 "relevant_docs": [{"document_id": "teletrabajo_p4", "query_relevance_label": 4},
                   {"document_id": "anexo2026_p1",  "query_relevance_label": 3}]}
```

| De dónde salen las preguntas | Por qué |
|----|----|
| Logs de preguntas reales | Es lo que la gente pregunta de verdad |
| Expertos del negocio (recursos humanos, legal) | Casos difíciles y trampas |
| Generación sintética (RAGAS, simuladores de los proveedores de nube) | Cobertura rápida, pero siempre con revisión humana |
| Preguntas sin respuesta en los documentos | Comprueban que el sistema diga "no sé" en vez de inventar |

### 16. Métricas de recuperación, con números

Digamos que para una pregunta los documentos correctos son A y C, y el buscador devolvió `[B, A, D, C, E]`.

| Posición     | 1   | 2   | 3   | 4   | 5   |
|--------------|-----|-----|-----|-----|-----|
| Devuelto     | B   | A   | D   | C   | E   |
| ¿Correcto?   | ✗   | ✓   | ✗   | ✓   | ✗   |

| Métrica | Pregunta que responde | Cálculo | Valor |
|----|----|----|----|
| Recall@3 (cobertura) | ¿Cuántos de los correctos aparecen en el top 3? | 1 de 2 | 0.50 |
| Recall@5 | ¿Y en el top 5? | 2 de 2 | 1.00 |
| Precision@5 (precisión) | De lo que traje, ¿cuánto sirve? | 2 de 5 | 0.40 |
| MRR (posición del primer acierto) | ¿Qué tan arriba está el primero correcto? | 1/2 | 0.50 |
| nDCG@5 (calidad del ranking) | ¿Están los correctos lo más arriba posible? | Real = 1/log₂3 + 1/log₂5 = 1.06; ideal = 1 + 1/log₂3 = 1.63 | 0.65 |

Estos números te dicen dónde buscar. Si Recall@50 es bajo, el problema está en la recuperación (chunking, embeddings, falta de BM25), y el reranker no lo va a arreglar. Si Recall@50 es alto pero nDCG@5 es bajo, el problema está en el reranker.

### 17. Métricas de respuesta, con números

Supón que el sistema responde: *"Tienes 2 días por semana \[1\], 3 a partir de enero de 2026 \[2\], y puedes elegir los viernes."*

| Afirmación en la respuesta | ¿La respaldan los chunks? |
|----------------------------|---------------------------|
| `"2 days/week"`            | ✓                         |
| `"3 from January 2026"`    | ✓                         |
| `"you can choose Fridays"` | ✗ (inventado)             |

| Métrica | Pregunta | Resultado |
|----|----|----|
| Groundedness / Faithfulness (el lado de la *precisión*) | ¿Todo lo que dijo está en los chunks? | 2/3 = 0.67 ✗ alucinación |
| Completeness / Answer correctness (el lado de la *cobertura*) | ¿Dijo todo lo que dice la respuesta correcta? | 2/2 = 1.0 ✓ |
| Relevance | ¿Responde lo que se preguntó? | ✓ |
| Citas correctas | ¿Cada \[n\] respalda su oración? | ✓ |

Microsoft lo plantea igual: la fidelidad al contexto es el lado de la precisión (no agregar nada) y la completitud es el lado de la cobertura (no dejar fuera nada crítico).

Otra opción es la evaluación por "nuggets" (TREC 2024): defines los hechos atómicos que debe contener una buena respuesta y cuentas cuántos aparecen.

### 18. El LLM como juez

Nadie revisa 10,000 respuestas a mano, así que otro modelo hace de profesor. Ese juez tiene sesgos conocidos. Prefiere la primera opción que ve (posición), prefiere las respuestas largas (verbosidad) y prefiere el texto de su propia familia de modelos (autopreferencia).

Para montar un juez, apóyate en esto:

1.  Una persona etiqueta 50–100 casos.
2.  Mide el acuerdo entre juez y humano (kappa de Cohen, exactitud, F1).
3.  El juez debe ser de una familia de modelos distinta a la del generador.
4.  El juez debe explicar su puntaje.
5.  Puntuar afirmación por afirmación (RAGChecker) o por nuggets es mejor que dar un solo puntaje global.

¿Cuánto puedes confiar en él? GPT-4 como juez alcanza más del 80% de acuerdo con humanos, el mismo nivel que entre dos humanos (Zheng et al., 2023). En TREC 2024, el acuerdo perfecto entre humanos y GPT-4o fue de 56%, y de 72% cuando el humano corregía la etiqueta del modelo. Así que el juez LLM es confiable para comparar sistemas y menos confiable pregunta por pregunta. ARES combina unos cientos de etiquetas humanas con el juez automático para producir intervalos de confianza estadísticamente válidos.

### 19. Evaluación antes del despliegue y en producción


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 664" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="eval-bucle-title eval-bucle-desc">
      <title id="eval-bucle-title">El ciclo de evaluación continua</title>
      <desc id="eval-bucle-desc">Ciclo de seis pasos en sentido horario: golden dataset, evaluación offline, quality gate, despliegue, evaluación continua y fallas reales con votos de pulgar abajo, que vuelven a alimentar el golden dataset; en el centro, las métricas de recuperación y de respuesta.</desc>
      <defs>
        <marker id="eval-bucle-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
        <marker id="eval-bucle-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
        <marker id="eval-bucle-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <!-- arcos del anillo (antes que las cajas) -->
      <path d="M 580 97.826 A 240 240 0 0 1 661.602 159.09" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <path d="M 704.82 232 A 240 240 0 0 1 705.237 398.875" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <path d="M 662.384 472 A 240 240 0 0 1 581.09 533.672" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <path d="M 380 534.174 A 240 240 0 0 1 298.398 472.91" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <path d="M 255.18 400 A 240 240 0 0 1 254.763 233.125" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <path d="M 297.616 160 A 240 240 0 0 1 378.91 98.328" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <path d="M 625.6 232 L 575.33 261.002" fill="none" stroke="#4f5d75" stroke-width="1" stroke-dasharray="5,4" marker-end="url(#eval-bucle-arrow)"/>
      <path d="M 334.4 400 L 384.67 370.998" fill="none" stroke="#4f5d75" stroke-width="1" stroke-dasharray="5,4" marker-end="url(#eval-bucle-arrow)"/>
      <rect x="608" y="248" width="56" height="12" rx="2" fill="#ffffff"/>
      <text x="636" y="256" fill="#7a8399" font-size="8" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">MÉTRICAS</text>
      <rect x="296" y="372" width="56" height="12" rx="2" fill="#ffffff"/>
      <text x="324" y="380" fill="#7a8399" font-size="8" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">MUESTRAS</text>
      <!-- hub -->
      <rect x="356" y="264" width="248" height="104" rx="8" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
      <text x="480" y="292" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">NÚCLEO COMÚN</text>
      <text x="480" y="320" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Métricas de retrieval</text>
      <text x="480" y="340" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">y de respuesta</text>
      <rect x="380" y="40" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="380" y="40" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="480" y="68" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Golden dataset</text>
      <text x="480" y="80" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">100–300 preguntas + respuestas</text>
      <text x="480" y="92" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">+ documentos</text>
      <rect x="588" y="160" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="588" y="160" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="688" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Evaluación offline</text>
      <text x="688" y="208" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">recall@k · nDCG · faithfulness</text>
      <rect x="588" y="400" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="588" y="400" width="200" height="72" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="688" y="428" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Quality gate</text>
      <text x="688" y="440" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">integración continua</text>
      <text x="688" y="452" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">bloquea si hay regresión</text>
      <rect x="380" y="520" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="380" y="520" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="480" y="560" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Despliegue</text>
      <rect x="172" y="400" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="172" y="400" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="272" y="428" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Evaluación continua</text>
      <text x="272" y="440" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">muestra de tráfico real</text>
      <text x="272" y="452" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">sin respuesta esperada</text>
      <rect x="172" y="160" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="172" y="160" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="272" y="192" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Fallas reales</text>
      <text x="272" y="208" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">y pulgares abajo</text>
      <line x1="40" y1="612" x2="920" y2="612" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="632" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">LEYENDA</text>
      <line x1="140" y1="628" x2="176" y2="628" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <text x="184" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Paso del ciclo</text>
      <line x1="328" y1="628" x2="364" y2="628" stroke="#4f5d75" stroke-width="1" stroke-dasharray="5,4" marker-end="url(#eval-bucle-arrow)"/>
      <text x="372" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Escribe en las métricas</text>
      <rect x="580" y="620" width="24" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="612" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Quality gate</text>
    </svg></div><figcaption>Figura · El ciclo de evaluación continua</figcaption></figure>


Un quality gate en integración continua podría exigir que Recall@10 no baje más de 2 puntos, que faithfulness se mantenga ≥ 95% y que las respuestas "no sé" correctas se mantengan ≥ 90%. Esos umbrales son solo ejemplos; los reales los fija el negocio. En producción se muestrea un porcentaje del tráfico real y se evalúa sin respuesta de referencia (faithfulness, answer relevance, context relevance), junto con los votos de pulgar arriba/abajo, la latencia y el costo.

Microsoft recomienda un barrido de parámetros: probar combinaciones y medir cuál gana. Los números de abajo son ilustrativos, no resultados reales:

| Configuración | Recall@10 | nDCG@5 | Faithfulness | Latencia |
|----|----|----|----|----|
| solo vector | 0.71 | 0.58 | 0.90 | 0.8 s |
| híbrida | 0.84 | 0.66 | 0.92 | 0.9 s |
| híbrida + rerank ← elegida | 0.84 | 0.79 | 0.95 | 1.3 s |
| \+ agéntico <span style="font-weight:400">(solo preguntas complejas)</span> | 0.88 | 0.81 | 0.95 | 3.5 s |

DeepEval sugiere no pasar de unas 5 métricas por aplicación. MLflow / Databricks recomiendan usar los mismos evaluadores en desarrollo y en producción. Y en producción solo puedes usar métricas que no necesiten una respuesta correcta.

### 20. Por qué importa: la alucinación en sistemas reales

| Estudio | Resultado |
|----|----|
| Stanford (2024): herramientas legales comerciales con RAG | Alucinan entre 17% y 33% de las veces |
| CRAG (Meta, 2024) | Modelo solo: ≤34% de exactitud; RAG simple: 44%; los mejores sistemas RAG industriales responden sin alucinar solo el 63% de las veces |
| FinanceBench (2023) | GPT-4-Turbo con recuperación falló o se negó a responder en el 81% de los casos |
| ALCE (2023) | Incluso los mejores modelos no tienen respaldo completo para sus citas el 50% de las veces |
| Vectara (leaderboard del 2026-09-22, tarea de resumen) | Tasas de alucinación entre 1.8% y 24.2% según el modelo (GPT-4o 9.6%, Gemini 2.5 Pro 7.0%, Claude Sonnet 4.5 12.0%) |
| FaithBench (2024) | Los mejores detectores de alucinación rondan el 50% de exactitud en los casos difíciles |

Varias de estas cifras son de 2023–2024 y vienen de modelos más viejos, así que cítalas siempre con año y modelo.

## Parte VII · Un ejemplo en producción sobre Azure

### 21. Copiloto de políticas internas, paso a paso

El caso es una empresa de 20,000 empleados, con documentos de recursos humanos, legal y compras en SharePoint y Blob Storage. Necesita permisos por usuario, citas en cada respuesta y un "no sé" cuando no hay información.

#### 21.1 Arquitectura


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 608" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="azure-arquitectura-title azure-arquitectura-desc">
<title id="azure-arquitectura-title">Copiloto de políticas internas en Azure</title>
<desc id="azure-arquitectura-desc">Arquitectura en Azure de un copiloto de políticas: la ingesta toma los documentos de SharePoint o Blob mediante un indexador con un skillset y los lleva a Azure AI Search; la app responde al usuario con búsqueda, Azure OpenAI y Content Safety; Application Insights y Foundry evalúan y observan.</desc>
<defs>
<marker id="azure-arquitectura-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="azure-arquitectura-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="azure-arquitectura-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="40" y="40" width="880" height="120" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="44" width="76" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="53" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">INGESTA</text>
<rect x="40" y="200" width="880" height="200" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="204" width="84" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="213" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">CONSULTA</text>
<rect x="40" y="424" width="880" height="120" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="428" width="204" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="437" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">EVALUACIÓN Y OBSERVABILIDAD</text>
<path d="M 296,104 H 368" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="300" y="84" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="332" y="93" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">DOCUMENTOS</text>
<path d="M 592,104 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="604" y="84" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="93" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">INDEXA</text>
<path d="M 296,264 H 368" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="304" y="244" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="332" y="253" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">PREGUNTA</text>
<path d="M 592,264 H 664" fill="none" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<rect x="600" y="244" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="253" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">GENERA</text>
<path d="M 560,232 V 200 Q 560,192 568,192 H 736 Q 744,192 744,184 V 136" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="620" y="200" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="652" y="209" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">BUSCA</text>
<path d="M 512,136 V 164 Q 512,172 520,172 H 736 a 8,8 0 0,1 16,0 H 768 Q 776,172 776,180 V 232" fill="none" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<rect x="584" y="152" width="72" height="12" rx="2" fill="#ffffff"/>
<text x="620" y="161" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">EMBEDDINGS</text>
<path d="M 560,296 V 344 Q 560,352 568,352 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="584" y="332" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="616" y="341" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">VERIFICA</text>
<path d="M 480,296 V 456" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="412" y="336" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="440" y="345" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TRAZAS</text>
<path d="M 592,488 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="600" y="468" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="477" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">MUESTRAS</text>
<rect x="72" y="72" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="72" y="72" width="224" height="64" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="184" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">SharePoint / Blob Storage</text>
<text x="184" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">PDF · DOCX · PPTX</text>
<rect x="368" y="72" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="368" y="72" width="224" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="480" y="92" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Indexador + skillset</text>
<text x="480" y="108" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">Document Layout skill</text>
<text x="480" y="120" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">chunking · embeddings</text>
<rect x="664" y="72" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="664" y="72" width="224" height="64" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="776" y="92" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Azure AI Search</text>
<text x="776" y="108" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">BM25 + vector · RRF</text>
<text x="776" y="120" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">semantic ranker · allowed_groups</text>
<rect x="72" y="232" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="72" y="232" width="224" height="64" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="184" y="256" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Usuario</text>
<text x="184" y="272" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">login con Entra ID</text>
<rect x="368" y="232" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="368" y="232" width="224" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="480" y="256" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">App</text>
<text x="480" y="272" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">Container Apps / App Service</text>
<rect x="664" y="232" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="664" y="232" width="224" height="64" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="776" y="256" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Azure OpenAI</text>
<text x="776" y="272" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">GPT · text-embedding-3</text>
<rect x="664" y="320" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="664" y="320" width="224" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="776" y="340" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Content Safety</text>
<text x="776" y="356" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">detección de manipulación †</text>
<text x="776" y="368" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">fidelidad (groundedness)</text>
<rect x="368" y="456" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="368" y="456" width="224" height="64" rx="6" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="480" y="480" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Application Insights</text>
<text x="480" y="496" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">trazas OpenTelemetry</text>
<rect x="664" y="456" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="664" y="456" width="224" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="776" y="476" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Evaluación en Foundry</text>
<text x="776" y="492" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">evaluadores</text>
<text x="776" y="504" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">evaluación continua</text>
<line x1="40" y1="568" x2="920" y2="568" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="40" y="588" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEYENDA</text>
<rect x="112" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="112" y="580" width="20" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="144" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">CLAVE</text>
<rect x="192" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="192" y="580" width="20" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="224" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">SERVICIO</text>
<rect x="292" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="292" y="580" width="20" height="12" rx="2" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="324" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">EXTERNO</text>
<rect x="388" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="388" y="580" width="20" height="12" rx="2" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="420" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">ALMACÉN</text>
<rect x="484" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="484" y="580" width="20" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="516" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">ENTRADA</text>
<line x1="580" y1="584" x2="604" y2="584" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<text x="612" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FLUJO</text>
<line x1="668" y1="584" x2="692" y2="584" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<text x="700" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">LLAMADA AL MODELO</text>
</svg></div><figcaption>Figura · Copiloto de políticas internas en Azure</figcaption></figure>


Si conoces el stack LangChain + Chroma/Qdrant, las piezas se corresponden así:

| Stack de código abierto | En Azure |
|----|----|
| Loaders de LangChain + text splitter | Indexador + Document Layout skill + chunking |
| Chroma / Qdrant | Azure AI Search (vectores + BM25 + filtros en un solo servicio) |
| Reranking con un modelo de lenguaje | Semantic ranker (y opcionalmente un modelo de lenguaje detrás) |
| Tu propia reescritura de consultas | Reescritura de consultas del semantic ranker (preview) o agentic retrieval |
| GraphRAG | Microsoft GraphRAG como índice aparte, solo para preguntas globales |

#### 21.2 Una pregunta, de punta a punta

Ana, gerente en Madrid, preguntó antes en el chat por su contrato. Ahora escribe *"entonces, ¿cuántos días puedo teletrabajar?"*


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 736" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="azure-secuencia-title azure-secuencia-desc">
      <title id="azure-secuencia-title">Una pregunta de punta a punta: “entonces, ¿cuántos días puedo teletrabajar?”</title>
      <desc id="azure-secuencia-desc">Secuencia en la que la app reescribe la pregunta de Ana con Azure OpenAI, recupera chunks con búsqueda híbrida y el semantic ranker en Azure AI Search, genera una respuesta con citas y la verifica con Content Safety antes de responder con citas o “no sé”.</desc>
      <defs>
        <marker id="azure-secuencia-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
        <marker id="azure-secuencia-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
        <marker id="azure-secuencia-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <line x1="112" y1="80" x2="112" y2="672" stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="296" y1="80" x2="296" y2="672" stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="480" y1="80" x2="480" y2="672" stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="664" y1="80" x2="664" y2="672" stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="848" y1="80" x2="848" y2="672" stroke="rgba(0,0,0,0.20)" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="112" y1="136" x2="292" y2="136" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="148" y="116" width="112" height="12" rx="2" fill="#ffffff"/>
      <text x="204" y="124" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">pregunta + historial</text>
      <line x1="300" y1="184" x2="476" y2="184" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="328" y="164" width="120" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="172" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">reescribir la pregunta</text>
      <line x1="476" y1="232" x2="300" y2="232" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="304" y="212" width="168" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="220" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">«días teletrabajo gerente España»</text>
      <line x1="300" y1="280" x2="660" y2="280" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="304" y="260" width="168" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="268" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">búsqueda híbrida + permisos</text>
      <path d="M668 324 H696 Q704 324 704 332 V356 Q704 364 696 364 H672" fill="none" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="712" y="324" width="96" height="44" rx="2" fill="#ffffff"/>
      <text x="716" y="336" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">RRF (k=60)</text>
      <text x="716" y="348" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">+ semantic ranker</text>
      <text x="716" y="360" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">top 50 → score 0–4</text>
      <line x1="660" y1="404" x2="300" y2="404" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="316" y="384" width="144" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="392" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">5–10 chunks con score ≥ 2</text>
      <line x1="300" y1="452" x2="476" y2="452" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="320" y="432" width="136" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="440" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">generar con citas [n]</text>
      <line x1="476" y1="500" x2="300" y2="500" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="336" y="480" width="104" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="488" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">borrador con citas</text>
      <line x1="300" y1="548" x2="844" y2="548" stroke="#eb6c36" stroke-width="1.2" marker-end="url(#azure-secuencia-arrow-accent)"/>
      <rect x="676" y="528" width="160" height="12" rx="2" fill="#ffffff"/>
      <text x="756" y="536" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">verificar fidelidad al contexto</text>
      <line x1="844" y1="596" x2="300" y2="596" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="688" y="576" width="136" height="12" rx="2" fill="#ffffff"/>
      <text x="756" y="584" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">respaldada / no respaldada</text>
      <line x1="292" y1="644" x2="116" y2="644" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="124" y="624" width="160" height="12" rx="2" fill="#ffffff"/>
      <text x="204" y="632" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">respuesta citada o «no sé»</text>
      <rect x="292" y="128" width="8" height="524" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="476" y="176" width="8" height="64" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="476" y="444" width="8" height="64" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="660" y="272" width="8" height="140" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="844" y="540" width="8" height="64" fill="rgba(235,108,54,0.14)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="40" y="32" width="144" height="48" rx="6" fill="#ffffff"/>
      <rect x="40" y="32" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
      <text x="112" y="52" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Ana</text>
      <text x="112" y="68" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">usuaria</text>
      <rect x="224" y="32" width="144" height="48" rx="6" fill="#ffffff"/>
      <rect x="224" y="32" width="144" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="296" y="60" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">App</text>
      <rect x="408" y="32" width="144" height="48" rx="6" fill="#ffffff"/>
      <rect x="408" y="32" width="144" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="480" y="60" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Azure OpenAI</text>
      <rect x="592" y="32" width="144" height="48" rx="6" fill="#ffffff"/>
      <rect x="592" y="32" width="144" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="664" y="60" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Azure AI Search</text>
      <rect x="776" y="32" width="144" height="48" rx="6" fill="#ffffff"/>
      <rect x="776" y="32" width="144" height="48" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="848" y="60" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Content Safety</text>
      <line x1="40" y1="692" x2="920" y2="692" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="712" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEYENDA</text>
      <line x1="140" y1="708" x2="180" y2="708" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/><text x="192" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">LLAMADA</text>
      <line x1="300" y1="708" x2="340" y2="708" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/><text x="352" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">RETORNO</text>
      <line x1="460" y1="708" x2="500" y2="708" stroke="#eb6c36" stroke-width="1.2" marker-end="url(#azure-secuencia-arrow-accent)"/><text x="512" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">PASO CLAVE: VERIFICAR FIDELIDAD</text>
    </svg></div><figcaption>Figura · Una pregunta de punta a punta: “entonces, ¿cuántos días puedo teletrabajar?”</figcaption></figure>


1.  El modelo reescribe la pregunta usando el historial del chat: *"días de teletrabajo permitidos para un gerente en España"*.

2.  BM25 y la búsqueda vectorial corren en paralelo y se fusionan con RRF (k=60). Antes de puntuar, el filtro de seguridad elimina lo que Ana no tiene permiso de ver.

3.  El semantic ranker toma solo el top 50 y los puntúa de 0 a 4:

    | Puntaje | Significado                    |
    |---------|--------------------------------|
    | 4       | Responde por completo          |
    | 3       | Relevante pero incompleto      |
    | 2       | Parcial                        |
    | 1       | Relacionado, responde muy poco |
    | 0       | Irrelevante                    |

    Los chunks con puntaje \< 2 se descartan. Si no queda ninguno, la respuesta es "No encontré esa información". Microsoft advierte que la distribución de puntajes puede variar un poco, así que los umbrales no deberían ser demasiado finos.

4.  El modelo genera la respuesta con citas, usando la estructura de prompt de la sección 13.

5.  Una verificación de fidelidad comprueba que cada oración esté respaldada por los chunks. Si falla, la respuesta se regenera o se da con cautela.

Una pregunta compleja (*"compara el teletrabajo en España vs México y dime cuál aplica si me mudo"*) va al agentic retrieval de Azure AI Search, que la divide en subconsultas, las ejecuta en paralelo, reordena cada una con el semantic ranker y combina los resultados. La planificación de consultas y la síntesis de respuestas basadas en LLM todavía están en preview.

Una pregunta global (*"¿qué temas se repiten en todas las políticas de 2026?"*) es donde GraphRAG vale la pena.

#### 21.3 Evaluación en Azure (Microsoft Foundry)

| Evaluador | Tipo | Necesita respuesta correcta | Estado |
|----|----|----|----|
| Document Retrieval | Recuperación: NDCG, XDCG, Fidelity, Max Relevance, Holes | Sí (etiquetas de relevancia) | GA |
| Retrieval | Recuperación, juzgada por un modelo de lenguaje (escala 1–5) | No | GA |
| Groundedness | Respuesta: fidelidad al contexto | No | GA |
| Groundedness Pro | Fidelidad estricta con Content Safety (true/false) | No | (preview) |
| Relevance | Respuesta: ¿responde la pregunta? | No | GA |
| Response Completeness | Respuesta: ¿deja fuera algo crítico? | Sí | (preview) |

Los puntajes usan una escala de 1 a 5 y aprueban con 3 por defecto. La evaluación continua corre sobre muestras de tráfico real (porcentaje configurable, hasta 1000 solicitudes por hora) y envía los resultados a Application Insights, vinculados a las trazas.

## Parte VIII · Comparación: Azure vs Google Cloud vs código abierto

### 22. Azure vs Google Cloud vs código abierto

Algunos productos cambiaron de nombre hace poco (verificado el 2026-09-23):

- En Google, *Vertex AI* ahora aparece como Gemini Enterprise Agent Platform, *Vertex AI Search* se está renombrando a Agent Search y *Vector Search 2.0* ahora se llama Agent Retrieval.
- En Microsoft, *Azure AI Foundry* ahora es Microsoft Foundry.

#### Fase 1: Preparar los documentos

| Etapa | Qué hace | Azure | Google Cloud | Código abierto |
|----|----|----|----|----|
| 1. Fuentes | Dónde viven los documentos | Blob Storage, SharePoint | Cloud Storage, Google Drive | Sistema de archivos, almacenamiento compatible con S3 (MinIO) † |
| 2. Lectura (parsing) | PDF/Word → texto con estructura | Document Layout skill, que usa el modelo de layout de Document Intelligence y devuelve Markdown por sección | Document AI Layout Parser: versión estable desde 2024; versiones con Gemini en preview; descripciones de figuras y tablas con Gemini en preview | Docling (IBM, MIT), Unstructured, MinerU †, Marker † |
| 3. Chunking | Chunks con contexto | Document Layout skill (por sección, o tamaño fijo con solapamiento) y Text Split skill | El Layout Parser hace chunking por estructura y agrega los títulos superiores. RAG Engine permite fijar el tamaño y el solapamiento | Text splitters de LangChain y LlamaIndex; chunking de Docling † |
| 4. Embeddings | Texto → números | Azure OpenAI text-embedding-3-large / -small | gemini-embedding-001 (hasta 3072 dimensiones, 2048 tokens por texto), text-embedding-005 (inglés y código), text-multilingual-embedding-002 | BGE-M3 (denso + disperso + multivector, más de 100 idiomas), Qwen3-Embedding (Apache 2.0), multilingual-E5 |
| 5. Índice | Base de datos donde buscar | Azure AI Search: vectores, palabras clave y filtros en un solo servicio | Vector Search / Agent Retrieval, RAG Engine (base de datos administrada, Pinecone o Weaviate) o Agent Search (totalmente administrado) | Qdrant, Chroma, Weaviate, Milvus, pgvector, Elasticsearch / OpenSearch † |
| 6. Permisos | Cada usuario ve solo lo suyo | Entra ID + filtro por grupo en el índice | Control de acceso de Google (IAM) + control de acceso por fuente de datos en Agent Search | Filtros de metadatos en la base de datos vectorial † |

#### Fase 2: Responder una pregunta

| Etapa | Qué hace | Azure | Google Cloud | Código abierto |
|----|----|----|----|----|
| 7. Reescritura | Pregunta autónoma; dividir las preguntas complejas | Reescritura de consultas del semantic ranker (preview); búsqueda agéntica con planificación (preview) | Agent Search: preguntas de seguimiento y respuestas con búsqueda agéntica | MultiQueryRetriever de LangChain, HyDE, transformaciones de consultas de LlamaIndex † |
| 8. Palabras clave (BM25) | Coincidencia exacta | BM25 integrado en AI Search | Vector Search: tú generas el vector disperso (BM25, TF-IDF o SPLADE) y lo subes. Agent Search: administrado | BM25 de Elasticsearch/OpenSearch; vectores dispersos en Qdrant; SPLADE |
| 9. Significado | Vecinos más cercanos | Vectores en AI Search | Vector Search / Agent Retrieval (milisegundos incluso con miles de millones de elementos, según Google) | Qdrant, Chroma, Weaviate, Milvus, pgvector † |
| 10. Fusión | Combinar listas | RRF automático (k=60), con un peso configurable para los vectores | RRF con `rrf_ranking_alpha` | RRF en Qdrant †, búsqueda híbrida de Weaviate †, EnsembleRetriever de LangChain † |
| 11. Reranker | Reordenar leyendo juntos la pregunta y el chunk | Semantic ranker: el top 50, puntaje 0–4 | Ranking API: `semantic-ranker-default-004` / `-fast-004` (1024 tokens, 25 idiomas, puntaje 0–1, hasta 1000 chunks por llamada). La versión 005 está en preview desde el 1 de septiembre de 2026 y será la predeterminada a más tardar el 1 de octubre de 2026 | bge-reranker-v2-m3, Qwen3-Reranker (Apache 2.0), mxbai-rerank-v2 (Apache 2.0), ColBERTv2; o un modelo de lenguaje como reranker |
| 12. Agente | Búsquedas encadenadas | Búsqueda agéntica / Foundry IQ (la parte del modelo de lenguaje en preview) | Agent Development Kit (ADK) + Agent Runtime; agente Gemini Deep Research | LangGraph, agentes de LlamaIndex † |
| 13. GraphRAG | Grafo para preguntas globales | Microsoft GraphRAG (código abierto) desplegado en Azure; LazyGraphRAG en Microsoft Discovery | No se encontró un equivalente administrado (al 2026-09-23) | GraphRAG (Microsoft), LightRAG, HippoRAG 2 |

#### Fase 3: Generación y guardrails

| Etapa | Qué hace | Azure | Google Cloud | Código abierto |
|----|----|----|----|----|
| 14. Modelo redactor | Responder con citas | Modelos GPT en Azure OpenAI / Microsoft Foundry (también otros modelos en Foundry †) | Gemini (familia 3.x); también Claude, Llama, Qwen y otros en Model Garden | Llama, Qwen, Mistral, gpt-oss servidos con vLLM u Ollama † |
| 15. Protección de la entrada | Bloquear intentos de manipulación | Content Safety – Prompt Shields † | Model Armor | NeMo Guardrails, Llama Guard † |
| 16. Fidelidad a los documentos | ¿Cada oración está respaldada? | Evaluador Groundedness; Groundedness Pro (preview) | Check Grounding API: puntaje 0–1 por afirmación + citas, en menos de 500 ms | HHEM-2.1-Open (Vectara), MiniCheck |

#### Fase 4: Evaluación y monitoreo

| Etapa | Qué hace | Azure | Google Cloud | Código abierto |
|----|----|----|----|----|
| 17. Evaluar la recuperación | ¿Encontró lo correcto? | Document Retrieval (NDCG, XDCG, Fidelity, Holes; necesita etiquetas) y Retrieval (juez, sin etiquetas) | Evaluación de la calidad de búsqueda en Agent Search; servicio de evaluación de Agent Platform | RAGAS, DeepEval, RAGChecker, Open RAG Eval (UMBRELA) |
| 18. Evaluar la respuesta | ¿Fiel, relevante y completa? | Groundedness, Relevance, Response Completeness (preview); escala 1–5, aprueba con 3 | Servicio de evaluación con métricas basadas en rúbricas, un juez configurable y la opción de evaluar al propio juez | RAGAS, DeepEval, TruLens ("RAG triad"), ARES (intervalos de confianza) |
| 19. Evaluación continua | Evaluar muestras de tráfico real | Evaluación continua de Foundry: muestreo configurable, hasta 1000/hora, resultados en Application Insights | Online Monitors: cada ~10 min, porcentaje y tope configurables, resultados en Cloud Logging y Cloud Monitoring | Langfuse †, Arize Phoenix, MLflow |
| 20. Trazas | Ver qué pasó en cada paso | Application Insights / Azure Monitor + OpenTelemetry | Cloud Trace, Cloud Logging, Cloud Monitoring + OpenTelemetry (atributos `gen_ai.`) | OpenTelemetry + Phoenix / Langfuse † |
| 21. Despliegue | Dónde corre la app | Container Apps, App Service, AKS (Kubernetes) † | Cloud Run, GKE (Kubernetes), Agent Runtime | Docker + Kubernetes, FastAPI † |

#### Resumen en una imagen

| Etapa | Azure | Google Cloud | Código abierto |
|----|----|----|----|
| Leer documentos | Document Layout skill | Document AI Layout Parser | Docling / Unstructured |
| Vectores | text-embedding-3 | gemini-embedding-001 | BGE-M3 / Qwen3-Embedding |
| Índice | Azure AI Search | Vector Search / Agent Search | Qdrant / Chroma / Weaviate |
| Fusión | RRF automático (k=60) | RRF (rrf_ranking_alpha) | RRF (Qdrant, LangChain) |
| Reranker | Semantic ranker (top 50) | Ranking API (hasta 1000) | reranker bge / Qwen3 / mxbai |
| Modelo | GPT (Azure OpenAI) | Gemini | Llama / Qwen / gpt-oss + vLLM |
| Verificación | Groundedness (Pro en preview) | Check Grounding API | HHEM-Open / MiniCheck |
| Evaluación | Evaluadores de Foundry | Servicio de evaluación | RAGAS / DeepEval / TruLens |
| Producción | Evaluación continua | Online Monitors | Phoenix / MLflow / Langfuse |

#### Tres diferencias que importan

1.  Búsqueda híbrida: Azure AI Search incluye la búsqueda por palabras clave. En **Google Vector Search tienes que generar tú mismo el vector disperso**; si quieres que Google lo administre, usa Agent Search. En código abierto depende de la base de datos.
2.  Reranker: el de Azure reordena solo el top 50. La Ranking API de Google acepta hasta 1000 chunks y funciona con cualquier buscador, incluso uno externo. En código abierto controlas el modelo, el costo y la latencia, pero también te toca operarlo.
3.  Evaluación: las dos nubes ya ofrecen evaluación offline y evaluación continua sobre tráfico real, con trazas estándar (OpenTelemetry). En código abierto, RAGAS o DeepEval (offline) más Phoenix, MLflow o Langfuse (producción) cubren lo mismo, pero la integración la haces tú.

## Apéndice · Glosario

| Término | Significado sencillo |
|----|----|
| Búsqueda agéntica | Un agente divide la pregunta y hace varias búsquedas |
| BM25 | Algoritmo clásico de búsqueda por palabras clave |
| Chunk | Un pedazo de documento que se indexa por separado |
| Kappa de Cohen | Una medida del acuerdo entre dos evaluadores que descuenta el acuerdo por azar |
| Completitud (completeness) | Que la respuesta no deje fuera información importante |
| Integración continua (CI) | Pruebas automáticas que se ejecutan con cada cambio de código |
| Cross-encoder / bi-encoder | Lee los dos textos juntos / convierte cada texto en un vector por separado |
| Denso / disperso (sparse) | Un vector con todos los valores activos / un vector de términos con peso, casi todos en cero |
| Embedding / vector | Una lista de números que representa el significado de un texto |
| Entra ID | El sistema de identidad y acceso de Microsoft |
| Golden dataset | Un conjunto de preguntas con sus respuestas y documentos correctos |
| GraphRAG | RAG con un grafo de entidades y relaciones |
| Groundedness / faithfulness | Que la respuesta no diga nada que no esté en los documentos |
| Alucinación | Cuando el modelo inventa información |
| HNSW | Una estructura en forma de grafo para encontrar rápido los vectores más cercanos |
| Búsqueda híbrida | Combinar la búsqueda por palabras clave y la búsqueda por significado |
| IAM | El sistema de control de acceso de Google Cloud |
| Índice invertido | Una tabla "palabra → documentos donde aparece" |
| kNN | Encontrar los k vecinos más cercanos |
| Modelo de lenguaje (LLM) | El modelo que escribe la respuesta (GPT, Gemini, Claude, Llama…) |
| Juez LLM | Otro modelo que califica las respuestas |
| MMR | Una técnica para eliminar resultados redundantes |
| MRR | Qué tan arriba aparece el primer resultado correcto |
| nDCG | Calidad del ranking: si los elementos correctos están lo más arriba posible (los evaluadores de Azure lo escriben *NDCG*) |
| OpenTelemetry | Un estándar abierto para registrar trazas y métricas |
| Parsing | Convertir un archivo (PDF, Word) en texto con estructura |
| Precision@k | Qué fracción de los k primeros resultados es correcta |
| Preview / GA | Función en pruebas / función oficial y estable |
| Cuantización | Comprimir los números de los vectores para ahorrar memoria |
| RAG | Generación aumentada por recuperación: buscar en tus documentos antes de responder |
| Recall@k | Qué fracción de los elementos correctos aparece en los k primeros resultados |
| Reranker | Un modelo que reordena los candidatos leyendo juntos la pregunta y el chunk |
| RRF | Fusión por rango recíproco (reciprocal rank fusion): combinar listas usando solo las posiciones |
| SPLADE / ELSER | Modelos que amplían el texto con términos relacionados (disperso aprendido) |

## Apéndice · Referencias

### Documentación oficial (consultada el 2026-09-23)

**Microsoft Azure**

- Semantic ranker: <https://learn.microsoft.com/en-us/azure/search/semantic-search-overview>
- RRF en la búsqueda híbrida: <https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking>
- Búsqueda agéntica: <https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview>
- Document Layout skill: <https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-document-intelligence-layout>
- Chunking en Azure AI Search: <https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents>
- Evaluadores de RAG: <https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators>
- Evaluación continua: <https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/continuous-evaluation-agents>

**Google Cloud**

- Ranking API: <https://cloud.google.com/generative-ai-app-builder/docs/ranking>
- Check Grounding: <https://cloud.google.com/generative-ai-app-builder/docs/check-grounding>
- Document AI Layout Parser: <https://cloud.google.com/document-ai/docs/layout-parse-chunk>
- RAG Engine: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/rag-overview>
- Búsqueda híbrida en Vector Search: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/about-hybrid-search>
- Embeddings de texto: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings>
- Online Monitors: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/evaluate-online>

**Elastic**

- Búsqueda semántica: <https://www.elastic.co/docs/solutions/search/semantic-search>
- Búsqueda vectorial: <https://www.elastic.co/docs/solutions/search/vector>
- semantic_text: <https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-text>
- ELSER: <https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-elser>
- Retrievers: <https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers>

### Papers e informes

**Recuperación**

- Gao et al., *RAG for LLMs: A Survey*, 2023/24 — <https://arxiv.org/abs/2312.10997>
- Cormack, Clarke, Büttcher, *Reciprocal Rank Fusion*, SIGIR 2009 — <https://dl.acm.org/doi/10.1145/1571941.1572114>
- Formal et al., *SPLADE*, 2021 — <https://arxiv.org/abs/2107.05720>
- Chen et al., *BGE-M3*, 2024 — <https://arxiv.org/abs/2402.03216>
- Khattab & Zaharia, *ColBERT*, 2020 — <https://arxiv.org/abs/2004.12832>
- Faysse et al., *ColPali*, ICLR 2025 — <https://arxiv.org/abs/2407.01449>
- Gao et al., *HyDE*, 2022 — <https://arxiv.org/abs/2212.10496>
- Zheng et al., *Step-Back Prompting*, ICLR 2024 — <https://arxiv.org/abs/2310.06117>
- Sarthi et al., *RAPTOR*, 2024 — <https://arxiv.org/abs/2401.18059>
- Edge et al., *GraphRAG*, 2024 — <https://arxiv.org/abs/2404.16130>
- Microsoft Research, *LazyGraphRAG*, 2024 — <https://www.microsoft.com/en-us/research/blog/lazygraphrag-setting-a-new-standard-for-quality-and-cost/>
- Gutiérrez et al., *HippoRAG 2*, ICML 2025 — <https://arxiv.org/abs/2502.14802>
- Han et al., *RAG vs. GraphRAG*, 2025/26 — <https://arxiv.org/abs/2502.11371>
- Asai et al., *Self-RAG*, 2023 — <https://arxiv.org/abs/2310.11511>
- Yan et al., *Corrective RAG*, 2024 — <https://arxiv.org/abs/2401.15884>
- Jeong et al., *Adaptive-RAG*, NAACL 2024 — <https://arxiv.org/abs/2403.14403>
- Singh et al., *Agentic RAG Survey*, 2025/26 — <https://arxiv.org/abs/2501.09136>
- Jin et al., *Search-R1*, 2025 — <https://arxiv.org/abs/2503.09516>
- Liu et al., *Lost in the Middle*, TACL — <https://arxiv.org/abs/2307.03172>
- Li et al., *Self-Route*, EMNLP 2024 — <https://arxiv.org/abs/2407.16833>
- Li et al., *LaRA*, 2025 — <https://arxiv.org/abs/2502.09977>

**Chunking**

- Qu, Tu, Bao (Vectara), *Is Semantic Chunking Worth the Computational Cost?*, 2024 — <https://arxiv.org/abs/2410.13070>
- Smith & Troynikov (Chroma), *Evaluating Chunking Strategies for Retrieval*, 2024 — <https://research.trychroma.com/evaluating-chunking>
- NVIDIA, *Finding the Best Chunking Strategy*, 2025 — <https://developer.nvidia.com/blog/finding-the-best-chunking-strategy-for-accurate-ai-responses/>
- Jimeno Yepes et al., *Financial Report Chunking*, 2024 — <https://arxiv.org/abs/2402.05131>
- Günther et al. (Jina), *Late Chunking*, 2024 — <https://arxiv.org/abs/2409.04701>
- Anthropic, *Contextual Retrieval*, 2024 — <https://www.anthropic.com/engineering/contextual-retrieval> (cifras verificadas en una copia espejo; la página original bloqueó el acceso automatizado)
- Bhat et al., *Rethinking Chunk Size*, 2025 — <https://arxiv.org/abs/2505.21700>
- IBM, *Docling*, 2024 — <https://arxiv.org/abs/2408.09869>

**Reranking**

- Nogueira & Cho, *monoBERT*, 2019 — <https://arxiv.org/abs/1901.04085>
- Thakur et al., *BEIR*, 2021 — <https://arxiv.org/abs/2104.08663>
- Sun et al., *RankGPT*, 2023 — <https://arxiv.org/abs/2304.09542>
- Pradeep et al., *RankZephyr*, 2023 — <https://arxiv.org/abs/2312.02724>
- Su et al., *BRIGHT*, 2024 — <https://arxiv.org/abs/2407.12883>
- Abdallah et al., *How Good are LLM-based Rerankers?*, 2025 — <https://arxiv.org/abs/2508.16757>
- Agentset, *Cohere Rerank 4*, 2025 — <https://agentset.ai/blog/cohere-reranker-v4>
- Qwen, *Qwen3 Embedding & Reranker*, 2025 — <https://qwenlm.github.io/blog/qwen3-embedding/>
- Jina, *jina-reranker-v3.5*, 2026 — <https://arxiv.org/abs/2607.18152>
- Mixedbread, *mxbai-rerank-v2*, 2025 — <https://www.mixedbread.com/blog/mxbai-rerank-v2>
- Jiang et al., *LongLLMLingua*, ACL 2024 — <https://arxiv.org/abs/2310.06839>

**Evaluación**

- Es et al., *RAGAS*, 2023 — <https://arxiv.org/abs/2309.15217>
- Saad-Falcon et al., *ARES*, NAACL 2024 — <https://arxiv.org/abs/2311.09476>
- Ru et al. (Amazon), *RAGChecker*, NeurIPS 2024 — <https://arxiv.org/abs/2408.08067>
- Gao et al., *ALCE*, EMNLP 2023 — <https://arxiv.org/abs/2305.14627>
- Zheng et al., *Judging LLM-as-a-Judge*, NeurIPS 2023 — <https://arxiv.org/abs/2306.05685>
- Thakur et al., *Support Evaluation TREC 2024*, SIGIR 2025 — <https://arxiv.org/abs/2504.15205>
- Yang et al. (Meta), *CRAG benchmark*, NeurIPS 2024 — <https://arxiv.org/abs/2406.04744>
- Islam et al., *FinanceBench*, 2023 — <https://arxiv.org/abs/2311.11944>
- Magesh et al. (Stanford), *Hallucination-Free?*, 2024 — <https://arxiv.org/abs/2405.20362>
- Vectara, *Hallucination Leaderboard* — <https://github.com/vectara/hallucination-leaderboard>
- Bao et al., *FaithBench*, 2024 — <https://arxiv.org/abs/2410.13210>
- Vectara, *Open RAG Eval* — <https://github.com/vectara/open-rag-eval>
- DeepEval, *Metrics* — <https://deepeval.com/docs/metrics-introduction>
- Databricks, *Scorers and LLM judges* — <https://docs.databricks.com/aws/en/mlflow3/genai/eval-monitor/concepts/scorers>
