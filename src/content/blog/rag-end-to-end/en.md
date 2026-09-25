---
title: "RAG End to End: A Practical Tutorial"
description: "What it is, how each piece works, how it is evaluated, a production example on Azure, and a comparison of Azure · Google Cloud · open source"
date: 2026-09-25
tags: [rag, retrieval, evaluation]
---

Plugging in a vector store is the easy part of RAG. Whether it works depends on reading the documents properly, searching in a hybrid way, reranking, and measuring retrieval and answers separately.

In Anthropic's tests (2024), adding context to chunks, BM25 and a reranker cut retrieval failures by 67%. Commercial legal RAG tools hallucinate 17–33% of the time (Stanford, 2024), and on Meta's CRAG benchmark (2024) the best industrial RAG systems answer without hallucinating only 63% of the time. For measuring all this, an LLM judge agrees with humans more than 80% of the time (Zheng et al., 2023).

I checked almost everything here against the official documentation and the cited papers on 23 September 2026. A few tool details marked † come from general experience and I did not re-check them. Features marked (preview) exist, but the vendor does not recommend them for production yet. Acronyms are spelled out the first time they appear and collected in the glossary at the end; papers are cited by name in the text (*SPLADE*, *ColBERT*, *RAGAS*), with authors, year and link in the references.

## Part I · Concepts

### 1. What RAG is, explained with a library

**RAG** (*Retrieval-Augmented Generation*) means that, before answering, a language model searches your documents and answers from what it found, citing the source.

Why do you need it? A language model does not know your company's internal documents, its knowledge stops at a cutoff date, and it can make things up ("hallucinate"). With RAG the answer rests on specific documents that anyone can check, and updating the knowledge does not require retraining the model.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:965px" viewBox="0 0 1440 320"  xmlns="http://www.w3.org/2000/svg" role="img"
         aria-labelledby="rag-library-title rag-library-desc">
      <title id="rag-library-title">RAG explained as a library</title>
      <desc id="rag-library-desc">A left-to-right pipeline of seven stages (documents, chunks, index, search, reranker, model and evaluation) mapped to a library metaphor: a library of documents is cut into index cards, catalogued, searched by a librarian, filtered by an expert reranker, written up by a model, and graded by a teacher, with the generation step highlighted.</desc>
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
      <text x="120" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Library</text>
      <text x="120" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">documents</text>
      <text x="120" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Your source files</text>
      <text x="120" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">(PDFs, wikis, policies)</text>
      <!-- ============ STAGE 2 · Index cards (chunks) ============ -->
      <rect x="230" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="240" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">2</text>
      <rect x="240" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="240" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="320" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Index cards</text>
      <text x="320" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">chunks</text>
      <text x="320" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Cut the documents</text>
      <text x="320" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">into small pieces</text>
      <!-- ============ STAGE 3 · Catalog (index) ============ -->
      <rect x="430" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="440" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">3</text>
      <rect x="440" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="440" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="520" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Catalog</text>
      <text x="520" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">index</text>
      <text x="520" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">File each card by</text>
      <text x="520" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">keyword and meaning</text>
      <!-- ============ STAGE 4 · Librarian (search) ============ -->
      <rect x="630" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="640" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">4</text>
      <rect x="640" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="640" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="720" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Librarian</text>
      <text x="720" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">search</text>
      <text x="720" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Brings ~50</text>
      <text x="720" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">candidate cards</text>
      <!-- ============ STAGE 5 · Expert (reranker) ============ -->
      <rect x="830" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="840" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">5</text>
      <rect x="840" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="840" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="920" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Expert</text>
      <text x="920" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">reranker</text>
      <text x="920" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Keeps the</text>
      <text x="920" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">best 5</text>
      <!-- ============ STAGE 6 · Writer (model) · HIGHLIGHT ============ -->
      <rect x="1030" y="96" width="20" height="16" rx="8" fill="rgba(254,219,0,0.20)"/>
      <text x="1040" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">6</text>
      <rect x="1040" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="1040" y="120" width="160" height="128" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.2"/>
      <text x="1120" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Writer</text>
      <text x="1120" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">model</text>
      <text x="1120" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Writes the answer</text>
      <text x="1120" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">with citations</text>
      <!-- ============ STAGE 7 · Teacher (evaluation) ============ -->
      <rect x="1230" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="1240" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">7</text>
      <rect x="1240" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="1240" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="1320" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Teacher</text>
      <text x="1320" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">evaluation</text>
      <text x="1320" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Grades: retrieved</text>
      <text x="1320" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">well? answered well?</text>
      <!-- ============ LEGEND (horizontal bottom strip) ============ -->
      <line x1="40" y1="280" x2="1400" y2="280" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="300" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">LEGEND</text>
      <rect x="132" y="292" width="12" height="12" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="152" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Retrieval stages (ingest → search → rerank)</text>
      <rect x="470" y="292" width="12" height="12" rx="2" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.2"/>
      <text x="490" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Generation (main step)</text>
      <line x1="720" y1="298" x2="744" y2="298" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <text x="752" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Data hand-off between stages</text>
    </svg></div><figcaption>RAG as a library: documents → chunks → index → search → reranker → model → evaluation</figcaption></figure>


Gao et al. (2023/24) describe the field's evolution in three stages:

| Stage | Idea |
|----|----|
| Naive RAG | Index → retrieve the top k → paste them into the prompt |
| Advanced RAG | Improve things before searching (rewrite the question, chunk better) and after (rerank, compress) |
| Modular RAG | Interchangeable pieces; adaptive, iterative and agentic flows |

### 2. The three circuits of a production RAG system


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 528" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-circuitos-title rag-circuitos-desc">
<title id="rag-circuitos-title">The three circuits of a production RAG</title>
<desc id="rag-circuitos-desc">Architecture of a RAG with three circuits: preparing the documents (sources, parsing and chunking, embeddings, index), answering each question (hybrid search, reranker, model with citations) and evaluating with a golden set and sampling to feed back improvements.</desc>
<defs>
<marker id="rag-circuitos-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="rag-circuitos-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="rag-circuitos-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="40" y="40" width="880" height="112" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="44" width="200" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="53" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">PREPARE DOCUMENTS · OFFLINE</text>
<rect x="40" y="192" width="880" height="112" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="196" width="176" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="205" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">ANSWER · EVERY QUESTION</text>
<rect x="40" y="344" width="880" height="112" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="348" width="248" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="357" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">EVALUATE · BEFORE AND IN PRODUCTION</text>
<path d="M 248,100 H 284" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 460,100 H 496" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 672,100 H 708" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 248,252 H 284" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 460,252 H 496" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 672,252 H 708" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<path d="M 796,128 V 160 Q 796,168 788,168 H 380 Q 372,168 372,176 V 224" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<rect x="552" y="148" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="584" y="157" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">QUERY</text>
<path d="M 796,280 V 376" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<rect x="804" y="320" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="832" y="329" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TRACES</text>
<path d="M 708,404 H 380 Q 372,404 372,396 V 280" fill="none" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#rag-circuitos-arrow)"/>
<rect x="504" y="384" width="72" height="12" rx="2" fill="#ffffff"/>
<text x="540" y="393" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">IMPROVEMENTS</text>
<rect x="72" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="72" y="72" width="176" height="56" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="160" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Sources</text>
<text x="160" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">SharePoint · Blob · Drive</text>
<rect x="284" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="284" y="72" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="372" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Parsing + chunking</text>
<text x="372" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">structure, headings, tables</text>
<rect x="496" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="496" y="72" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Embeddings</text>
<text x="584" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">text → vector</text>
<rect x="708" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="72" width="176" height="56" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="796" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Index</text>
<text x="796" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">vectors + BM25 + permissions</text>
<rect x="72" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="72" y="224" width="176" height="56" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="160" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">User</text>
<text x="160" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">question</text>
<rect x="284" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="284" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="372" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Hybrid search</text>
<text x="372" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">BM25 + vector · RRF</text>
<rect x="496" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="496" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Reranker</text>
<text x="584" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">top 50 → top 5</text>
<rect x="708" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="796" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Model with citations</text>
<text x="796" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">answer or “I don't know”</text>
<rect x="708" y="376" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="376" width="176" height="56" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="796" y="400" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Evaluation</text>
<text x="796" y="416" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">golden set · sampling</text>
<line x1="40" y1="480" x2="920" y2="480" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="40" y="500" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGEND</text>
<rect x="112" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="112" y="492" width="20" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="144" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">HIGHLIGHT</text>
<rect x="200" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="200" y="492" width="20" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="232" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">PROCESS</text>
<rect x="300" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="300" y="492" width="20" height="12" rx="2" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="332" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">SOURCE</text>
<rect x="392" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="392" y="492" width="20" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="424" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">INPUT</text>
<line x1="492" y1="496" x2="516" y2="496" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<text x="524" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FLOW</text>
<line x1="588" y1="496" x2="612" y2="496" stroke="#4f5d75" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#rag-circuitos-arrow)"/>
<text x="620" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">IMPROVEMENT / FEEDBACK</text>
</svg></div><figcaption>Figure · The three circuits of a production RAG</figcaption></figure>


## Part II · Preparing the documents

### 3. Reading the document properly (parsing)

Parsing has more impact than any other step, and it is the one teams neglect most. Convert a PDF to "plain text" and you lose the headings, the tables get scrambled, and each chunk loses its context.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:670px" viewBox="0 0 1000 340"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-parsing-title rag-parsing-desc">
  <title id="rag-parsing-title">Parsing: plain text versus structure-aware</title>
  <desc id="rag-parsing-desc">A before-and-after comparison of document parsing. On the left, plain-text extraction flattens a PDF and loses its headings and table structure. An arrow labelled layout model points to the right panel, where structure-aware parsing keeps the heading hierarchy as Markdown and preserves the table.</desc>
  <defs>
    <marker id="rp-arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><polygon points="0 0, 9 3.5, 0 7" fill="#003da5"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- arrow between panels (drawn before boxes) -->
  <line x1="420" y1="180" x2="576" y2="180" stroke="#003da5" stroke-width="1.4" marker-end="url(#rp-arrow)"/>
  <rect x="452" y="160" width="96" height="14" rx="2" fill="#ffffff"/>
  <text x="500" y="170" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle" letter-spacing="0.04em">layout model</text>
  <!-- LEFT: plain-text extraction (structure lost) -->
  <rect x="40" y="72" width="380" height="216" rx="6" fill="#ffffff"/>
  <rect x="40" y="72" width="380" height="216" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
  <text x="60" y="100" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">PLAIN-TEXT EXTRACTION</text>
  <text x="60" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000">Original PDF, flattened</text>
  <text x="60" y="150" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">REMOTE WORK POLICY 3.</text>
  <text x="60" y="166" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">Eligibility Role Days Ctry</text>
  <text x="60" y="182" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">Mgr 2 ES 3 Fri optional...</text>
  <text x="60" y="222" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• headings lost</text>
  <text x="60" y="240" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• table scrambled into a line</text>
  <text x="60" y="258" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• each chunk loses its context</text>
  <!-- RIGHT: structure-aware parsing (highlighted, accent) -->
  <rect x="580" y="72" width="380" height="216" rx="6" fill="#ffffff"/>
  <rect x="580" y="72" width="380" height="216" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="600" y="100" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.12em">STRUCTURE-AWARE → MARKDOWN</text>
  <text x="600" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000">Headings and table preserved</text>
  <text x="600" y="146" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000"># Remote Work Policy<tspan fill="#4d6fa8">   ← h1</tspan></text>
  <text x="600" y="162" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">## 3. Eligibility by country<tspan fill="#4d6fa8"> ← h2</tspan></text>
  <text x="600" y="178" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">### 3.2 Spain<tspan fill="#4d6fa8">   ← h3</tspan></text>
  <text x="600" y="204" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">| Role    | Days/week |</text>
  <text x="600" y="220" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">| Manager | 2         |</text>
  <text x="600" y="252" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">the table is still a table →</text>
  <text x="600" y="270" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">the chunk keeps its heading path</text>
</svg></div><figcaption>Parsing: plain-text extraction loses structure; structure-aware parsing keeps headings and tables</figcaption></figure>


The studies agree on this:

- The ColPali authors (ICLR 2025) "typically find that optimizing the ingestion pipeline yields much greater improvements than optimizing the embedding model". ColPali itself skips text extraction and chunking and indexes page images directly; on the ViDoRe benchmark it scored 81.3 nDCG@5 against ~65–67 for parsing pipelines.
- In Unstructured's FinanceBench study (2024), chunking by document elements (headings, tables) reached 53.2% accuracy versus 48.2% with fixed 512-token chunks, and used half as many chunks.
- A Turkish-language study (2026) found that layout-aware chunking helps much more on documents with tables than on text-only documents.

The usual tools are the Document Layout skill (Azure), Document AI Layout Parser (Google) and Docling (IBM, open source). Section 22 compares them.

### 4. Chunking

Chunking splits each document into small pieces (*chunks*) that are indexed separately.

#### 4.1 The strategies

| Strategy | How it splits | Cost |
|----|----|----|
| Fixed size | Every N tokens, with optional overlap | Minimal |
| Recursive | Tries to split by paragraph, then by line, then by sentence… | Minimal |
| By structure / page | By the document's sections, headings or pages | Low (requires good parsing) |
| Semantic | Splits where the meaning changes between sentences, measured with embeddings | Medium |
| LLM-based ("agentic") | A model decides where to split | High |
| Propositions | A model rewrites the text into atomic facts | High |

#### 4.2 What the evidence says: semantic chunking is overrated

- Vectara (2024) asked "Is Semantic Chunking Worth the Computational Cost?" and concluded that "the computational costs associated with semantic chunking are not justified by consistent performance gains". Fixed-size chunking won on all 4 real-document datasets (on HotpotQA, for example, F1@5 was 90.59 fixed vs 87.37 semantic). The embedding model mattered more than the chunking.
- Chroma (2024) found that the chunking strategy moves recall by up to 9%. Its default semantic chunker came in slightly below average (83.6% recall), while a recursive 200-token chunker with no overlap reached 88.1%. The best result (91.9%) used a language model and cost much more.
- NVIDIA (June 2025) got the best average accuracy (0.648) and the lowest variance across datasets with **page-level** chunking.
- In biomedicine (2026), semantic chunking gained +8.4 F1 points on one dataset, but on the others fixed-size chunking "remains competitive or better". It depends on the domain.

#### 4.3 What does work: adding context to each chunk

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th>Chunk without context</th>
<th>Chunk with context</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>"| Manager | 2 |"</code><br />
<span class="note">→ 2 what? where?</span></td>
<td><code>"Remote Work Policy &gt; 3. Eligibility &gt; 3.2 Spain | Manager | 2 days/week |"</code><br />
<span class="note">→ understandable on its own</span></td>
</tr>
</tbody>
</table>

Anthropic's **Contextual Retrieval** (Sep 2024) has a model write 50–100 tokens of context and prepends them to each chunk. Measured as the retrieval failure rate within the top 20 results, starting from a 5.7% baseline:

- context in the vectors only: 3.7% (−35%)
- context in the vectors and in BM25: 2.9% (−49%)
- all of the above plus a reranker: 1.9% (−67%)

The one-time cost is ~\$1.02 per million document tokens with prompt caching. Be careful when you quote these numbers: all three percentages are reductions relative to the 5.7% baseline, so the reranker's own contribution is the step from 2.9% to 1.9%.

Late chunking (Jina, 2024) computes the embedding of the whole document first and only then splits it, so each vector "knows" which document it comes from. It improves nDCG@10 by +2.7% to +3.6% without retraining.

#### 4.4 Starting sizes

Bhat et al. (2025) suggest 64–128 tokens for short factual questions and 512–1024 tokens for questions that need broad context. Azure recommends starting with 512 tokens and 25% overlap, and adding the document title to the middle chunks.

A reasonable default: start with recursive or section/page chunking of 256–512 tokens, don't split tables, add context, and tune by measuring (Part VI).

### 5. Turning text into vectors (embeddings)

An **embedding** is a list of numbers that represents the meaning of a text. Texts with similar meanings end up close together:


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:549px" viewBox="0 0 820 380"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-embed-title rag-embed-desc">
  <title id="rag-embed-title">Embeddings place similar meanings close together</title>
  <desc id="rag-embed-desc">A conceptual vector space. The points for cheap laptop and inexpensive notebook sit close together because they mean almost the same thing, while vacation policy sits far away because it is unrelated. Distance in the space encodes difference in meaning, not shared words.</desc>
  <defs>
    <marker id="re-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#003da5"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- plane -->
  <rect x="40" y="64" width="740" height="256" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
  <text x="56" y="88" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">EMBEDDING SPACE · DISTANCE = DIFFERENCE IN MEANING</text>
  <!-- close pair: connecting line drawn first -->
  <line x1="232" y1="196" x2="360" y2="164" stroke="#003da5" stroke-width="1" stroke-dasharray="4,3"/>
  <rect x="252" y="168" width="80" height="14" rx="2" fill="#ffffff"/>
  <text x="292" y="178" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">close</text>
  <!-- point 1: cheap laptop (highlighted accent) -->
  <circle cx="232" cy="196" r="9" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.6"/>
  <text x="232" y="228" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"cheap laptop"</text>
  <!-- point 2: inexpensive notebook -->
  <circle cx="360" cy="164" r="9" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.6"/>
  <text x="360" y="148" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"inexpensive notebook"</text>
  <!-- far point: vacation policy -->
  <line x1="256" y1="204" x2="628" y2="268" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-dasharray="2,4"/>
  <rect x="410" y="232" width="60" height="14" rx="2" fill="#ffffff"/>
  <text x="440" y="242" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">far</text>
  <circle cx="640" cy="272" r="9" fill="rgba(0,0,0,0.05)" stroke="#4d6fa8" stroke-width="1.4"/>
  <text x="640" y="298" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"vacation policy"</text>
  <!-- legend -->
  <line x1="40" y1="344" x2="780" y2="344" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
  <circle cx="52" cy="362" r="6" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="66" y="365" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Similar meaning, near neighbours</text>
  <circle cx="360" cy="362" r="6" fill="rgba(0,0,0,0.05)" stroke="#4d6fa8" stroke-width="1.4"/>
  <text x="374" y="365" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Unrelated, far away, even if it shares words</text>
</svg></div><figcaption>Embeddings place similar meanings close together and unrelated text far apart</figcaption></figure>


| Type | What it is | Examples |
|----|----|----|
| Dense | Hundreds or thousands of numbers, all with a value | text-embedding-3 (OpenAI/Azure), gemini-embedding-001, Qwen3-Embedding, BGE-M3 |
| Learned sparse | List of terms (almost all zero) with weights, expanded with related terms | SPLADE, ELSER (Elastic), BGE-M3 sparse mode |
| Multi-vector | One vector per token; compared token by token | ColBERT, ColPali |

Measure on your own data. Public leaderboards (such as MTEB) change every month and don't always reflect your domain. And pin the model version: if you mix vectors from different models, searches stop making sense.

### 6. Index and permissions

The index stores each chunk with its text, its vector and its metadata:

| Field(s) in the index              | Purpose                          |
|------------------------------------|----------------------------------|
| `id, content, content_vector`      | the chunk text and its embedding |
| `title, section, page, source_url` | where it came from               |
| `allowed_groups`                   | groups allowed to see it         |
| `last_modified`                    | freshness                        |

Without `allowed_groups` and a **security filter** on every search, an intern could receive chunks from executive committee documents.

## Part III · Retrieval

### 7. BM25: keyword search

BM25 is the classic keyword (lexical) search algorithm and the default in Elasticsearch, OpenSearch and Azure AI Search. It runs on an **inverted index**, which works like the alphabetical index at the back of a book:

| Term            | Documents where it appears (postings) |
|-----------------|---------------------------------------|
| `"remote work"` | doc3, doc7, doc12                     |
| `"manager"`     | doc7, doc9                            |
| `"spain"`       | doc7, doc12, doc15                    |

The score has three parts:

| Ingredient | Idea | Example |
|----|----|----|
| Term frequency | More occurrences = more points, but with saturation (parameter `k1`, 1.2 by default in Elasticsearch †) | 3 times \> 1 time, but 20 times ≈ 10 times |
| Term rarity | Rare words are worth more | "ORA-00942" is worth a lot; "of" almost nothing |
| Document length | A short text containing the word scores higher than a long one (parameter `b`, 0.75 by default †) | A specific paragraph beats an entire manual |

BM25 is fast, needs no model, can be explained, and is excellent for exact terms such as codes, acronyms and proper names. Its weakness is synonyms: *"cheap laptop"* won't find *"budget notebook"*.

### 8. Semantic search: by meaning

#### 8.1 Dense vectors (nearest-neighbor search)

Here the question becomes a vector and you retrieve the closest chunks. Doing that quickly over millions of vectors takes an approximate index, usually **HNSW** (a graph of neighbors).

Dense search understands synonyms, paraphrases and different languages. On the other hand, it is a black box (you can't explain why something matched), it can confuse nearly identical codes (ORA-00942 vs ORA-00943), and it uses more memory. Quantization reduces the memory by compressing the numbers, for example to 8 bits or to binary.

#### 8.2 Learned sparse (SPLADE, ELSER)

Learned sparse sits between the two. A model expands the text with related terms and their weights, and the search then runs on an inverted index, as with BM25:

```
"cheap laptop" → { laptop: 2.1, notebook: 1.8, computer: 1.2, cheap: 1.9, budget: 1.5, price: 0.9 }
```

It is easier to explain than dense vectors and still finds synonyms. The catch is that it depends on the model's language (ELSER is recommended for English only) and has a token limit (ELSER encodes the first 512 tokens of each field).

#### 8.3 Which one wins

| Query | BM25 | Dense | Learned sparse |
|----|----|----|----|
| *"cheap laptop"* → doc with *"budget notebook"* | No | Yes | Yes |
| *"error ORA-00942"* → doc with that code | Yes | Unreliable | Yes |
| *"can I work from home?"* → doc with *"remote work"* | No | Yes | Yes, if the language is supported |
| Explaining why it matched | Yes | No | Partly |
| Cost | Minimal | Model + memory | Model |

None of them wins every time, which is why you combine them.

### 9. Hybrid search and RRF


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rrf-fusion-title rrf-fusion-desc">
<title id="rrf-fusion-title">Hybrid search: two searches, one RRF fusion and a reranker</title>
<desc id="rrf-fusion-desc">The question is searched in parallel with BM25 and with vectors; RRF fuses the top 50 of each list by rank, a reranker reorders them and the best 5 chunks reach the model.</desc>
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
<text x="560" y="188" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">FUSES</text>
<rect x="744" y="180" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="768" y="188" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">RERANKS</text>
<text x="928" y="64" fill="#2d3142" font-size="14" font-style="italic" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">RRF uses ranks only:</text>
<text x="928" y="84" fill="#2d3142" font-size="14" font-style="italic" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">it rewards agreement between the two lists.</text>
<path d="M 628,88 Q 520,100 480,160" fill="none" stroke="rgba(0,0,0,0.40)" stroke-width="1" stroke-dasharray="4,3"/>
<circle cx="480" cy="160" r="2" fill="#2d3142"/>
<rect x="32" y="168" width="96" height="64" rx="6" fill="#ffffff"/>
<rect x="32" y="168" width="96" height="64" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="80" y="204" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Question</text>
<rect x="168" y="88" width="152" height="64" rx="6" fill="#ffffff"/>
<rect x="168" y="88" width="152" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="244" y="112" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">BM25</text>
<text x="244" y="128" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">exact words</text>
<text x="244" y="140" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">inverted index</text>
<rect x="168" y="248" width="152" height="64" rx="6" fill="#ffffff"/>
<rect x="168" y="248" width="152" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="244" y="272" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Vector</text>
<text x="244" y="288" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">meaning</text>
<text x="244" y="300" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">HNSW</text>
<rect x="384" y="168" width="144" height="64" rx="6" fill="#ffffff"/>
<rect x="384" y="168" width="144" height="64" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="456" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">RRF</text>
<text x="456" y="212" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">1/(60 + rank)</text>
<rect x="592" y="168" width="144" height="64" rx="6" fill="#ffffff"/>
<rect x="592" y="168" width="144" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="664" y="192" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Reranker</text>
<text x="664" y="208" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">reads question +</text>
<text x="664" y="220" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">chunk</text>
<rect x="800" y="168" width="128" height="64" rx="6" fill="#ffffff"/>
<rect x="800" y="168" width="128" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="864" y="204" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Top 5 to model</text>
<line x1="32" y1="352" x2="928" y2="352" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="32" y="372" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGEND</text>
<rect x="120" y="364" width="16" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="144" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Input</text>
<rect x="296" y="364" width="16" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="320" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Search step</text>
<rect x="472" y="364" width="16" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="496" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Fusion</text>
</svg></div><figcaption>Figure · Hybrid search: two searches, one RRF fusion and a reranker</figcaption></figure>


#### 9.1 The problem

The two searches return scores on incompatible scales:

| Rank | BM25 <span style="font-weight:400">(no upper bound)</span> | Vector <span style="font-weight:400">(cosine 0.33–1 in Azure)</span> |
|----|----|----|
| 1 | doc_B → 12.4 | doc_A → 0.89 |
| 2 | doc_A → 9.1 | doc_C → 0.87 |
| 3 | doc_D → 3.2 | doc_B → 0.81 |

Adding 12.4 + 0.81 makes about as much sense as adding euros and kilos.

#### 9.2 The solution: RRF (Reciprocal Rank Fusion)

RRF ignores the scores and uses only the position of each document in each list:

```
RRF(doc) = Σ  1 / (k + position of doc in that list)      with k = 60 typically
       over each list
```

Take the same rankings as above:

| Position | BM25  | Vector |
|----------|-------|--------|
| 1        | doc_B | doc_A  |
| 2        | doc_A | doc_C  |
| 3        | doc_D | doc_B  |

| Doc   | BM25 contribution | Vector contribution | Total   | Final |
|-------|-------------------|---------------------|---------|-------|
| doc_A | 1/62 = 0.01613    | 1/61 = 0.01639      | 0.03252 | 1     |
| doc_B | 1/61 = 0.01639    | 1/63 = 0.01587      | 0.03226 | 2     |
| doc_C | 0                 | 1/62 = 0.01613      | 0.01613 | 3     |
| doc_D | 1/63 = 0.01587    | 0                   | 0.01587 | 4     |


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rrf-scores-title rrf-scores-desc">
      <title id="rrf-scores-title">RRF example with k = 60: score per document</title>
      <desc id="rrf-scores-desc">Final RRF score of four documents: doc_A 0.03252 and doc_B 0.03226 appear in both lists and clearly beat doc_C 0.01613, vector only, and doc_D 0.01587, BM25 only.</desc>
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
      <text x="480" y="376" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.14em">RRF SCORE = Σ 1/(60 + RANK)</text>
      <text x="148" y="104" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_A</text>
      <rect x="160" y="80" width="520" height="40" fill="#ffffff"/>
      <rect x="160" y="80" width="520" height="40" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="688" y="104" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.03252</text>
      <text x="756" y="104" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">high in both lists</text>
      <text x="148" y="168" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_B</text>
      <rect x="160" y="144" width="516" height="40" fill="#ffffff"/>
      <rect x="160" y="144" width="516" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="684" y="168" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.03226</text>
      <text x="148" y="232" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_C</text>
      <rect x="160" y="208" width="260" height="40" fill="#ffffff"/>
      <rect x="160" y="208" width="260" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="428" y="232" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.01613</text>
      <text x="496" y="232" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">vector only</text>
      <text x="148" y="296" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_D</text>
      <rect x="160" y="272" width="252" height="40" fill="#ffffff"/>
      <rect x="160" y="272" width="252" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="420" y="296" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.01587</text>
      <text x="488" y="296" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">BM25 only</text>
      <text x="40" y="412" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">Rankings, BM25: B, A, D · Vector: A, C, B</text>
      <line x1="40" y1="436" x2="920" y2="436" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="468" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGEND</text>
      <rect x="120" y="456" width="16" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="144" y="468" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Winner: consensus across lists</text>
      <rect x="400" y="456" width="16" height="16" rx="4" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="424" y="468" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Other documents</text>
    </svg></div><figcaption>Figure · RRF example with k = 60: score per document</figcaption></figure>


doc_A wins because it ranks high in both lists. RRF rewards agreement between the two methods.

#### 9.3 Why k = 60?

|  | Position 1 | Position 2 | Difference |
|----|----|----|----|
| k = 0 | 1.000 | 0.500 | double: being 1st in a single list dominates |
| k = 60 | 0.0164 | 0.0161 | almost equal: ranking well in several lists is what counts |

The value comes from the original paper (Cormack, Clarke and Büttcher, SIGIR 2009), where it was chosen empirically, and Azure AI Search documents that it works best with small values such as 60.

#### 9.4 Advantages, limits and variants

RRF needs no scale calibration and nothing to train, and it accepts N lists (BM25, several vectors, several rewordings of the question). It has two weaknesses. It ignores magnitude, so being first "by a mile" is worth the same as being first "by a hair". And a bad list counts just the same: if vector search returns junk, that junk also gets points.

There are two common variants:

- Weighted RRF gives one of the lists more weight (for example, the vector list ×2). It is available in Azure (*vector weighting*), in LangChain's `EnsembleRetriever` †, and in Google Vector Search with `rrf_ranking_alpha`.
- Linear combination normalizes the scores and adds them with weights. It uses the magnitude, but you have to calibrate it with data. Examples are Elasticsearch's `linear` retriever and DBSF in Qdrant †.

Keep in mind that **RRF is not a reranker.** It only fuses lists, and the reranker comes afterwards.

### 10. Advanced retrieval strategies

| Technique | What it does | Key evidence |
|----|----|----|
| Rewriting with history | Turns *"so how many days?"* into a complete question using the earlier chat | Standard practice |
| HyDE | A model writes a hypothetical answer and the search is run with it | Competes with trained retrievers, without needing labels (Gao et al., 2022) |
| Multi-query / RAG-Fusion | Several rewordings of the question, fused with RRF | More coverage; risk of drifting off topic |
| Step-back | First ask something more general | +27% on TimeQA, +7% on MuSiQue (Google DeepMind) |
| Decomposition | Splits a complex question into sub-questions | Foundation of agentic search |
| RAPTOR / parent document | Hierarchical summaries; search by small chunk and return the large one | RAPTOR + GPT-4: +20% absolute on QuALITY |
| GraphRAG | Entity graph + per-community summaries | Improves global questions ("which topics keep recurring?"). LazyGraphRAG indexes at 0.1% of the cost and queries \>700× cheaper. It doesn't always win: on specific lookups classic RAG usually matches or beats it (Han et al., 2025/26; HippoRAG 2) |
| Adaptive (Self-RAG, Corrective RAG, Adaptive-RAG) | Decides when to search, how much, and corrects if the search was bad | Adaptive-RAG routes based on question complexity |
| Agentic / "Deep Research" | Iterative search trained with reinforcement learning | Search-R1: +41% (7B) over baseline RAG; OpenAI Deep Research takes 5 to 30 minutes per task |
| Long context vs RAG | Put everything in the prompt? | Models perform worse when the information is in the middle of the context ("Lost in the Middle"); retrieving too much makes the answer worse; the efficient approach is to route each query (Self-Route), and no option always wins (LaRA) |

### 11. Case study: Elasticsearch

Elasticsearch has four different "semantic" pieces, and they are easy to mix up:


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:670px" viewBox="0 0 1000 360"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-es-title rag-es-desc">
  <title id="rag-es-title">Elasticsearch: three retrieval approaches over one field type</title>
  <desc id="rag-es-desc">Three side-by-side approaches in Elasticsearch, A dense kNN vectors, B learned sparse with ELSER, and C semantic reranking, sit above a shared field type, D semantic_text, which chunks text and generates embeddings automatically and feeds the dense and semantic-reranking approaches.</desc>
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
  <text x="180" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Dense (kNN)</text>
  <text x="180" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">dense_vector field</text>
  <text x="180" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">knn query (HNSW)</text>
  <!-- B. Learned sparse -->
  <rect x="360" y="72" width="280" height="108" rx="6" fill="#ffffff"/>
  <rect x="360" y="72" width="280" height="108" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <rect x="372" y="84" width="20" height="12" rx="2" fill="none" stroke="rgba(0,61,165,0.4)" stroke-width="0.8"/>
  <text x="382" y="93" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">B</text>
  <text x="500" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Learned sparse</text>
  <text x="500" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">ELSER · sparse_vector field</text>
  <text x="500" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">expands terms, not synonyms</text>
  <!-- C. Semantic reranking -->
  <rect x="680" y="72" width="280" height="108" rx="6" fill="#ffffff"/>
  <rect x="680" y="72" width="280" height="108" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <rect x="692" y="84" width="20" height="12" rx="2" fill="none" stroke="rgba(0,61,165,0.4)" stroke-width="0.8"/>
  <text x="702" y="93" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">C</text>
  <text x="820" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Semantic reranking</text>
  <text x="820" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">text_similarity_reranker</text>
  <text x="820" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">/ RERANK in ES|QL</text>
  <!-- D. semantic_text (highlighted, underpins A and C) -->
  <rect x="40" y="244" width="920" height="72" rx="6" fill="#ffffff"/>
  <rect x="40" y="244" width="920" height="72" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <rect x="52" y="256" width="20" height="12" rx="2" fill="none" stroke="#fedb00" stroke-width="1"/>
  <text x="62" y="265" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">D</text>
  <text x="500" y="278" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">semantic_text field type</text>
  <text x="500" y="298" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">chunks the text and generates embeddings automatically, the low-effort default that feeds A and C</text>
  <!-- legend -->
  <line x1="40" y1="336" x2="960" y2="336" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
  <text x="40" y="352" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">LEGEND</text>
  <rect x="112" y="344" width="12" height="12" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <text x="130" y="353" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Retrieval approach</text>
  <rect x="300" y="344" width="12" height="12" rx="2" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="318" y="353" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Shared field type that powers them</text>
</svg></div><figcaption>Elasticsearch: three retrieval approaches (A·B·C) over the shared semantic_text field (D)</figcaption></figure>


- A. Dense: `dense_vector` + `knn` query, with int8, int4 and BBQ quantization. You can use E5 (multilingual), Jina (via the Elastic Inference Service) or external models (OpenAI, Azure OpenAI, Cohere, Bedrock, Vertex AI, Hugging Face).
- B. ELSER expands terms. What it adds are learned associations, not synonyms. On Elastic's own BEIR benchmark it improves nDCG@10 over BM25 by 18% on average (10 wins, 1 tie, 1 loss). It is recommended for English, reads 512 tokens per field and requires a paid subscription.
- C. Reranker: the `text_similarity_reranker` retriever or the `RERANK` command in ES\|QL.
- D. `semantic_text` (GA since version 9.0). If you don't pin `inference_id`, new indices may use a different model after a version upgrade, so **always pin the model in production**.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="elastic-retrievers-title elastic-retrievers-desc">
      <title id="elastic-retrievers-title">Elasticsearch: retriever tree for hybrid search with a reranker</title>
      <desc id="elastic-retrievers-desc">Three nested levels: the outer text_similarity_reranker retriever reranks the top 50 with a rerank model; inside, rrf fuses two standard retrievers: match with BM25 on content and semantic on a semantic_text field.</desc>
      <defs>
        <marker id="elastic-retrievers-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
        <marker id="elastic-retrievers-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
        <marker id="elastic-retrievers-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="40" y="40" width="880" height="400" rx="8" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <rect x="56" y="32" width="200" height="16" rx="2" fill="#ffffff"/>
      <text x="64" y="44" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">OUTER RETRIEVER · RERANK</text>
      <text x="72" y="84" fill="#2d3142" font-size="16" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="start">text_similarity_reranker</text>
      <text x="72" y="108" fill="#2d3142" font-size="12" font-weight="500" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">reranks the top 50 with a rerank model · <tspan font-family="Meslo, Menlo, monospace" font-size="12" font-weight="400" fill="#4f5d75">inference_id</tspan></text>
      <rect x="72" y="136" width="816" height="272" rx="8" fill="#ffffff" stroke="#4f5d75" stroke-width="1"/>
      <rect x="88" y="128" width="64" height="16" rx="2" fill="#ffffff"/>
      <text x="96" y="140" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">FUSION</text>
      <text x="104" y="176" fill="#2d3142" font-size="16" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="start">rrf</text>
      <text x="104" y="196" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="start">rank_window_size 50 · rank_constant 60</text>
      <rect x="104" y="228" width="360" height="148" rx="8" fill="rgba(0,0,0,0.02)" stroke="#2d3142" stroke-width="1"/>
      <rect x="120" y="220" width="120" height="16" rx="2" fill="#ffffff"/>
      <text x="128" y="232" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">LEAF RETRIEVER</text>
      <text x="284" y="276" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="middle">standard · match</text>
      <text x="284" y="308" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">BM25</text>
      <text x="284" y="332" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">on the content field</text>
      <rect x="496" y="228" width="360" height="148" rx="8" fill="rgba(0,0,0,0.02)" stroke="#2d3142" stroke-width="1"/>
      <rect x="512" y="220" width="120" height="16" rx="2" fill="#ffffff"/>
      <text x="520" y="232" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">LEAF RETRIEVER</text>
      <text x="676" y="276" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="middle">standard · semantic</text>
      <text x="676" y="308" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Dense or ELSER</text>
      <text x="676" y="332" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">semantic_text field</text>
      <text x="40" y="484" fill="#7a8399" font-size="14" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start" font-style="italic">Alternative to <tspan font-family="Meslo, Menlo, monospace" font-style="normal" font-size="12">rrf</tspan>: retriever <tspan font-family="Meslo, Menlo, monospace" font-style="normal" font-size="12">linear</tspan> (minmax / l2_norm)</text>
    </svg></div><figcaption>Figure · Elasticsearch: retriever tree for hybrid search with a reranker</figcaption></figure>


Here is hybrid search with a reranker in a single call:

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

You can also fuse with the `linear` retriever (`minmax` or `l2_norm` normalizers) or, in ES\|QL, with `FORK` + `FUSE` (RRF or LINEAR) + `RERANK`. In the multi-field format, Elastic normalizes the lexical and semantic fields so that each group contributes 50%.

Watch the vocabulary. In Elastic, *"semantic search"* means searching with embeddings; in Azure, the *"semantic ranker"* is a reranker.

## Part IV · Reranking

### 12. Reranking

#### 12.1 What it is

A **reranker** takes the ~50–150 candidates from the search and reorders them by reading the question and each chunk together. That is more accurate than comparing vectors, but slower, so you only apply it to a few candidates.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 464" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="bi-vs-cross-encoder-title bi-vs-cross-encoder-desc">
<title id="bi-vs-cross-encoder-title">Embeddings (bi-encoder) vs. reranker (cross-encoder)</title>
<desc id="bi-vs-cross-encoder-desc">The bi-encoder turns the question and the chunk into vectors separately and compares their distance, fast for millions of chunks; the cross-encoder reads question and chunk together and gives a precise relevance score for 50–150 candidates.</desc>
<defs>
<marker id="bi-vs-cross-encoder-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="bi-vs-cross-encoder-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="bi-vs-cross-encoder-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="32" y="56" width="896" height="176" rx="8" fill="#f3f4f6" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
<text x="48" y="76" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">BI-ENCODER · SEARCH</text>
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
<text x="544" y="316" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">SCORES</text>
<rect x="64" y="96" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="96" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="136" y="124" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Question</text>
<rect x="64" y="168" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="168" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="136" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Chunk</text>
<rect x="272" y="96" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="272" y="96" width="176" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="360" y="124" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Question vector</text>
<rect x="272" y="168" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="272" y="168" width="176" height="48" rx="6" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="360" y="188" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Chunk vector</text>
<text x="360" y="204" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">precomputed</text>
<rect x="512" y="132" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="512" y="132" width="144" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="152" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Distance</text>
<text x="584" y="168" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">between vectors</text>
<rect x="64" y="304" width="208" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="304" width="208" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="168" y="324" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Question + chunk</text>
<text x="168" y="340" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">together</text>
<rect x="336" y="304" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="336" y="304" width="176" height="48" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="424" y="324" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Reranker model</text>
<text x="424" y="340" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">cross-encoder</text>
<rect x="576" y="304" width="160" height="48" rx="6" fill="#ffffff"/>
<rect x="576" y="304" width="160" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="656" y="332" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Relevance score</text>
<text x="704" y="132" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Fast</text>
<text x="704" y="148" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Precomputable</text>
<text x="704" y="164" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Millions of chunks</text>
<text x="768" y="308" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Precise</text>
<text x="768" y="324" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Computed per pair</text>
<text x="768" y="340" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Only 50–150 candidates</text>
<line x1="32" y1="412" x2="928" y2="412" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="32" y="432" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGEND</text>
<rect x="120" y="424" width="16" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="144" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Input</text>
<rect x="296" y="424" width="16" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="320" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Computation</text>
<rect x="472" y="424" width="16" height="12" rx="2" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="496" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Precomputed</text>
<rect x="648" y="424" width="16" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="672" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Reranker</text>
</svg></div><figcaption>Figure · Embeddings (bi-encoder) vs. reranker (cross-encoder)</figcaption></figure>


The typical architecture has two stages: hybrid search (which prioritizes coverage), then a reranker over 100–150 candidates, and finally between 10 and 20 chunks passed to the model that writes the answer.

#### 12.2 Types

| Type | Examples | Note |
|----|----|----|
| Classic cross-encoder | monoBERT, bge-reranker-v2-m3 | monoBERT: +27% in MRR@10 on MS MARCO (2019) |
| Language model as reranker | RankGPT, RankZephyr (open source), Setwise | RankZephyr matches or beats GPT-4 |
| Reasoning reranker (2025–26) | Rank1, Rank-R1, ReasonRank | On BRIGHT (search that requires reasoning), the best MTEB model drops from 59.0 to 18.3; reasoning about the question adds up to +12.2 |
| Late interaction | ColBERT | Middle ground: ~100× faster than a BERT reranker |

#### 12.3 Notable models (verified)

| Model | Organization / date | License | Data point |
|----|----|----|----|
| Rerank 4 Pro / Fast | Cohere, Dec 2025 | Paid service | \#2 on Agentset's independent leaderboard (1627 Elo points vs ~1457 for v3.5) |
| zerank-2 | ZeroEntropy | Open weights | \#1 on Agentset |
| rerank-2.5 | Voyage (MongoDB), Aug 2025 | Paid service | 32K context, follows instructions |
| Qwen3-Reranker 0.6/4/8B | Alibaba, Jun 2025 | Apache 2.0 | 69.76 on MTEB-R (4B) vs 57.03 for bge-v2-m3 |
| jina-reranker-v3.5 | Jina, Jul 2026 | Non-commercial | 63.20 on BEIR with 0.6B parameters |
| mxbai-rerank-large-v2 | Mixedbread, Mar 2025 | Apache 2.0 | 57.49 on BEIR |
| Semantic ranker | Microsoft (Azure AI Search) | Managed service | Reranks the top 50, score from 0 to 4 |
| Ranking API | Google | Managed service | Up to 1000 chunks per call, score from 0 to 1 |

#### 12.4 Practical rules

A reranker is the cheapest and most proven improvement you can make. In Anthropic's numbers, adding one on its own takes the failure rate from 2.9% to 1.9%.

But **the reranker only reorders what the search found.** If the correct document isn't among the candidates, it can't save you, which is why you measure retrieval coverage (recall) first.

What currently sets rerankers apart is instruction following: you can give them business rules such as "prioritize recent content". Every vendor claims to be the best, so measure with your own data.

Some add-ons are worth having. MMR removes redundant chunks. Compression with LongLLMLingua gives +21.4% quality with ~4× fewer tokens. And placement in the prompt matters: put the most relevant content at the beginning or the end ("Lost in the Middle").

## Part V · Generation and guardrails

### 13. Generation with citations and guardrails

The prompt looks like this:

```
System:   Answer ONLY from the context. Cite every claim as [n].
          If the context does not contain the answer, say "I don't know".
Context:  [1] Remote Work Policy §3.2 Spain, p. 4: "Manager: 2 days/week..."
          [2] 2026 Annex, p. 1: "...starting January 2026, 3 days for..."
Question: remote work days for a manager in Spain
```

Guardrails sit before, during and after generation:

1.  Before, detect attempts to manipulate the model ("jailbreak" or prompt injection).
2.  During, if the reranker leaves no chunk above the threshold, answer "I couldn't find that information" instead of making something up.
3.  After, check that every sentence of the answer is supported by the chunks. If the check fails, regenerate or answer cautiously.

## Part VI · Evaluation

### 14. Two separate tests


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 580" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="eval-cuadrante-title eval-cuadrante-desc">
      <title id="eval-cuadrante-title">Two tests: did it retrieve well? did it answer well?</title>
      <desc id="eval-cuadrante-desc">2×2 matrix crossing whether retrieval found the right documents with whether the answer was good, naming the action for each case; the priority is to fix retrieval first when both fail.</desc>
      <defs>
        <marker id="eval-cuadrante-axis-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0 0, 8 4, 0 8" fill="#2d3142"/></marker>
        <marker id="eval-cuadrante-axis-start" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><polygon points="8 0, 0 4, 8 8" fill="#2d3142"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="120" y="276" width="360" height="204" fill="rgba(235,108,54,0.04)"/>
      <rect x="160" y="96" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="176" y="120" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">01 · RETRIEVAL NO / ANSWER YES</text>
      <text x="176" y="152" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Lucky</text>
      <text x="176" y="200" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">The model knew it from memory.</text>
      <text x="176" y="216" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Dangerous.</text>
      <rect x="520" y="96" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="536" y="120" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">02 · RETRIEVAL YES / ANSWER YES</text>
      <text x="536" y="152" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">All good</text>
      <text x="536" y="200" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Keep it and monitor.</text>
      <rect x="160" y="296" width="280" height="160" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="176" y="320" fill="#4f5d75" font-size="8" font-weight="600" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">03 · RETRIEVAL NO / ANSWER NO</text>
      <text x="176" y="352" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Fix retrieval</text>
      <text x="176" y="372" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">first</text>
      <text x="176" y="408" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Chunking, hybrid, reranker,</text>
      <text x="176" y="424" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">number of results.</text>
      <rect x="520" y="296" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="536" y="320" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">04 · RETRIEVAL YES / ANSWER NO</text>
      <text x="536" y="352" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Fix the prompt</text>
      <text x="536" y="372" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">or the model</text>
      <text x="536" y="408" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Hallucinates or ignores context.</text>
      <line x1="128" y1="276" x2="832" y2="276" stroke="#2d3142" stroke-width="1.2" marker-start="url(#eval-cuadrante-axis-start)" marker-end="url(#eval-cuadrante-axis-end)"/>
      <line x1="480" y1="72" x2="480" y2="480" stroke="#2d3142" stroke-width="1.2" marker-start="url(#eval-cuadrante-axis-start)" marker-end="url(#eval-cuadrante-axis-end)"/>
      <text x="480" y="60" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">YES</text>
      <text x="496" y="64" fill="#4f5d75" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Answer: did it answer well?</text>
      <text x="480" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">NO</text>
      <text x="116" y="280" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="end" letter-spacing="0.18em">NO</text>
      <text x="844" y="280" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">YES</text>
      <text x="832" y="504" fill="#4f5d75" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">Retrieval: did it find the right documents?</text>
      <line x1="40" y1="528" x2="920" y2="528" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="556" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGEND</text>
      <rect x="120" y="544" width="16" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="144" y="556" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Priority: start here</text>
      <rect x="360" y="544" width="16" height="16" rx="4" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="384" y="556" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Other cases</text>
    </svg></div><figcaption>Figure · Two tests: did it retrieve well? did it answer well?</figcaption></figure>


If you only look at the final answer, you don't know what to fix. Microsoft calls evaluating the retrieval step *process evaluation* and evaluating the answer *system evaluation*.

### 15. The golden dataset (the "answer key")

The golden dataset is a set of 100 to 300 questions, each with its correct answer and the documents that should come up:

``` json
{"query": "Remote work days, manager, Spain?",
 "ground_truth": "2 days per week; 3 from January 2026 according to the annex",
 "relevant_docs": [{"document_id": "teletrabajo_p4", "query_relevance_label": 4},
                   {"document_id": "anexo2026_p1",  "query_relevance_label": 3}]}
```

| Where the questions come from | Why |
|----|----|
| Logs of real questions | That is what people actually ask |
| Business experts (HR, legal) | Hard cases and traps |
| Synthetic generation (RAGAS, cloud-provider simulators) | Fast coverage, but always reviewed by a human |
| Questions with no answer in the documents | They check that the system says "I don't know" instead of making things up |

### 16. Retrieval metrics, with numbers

Say that for one question the correct documents are A and C, and the search engine returned `[B, A, D, C, E]`.

| Position     | 1   | 2   | 3   | 4   | 5   |
|--------------|-----|-----|-----|-----|-----|
| Returned     | B   | A   | D   | C   | E   |
| Correct?     | ✗   | ✓   | ✗   | ✓   | ✗   |

| Metric | Question it answers | Calculation | Value |
|----|----|----|----|
| Recall@3 (coverage) | How many of the correct ones appear in the top 3? | 1 of 2 | 0.50 |
| Recall@5 | And in the top 5? | 2 of 2 | 1.00 |
| Precision@5 (precision) | Of what I brought back, how much is useful? | 2 of 5 | 0.40 |
| MRR (position of the first hit) | How high up is the first correct one? | 1/2 | 0.50 |
| nDCG@5 (ranking quality) | Are the correct ones as high up as possible? | Actual = 1/log₂3 + 1/log₂5 = 1.06; ideal = 1 + 1/log₂3 = 1.63 | 0.65 |

These numbers tell you where to look. If Recall@50 is low, the problem is in retrieval (chunking, embeddings, missing BM25), and the reranker won't fix it. If Recall@50 is high but nDCG@5 is low, the problem is in the reranker.

### 17. Answer metrics, with numbers

Suppose the system answers: *"You get 2 days per week \[1\], 3 starting January 2026 \[2\], and you can choose Fridays."*

| Claim in the answer        | Supported by the chunks? |
|----------------------------|--------------------------|
| `"2 days/week"`            | ✓                        |
| `"3 from January 2026"`    | ✓                        |
| `"you can choose Fridays"` | ✗ (made up)              |

| Metric | Question | Result |
|----|----|----|
| Groundedness / Faithfulness (the *precision* side) | Is everything it said in the chunks? | 2/3 = 0.67 ✗ hallucination |
| Completeness / Answer correctness (the *coverage* side) | Did it say everything the correct answer says? | 2/2 = 1.0 ✓ |
| Relevance | Does it answer what was asked? | ✓ |
| Correct citations | Does each \[n\] support its sentence? | ✓ |

Microsoft frames it the same way: faithfulness to the context is the precision side (add nothing) and completeness is the coverage side (leave out nothing critical).

Another option is "nugget" evaluation (TREC 2024): you define the atomic facts a good answer must contain and count how many appear.

### 18. The LLM as a judge

Nobody reviews 10,000 answers by hand, so another model plays the teacher. That judge has known biases. It prefers the first option it sees (position), it prefers long answers (verbosity), and it prefers text from its own model family (self-preference).

To set up a judge you can rely on:

1.  A human labels 50–100 cases.
2.  Measure judge–human agreement (Cohen's kappa, accuracy, F1).
3.  The judge must be from a different model family than the generator.
4.  The judge must explain its score.
5.  Scoring claim by claim (RAGChecker) or by nuggets is better than giving one overall score.

How far can you trust it? GPT-4 as a judge reaches more than 80% agreement with humans, the same level as between two humans (Zheng et al., 2023). In TREC 2024, perfect human–GPT-4o agreement was 56%, and 72% when the human was correcting the model's label. So the LLM judge is reliable for comparing systems and less reliable question by question. ARES combines a few hundred human labels with the automatic judge to produce statistically valid confidence intervals.

### 19. Evaluation before deployment and in production


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 664" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="eval-bucle-title eval-bucle-desc">
      <title id="eval-bucle-title">The continuous evaluation loop</title>
      <desc id="eval-bucle-desc">Six-step clockwise loop: golden dataset, offline evaluation, quality gate, deployment, continuous evaluation, and real failures with thumbs-down votes, which feed back into the golden dataset; at the center, retrieval and answer metrics.</desc>
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
      <text x="636" y="256" fill="#7a8399" font-size="8" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">METRICS</text>
      <rect x="296" y="372" width="56" height="12" rx="2" fill="#ffffff"/>
      <text x="324" y="380" fill="#7a8399" font-size="8" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">SAMPLES</text>
      <!-- hub -->
      <rect x="356" y="264" width="248" height="104" rx="8" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
      <text x="480" y="292" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">SHARED CORE</text>
      <text x="480" y="320" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Retrieval metrics +</text>
      <text x="480" y="340" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">answer metrics</text>
      <rect x="380" y="40" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="380" y="40" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="480" y="68" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Golden dataset</text>
      <text x="480" y="80" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">100–300 questions + answers</text>
      <text x="480" y="92" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">+ documents</text>
      <rect x="588" y="160" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="588" y="160" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="688" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Offline evaluation</text>
      <text x="688" y="208" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">recall@k · nDCG · faithfulness</text>
      <rect x="588" y="400" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="588" y="400" width="200" height="72" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="688" y="428" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Quality gate</text>
      <text x="688" y="440" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">continuous integration</text>
      <text x="688" y="452" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">blocks on regression</text>
      <rect x="380" y="520" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="380" y="520" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="480" y="560" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Deployment</text>
      <rect x="172" y="400" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="172" y="400" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="272" y="428" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Continuous evaluation</text>
      <text x="272" y="440" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">sample of real traffic</text>
      <text x="272" y="452" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">no reference answer</text>
      <rect x="172" y="160" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="172" y="160" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="272" y="192" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Real failures</text>
      <text x="272" y="208" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">and thumbs-down</text>
      <line x1="40" y1="612" x2="920" y2="612" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="632" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">LEGEND</text>
      <line x1="140" y1="628" x2="176" y2="628" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <text x="184" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Loop step</text>
      <line x1="328" y1="628" x2="364" y2="628" stroke="#4f5d75" stroke-width="1" stroke-dasharray="5,4" marker-end="url(#eval-bucle-arrow)"/>
      <text x="372" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Writes to the metrics</text>
      <rect x="580" y="620" width="24" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="612" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Quality gate</text>
    </svg></div><figcaption>Figure · The continuous evaluation loop</figcaption></figure>


A quality gate in continuous integration could require that Recall@10 drops no more than 2 points, faithfulness stays ≥ 95%, and correct "I don't know" answers stay ≥ 90%. Those thresholds are only examples; the business sets the real ones. In production you sample a percentage of real traffic and evaluate it without a reference answer (faithfulness, answer relevance, context relevance), alongside thumbs-up/thumbs-down votes, latency and cost.

Microsoft recommends a parameter sweep: try combinations and measure which one wins. The numbers below are illustrative, not real results:

| Configuration | Recall@10 | nDCG@5 | Faithfulness | Latency |
|----|----|----|----|----|
| vector only | 0.71 | 0.58 | 0.90 | 0.8 s |
| hybrid | 0.84 | 0.66 | 0.92 | 0.9 s |
| hybrid + rerank ← chosen | 0.84 | 0.79 | 0.95 | 1.3 s |
| \+ agentic <span style="font-weight:400">(complex questions only)</span> | 0.88 | 0.81 | 0.95 | 3.5 s |

DeepEval suggests no more than about 5 metrics per application. MLflow / Databricks recommend using the same evaluators in development and in production. And in production you can only use metrics that don't need a correct answer.

### 20. Why it matters: hallucination in real systems

| Study | Result |
|----|----|
| Stanford (2024): commercial legal tools with RAG | They hallucinate between 17% and 33% of the time |
| CRAG (Meta, 2024) | Model alone: ≤34% accuracy; simple RAG: 44%; the best industrial RAG systems answer without hallucinating only 63% of the time |
| FinanceBench (2023) | GPT-4-Turbo with retrieval failed or refused to answer in 81% of cases |
| ALCE (2023) | Even the best models lack full support for their citations 50% of the time |
| Vectara (leaderboard of 2026-09-22, summarization task) | Hallucination rates between 1.8% and 24.2% depending on the model (GPT-4o 9.6%, Gemini 2.5 Pro 7.0%, Claude Sonnet 4.5 12.0%) |
| FaithBench (2024) | The best hallucination detectors hover around 50% accuracy on hard cases |

Several of these figures are from 2023–2024 and come from older models, so always cite them with year and model.

## Part VII · A production example on Azure

### 21. Internal policy copilot, step by step

The case is a company with 20,000 employees, with HR, legal and procurement documents in SharePoint and Blob Storage. It needs per-user permissions, citations in every answer, and "I don't know" when there is no information.

#### 21.1 Architecture


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 608" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="azure-arquitectura-title azure-arquitectura-desc">
<title id="azure-arquitectura-title">Internal policy copilot on Azure</title>
<desc id="azure-arquitectura-desc">Azure architecture of a policy copilot: ingestion takes documents from SharePoint or Blob through an indexer with a skillset into Azure AI Search; the app answers the user with search, Azure OpenAI and Content Safety; Application Insights and Foundry evaluate and observe.</desc>
<defs>
<marker id="azure-arquitectura-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="azure-arquitectura-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="azure-arquitectura-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="40" y="40" width="880" height="120" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="44" width="76" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="53" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">INGESTION</text>
<rect x="40" y="200" width="880" height="200" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="204" width="84" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="213" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">QUERY</text>
<rect x="40" y="424" width="880" height="120" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="428" width="204" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="437" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">EVALUATION AND OBSERVABILITY</text>
<path d="M 296,104 H 368" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="300" y="84" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="332" y="93" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">DOCUMENTS</text>
<path d="M 592,104 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="604" y="84" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="93" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">INDEXES</text>
<path d="M 296,264 H 368" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="304" y="244" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="332" y="253" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">QUESTION</text>
<path d="M 592,264 H 664" fill="none" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<rect x="600" y="244" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="253" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">GENERATES</text>
<path d="M 560,232 V 200 Q 560,192 568,192 H 736 Q 744,192 744,184 V 136" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="620" y="200" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="652" y="209" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">SEARCH</text>
<path d="M 512,136 V 164 Q 512,172 520,172 H 736 a 8,8 0 0,1 16,0 H 768 Q 776,172 776,180 V 232" fill="none" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<rect x="584" y="152" width="72" height="12" rx="2" fill="#ffffff"/>
<text x="620" y="161" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">EMBEDDINGS</text>
<path d="M 560,296 V 344 Q 560,352 568,352 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="584" y="332" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="616" y="341" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">VERIFIES</text>
<path d="M 480,296 V 456" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="412" y="336" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="440" y="345" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TRACES</text>
<path d="M 592,488 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="600" y="468" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="477" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">SAMPLES</text>
<rect x="72" y="72" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="72" y="72" width="224" height="64" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="184" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">SharePoint / Blob Storage</text>
<text x="184" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">PDF · DOCX · PPTX</text>
<rect x="368" y="72" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="368" y="72" width="224" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="480" y="92" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Indexer + skillset</text>
<text x="480" y="108" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">Document Layout skill</text>
<text x="480" y="120" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">chunking · embeddings</text>
<rect x="664" y="72" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="664" y="72" width="224" height="64" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="776" y="92" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Azure AI Search</text>
<text x="776" y="108" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">BM25 + vector · RRF</text>
<text x="776" y="120" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">semantic ranker · allowed_groups</text>
<rect x="72" y="232" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="72" y="232" width="224" height="64" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="184" y="256" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">User</text>
<text x="184" y="272" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">Entra ID sign-in</text>
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
<text x="776" y="356" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">manipulation detection †</text>
<text x="776" y="368" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">faithfulness (groundedness)</text>
<rect x="368" y="456" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="368" y="456" width="224" height="64" rx="6" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="480" y="480" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Application Insights</text>
<text x="480" y="496" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">OpenTelemetry traces</text>
<rect x="664" y="456" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="664" y="456" width="224" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="776" y="476" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Evaluation in Foundry</text>
<text x="776" y="492" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">evaluators</text>
<text x="776" y="504" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">continuous evaluation</text>
<line x1="40" y1="568" x2="920" y2="568" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="40" y="588" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGEND</text>
<rect x="112" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="112" y="580" width="20" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="144" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">KEY</text>
<rect x="192" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="192" y="580" width="20" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="224" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">SERVICE</text>
<rect x="292" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="292" y="580" width="20" height="12" rx="2" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="324" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">EXTERNAL</text>
<rect x="388" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="388" y="580" width="20" height="12" rx="2" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="420" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">STORE</text>
<rect x="484" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="484" y="580" width="20" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="516" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">INPUT</text>
<line x1="580" y1="584" x2="604" y2="584" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<text x="612" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FLOW</text>
<line x1="668" y1="584" x2="692" y2="584" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<text x="700" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">MODEL CALL</text>
</svg></div><figcaption>Figure · Internal policy copilot on Azure</figcaption></figure>


If you know the LangChain + Chroma/Qdrant stack, the pieces map like this:

| Open-source stack | On Azure |
|----|----|
| LangChain loaders + text splitter | Indexer + Document Layout skill + chunking |
| Chroma / Qdrant | Azure AI Search (vectors + BM25 + filters in a single service) |
| Reranking with a language model | Semantic ranker (and optionally a language model behind it) |
| Your own query rewriting | Semantic ranker query rewriting (preview) or agentic retrieval |
| GraphRAG | Microsoft GraphRAG as a separate index, only for global questions |

#### 21.2 One question, end to end

Ana, a manager in Madrid, asked about her contract earlier in the chat. Now she types *"so how many days can I work remotely?"*


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 736" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="azure-secuencia-title azure-secuencia-desc">
      <title id="azure-secuencia-title">One question end to end: “so how many days can I work remotely?”</title>
      <desc id="azure-secuencia-desc">Sequence in which the app rewrites Ana's question with Azure OpenAI, retrieves chunks with hybrid search and the semantic ranker in Azure AI Search, generates an answer with citations and checks it with Content Safety before replying with citations or “I don't know”.</desc>
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
      <text x="204" y="124" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">question + history</text>
      <line x1="300" y1="184" x2="476" y2="184" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="328" y="164" width="120" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="172" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">rewrite the question</text>
      <line x1="476" y1="232" x2="300" y2="232" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="304" y="212" width="168" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="220" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">«remote work days manager Spain»</text>
      <line x1="300" y1="280" x2="660" y2="280" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="304" y="260" width="168" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="268" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">hybrid search + permission filter</text>
      <path d="M668 324 H696 Q704 324 704 332 V356 Q704 364 696 364 H672" fill="none" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="712" y="324" width="96" height="44" rx="2" fill="#ffffff"/>
      <text x="716" y="336" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">RRF (k=60)</text>
      <text x="716" y="348" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">+ semantic ranker</text>
      <text x="716" y="360" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">top 50 → score 0–4</text>
      <line x1="660" y1="404" x2="300" y2="404" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="316" y="384" width="144" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="392" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">5–10 chunks with score ≥ 2</text>
      <line x1="300" y1="452" x2="476" y2="452" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="320" y="432" width="136" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="440" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">generate with citations [n]</text>
      <line x1="476" y1="500" x2="300" y2="500" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="336" y="480" width="104" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="488" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">draft with citations</text>
      <line x1="300" y1="548" x2="844" y2="548" stroke="#eb6c36" stroke-width="1.2" marker-end="url(#azure-secuencia-arrow-accent)"/>
      <rect x="676" y="528" width="160" height="12" rx="2" fill="#ffffff"/>
      <text x="756" y="536" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">check faithfulness to context</text>
      <line x1="844" y1="596" x2="300" y2="596" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="688" y="576" width="136" height="12" rx="2" fill="#ffffff"/>
      <text x="756" y="584" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">supported / not supported</text>
      <line x1="292" y1="644" x2="116" y2="644" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="124" y="624" width="160" height="12" rx="2" fill="#ffffff"/>
      <text x="204" y="632" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">cited answer or «I don't know»</text>
      <rect x="292" y="128" width="8" height="524" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="476" y="176" width="8" height="64" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="476" y="444" width="8" height="64" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="660" y="272" width="8" height="140" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="844" y="540" width="8" height="64" fill="rgba(235,108,54,0.14)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="40" y="32" width="144" height="48" rx="6" fill="#ffffff"/>
      <rect x="40" y="32" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
      <text x="112" y="52" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Ana</text>
      <text x="112" y="68" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">user</text>
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
      <text x="40" y="712" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGEND</text>
      <line x1="140" y1="708" x2="180" y2="708" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/><text x="192" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">CALL</text>
      <line x1="300" y1="708" x2="340" y2="708" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/><text x="352" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">RETURN</text>
      <line x1="460" y1="708" x2="500" y2="708" stroke="#eb6c36" stroke-width="1.2" marker-end="url(#azure-secuencia-arrow-accent)"/><text x="512" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">KEY STEP: FAITHFULNESS CHECK</text>
    </svg></div><figcaption>Figure · One question end to end: “so how many days can I work remotely?”</figcaption></figure>


1.  The model rewrites the question using the chat history: *"remote work days allowed for a manager in Spain"*.

2.  BM25 and vector search run in parallel and are fused with RRF (k=60). Before scoring, the security filter removes whatever Ana is not allowed to see.

3.  The semantic ranker takes only the top 50 and scores them from 0 to 4:

    | Score | Meaning                      |
    |-------|------------------------------|
    | 4     | Fully answers                |
    | 3     | Relevant but incomplete      |
    | 2     | Partial                      |
    | 1     | Related, answers very little |
    | 0     | Irrelevant                   |

    Chunks with a score \< 2 are discarded. If none are left, the answer is "I couldn't find that information". Microsoft warns that the score distribution can vary slightly, so thresholds should not be too fine-grained.

4.  The model generates the answer with citations, using the prompt structure from section 13.

5.  A faithfulness check verifies that each sentence is supported by the chunks. If it fails, the answer is regenerated or given with caution.

A complex question (*"compare remote work in Spain vs Mexico and tell me which applies if I relocate"*) goes to Azure AI Search agentic retrieval, which splits it into subqueries, runs them in parallel, reranks each one with the semantic ranker and merges the results. The LLM-based query planning and answer synthesis are still in preview.

A global question (*"which themes recur across all the 2026 policies?"*) is where GraphRAG is worth it.

#### 21.3 Evaluation on Azure (Microsoft Foundry)

| Evaluator | Type | Needs a correct answer | Status |
|----|----|----|----|
| Document Retrieval | Retrieval: NDCG, XDCG, Fidelity, Max Relevance, Holes | Yes (relevance labels) | GA |
| Retrieval | Retrieval, judged by a language model (1–5 scale) | No | GA |
| Groundedness | Answer: faithfulness to the context | No | GA |
| Groundedness Pro | Strict faithfulness with Content Safety (true/false) | No | (preview) |
| Relevance | Answer: does it answer the question? | No | GA |
| Response Completeness | Answer: does it leave out anything critical? | Yes | (preview) |

Scores use a scale of 1 to 5 and pass at 3 by default. Continuous evaluation runs on samples of real traffic (configurable percentage, up to 1000 requests per hour) and sends the results to Application Insights, linked to the traces.

## Part VIII · Comparison: Azure vs Google Cloud vs open source

### 22. Azure vs Google Cloud vs open source

Some products have been renamed recently (verified on 2026-09-23):

- At Google, *Vertex AI* now appears as Gemini Enterprise Agent Platform, *Vertex AI Search* is being renamed to Agent Search, and *Vector Search 2.0* is now called Agent Retrieval.
- At Microsoft, *Azure AI Foundry* is now Microsoft Foundry.

#### Phase 1: Preparing the documents

| Stage | What it does | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 1. Sources | Where the documents live | Blob Storage, SharePoint | Cloud Storage, Google Drive | File system, S3-compatible storage (MinIO) † |
| 2. Reading (parsing) | PDF/Word → text with structure | Document Layout skill, which uses the Document Intelligence layout model and returns Markdown by section | Document AI Layout Parser: stable version since 2024; Gemini-powered versions in preview; figure and table descriptions with Gemini in preview | Docling (IBM, MIT), Unstructured, MinerU †, Marker † |
| 3. Chunking | Chunks with context | Document Layout skill (by section, or fixed size with overlap) and Text Split skill | The Layout Parser chunks by structure and adds the parent headings. RAG Engine lets you set size and overlap | LangChain and LlamaIndex text splitters; Docling chunking † |
| 4. Embeddings | Text → numbers | Azure OpenAI text-embedding-3-large / -small | gemini-embedding-001 (up to 3072 dimensions, 2048 tokens per text), text-embedding-005 (English and code), text-multilingual-embedding-002 | BGE-M3 (dense + sparse + multi-vector, more than 100 languages), Qwen3-Embedding (Apache 2.0), multilingual-E5 |
| 5. Index | Database to search | Azure AI Search: vectors, keywords and filters in a single service | Vector Search / Agent Retrieval, RAG Engine (managed database, Pinecone or Weaviate) or Agent Search (fully managed) | Qdrant, Chroma, Weaviate, Milvus, pgvector, Elasticsearch / OpenSearch † |
| 6. Permissions | Each user sees only their own content | Entra ID + group filter in the index | Google access control (IAM) + per-data-source access control in Agent Search | Metadata filters in the vector database † |

#### Phase 2: Answering a question

| Stage | What it does | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 7. Rewriting | Standalone question; split complex questions | Semantic ranker query rewriting (preview); agentic search with planning (preview) | Agent Search: follow-up questions and answers with agentic search | LangChain MultiQueryRetriever, HyDE, LlamaIndex query transformations † |
| 8. Keywords (BM25) | Exact match | BM25 built into AI Search | Vector Search: you generate the sparse vector (BM25, TF-IDF or SPLADE) and upload it. Agent Search: managed | Elasticsearch/OpenSearch BM25; sparse vectors in Qdrant; SPLADE |
| 9. Meaning | Nearest neighbors | Vectors in AI Search | Vector Search / Agent Retrieval (milliseconds even with billions of items, according to Google) | Qdrant, Chroma, Weaviate, Milvus, pgvector † |
| 10. Fusion | Combine lists | Automatic RRF (k=60), with a configurable weight for vectors | RRF with `rrf_ranking_alpha` | RRF in Qdrant †, Weaviate hybrid search †, LangChain EnsembleRetriever † |
| 11. Reranker | Rerank by reading question and chunk together | Semantic ranker: the top 50, score 0–4 | Ranking API: `semantic-ranker-default-004` / `-fast-004` (1024 tokens, 25 languages, score 0–1, up to 1000 chunks per call). Version 005 has been in preview since Sep 1, 2026 and will become the default no later than Oct 1, 2026 | bge-reranker-v2-m3, Qwen3-Reranker (Apache 2.0), mxbai-rerank-v2 (Apache 2.0), ColBERTv2; or a language model as the reranker |
| 12. Agent | Chained searches | Agentic search / Foundry IQ (the language-model part in preview) | Agent Development Kit (ADK) + Agent Runtime; Gemini Deep Research agent | LangGraph, LlamaIndex agents † |
| 13. GraphRAG | Graph for global questions | Microsoft GraphRAG (open source) deployed on Azure; LazyGraphRAG in Microsoft Discovery | No managed equivalent found (as of 2026-09-23) | GraphRAG (Microsoft), LightRAG, HippoRAG 2 |

#### Phase 3: Generation and guardrails

| Stage | What it does | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 14. Writing model | Answer with citations | GPT models in Azure OpenAI / Microsoft Foundry (also other models in Foundry †) | Gemini (3.x family); also Claude, Llama, Qwen and others in Model Garden | Llama, Qwen, Mistral, gpt-oss served with vLLM or Ollama † |
| 15. Input protection | Block manipulation attempts | Content Safety – Prompt Shields † | Model Armor | NeMo Guardrails, Llama Guard † |
| 16. Faithfulness to the documents | Is every sentence supported? | Groundedness evaluator; Groundedness Pro (preview) | Check Grounding API: 0–1 score per claim + citations, in under 500 ms | HHEM-2.1-Open (Vectara), MiniCheck |

#### Phase 4: Evaluation and monitoring

| Stage | What it does | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 17. Evaluating retrieval | Did it find the right thing? | Document Retrieval (NDCG, XDCG, Fidelity, Holes; needs labels) and Retrieval (judge, no labels) | Evaluate search quality in Agent Search; Agent Platform evaluation service | RAGAS, DeepEval, RAGChecker, Open RAG Eval (UMBRELA) |
| 18. Evaluating the answer | Faithful, relevant and complete? | Groundedness, Relevance, Response Completeness (preview); 1–5 scale, passes at 3 | Evaluation service with rubric-based metrics, a configurable judge and the option to evaluate the judge itself | RAGAS, DeepEval, TruLens ("RAG triad"), ARES (confidence intervals) |
| 19. Continuous evaluation | Evaluate samples of real traffic | Foundry continuous evaluation: configurable sampling, up to 1000/hour, results in Application Insights | Online Monitors: every ~10 min, configurable percentage and cap, results in Cloud Logging and Cloud Monitoring | Langfuse †, Arize Phoenix, MLflow |
| 20. Traces | See what happened at each step | Application Insights / Azure Monitor + OpenTelemetry | Cloud Trace, Cloud Logging, Cloud Monitoring + OpenTelemetry (`gen_ai.` attributes) | OpenTelemetry + Phoenix / Langfuse † |
| 21. Deployment | Where the app runs | Container Apps, App Service, AKS (Kubernetes) † | Cloud Run, GKE (Kubernetes), Agent Runtime | Docker + Kubernetes, FastAPI † |

#### Summary in one picture

| Stage | Azure | Google Cloud | Open source |
|----|----|----|----|
| Read docs | Document Layout skill | Document AI Layout Parser | Docling / Unstructured |
| Vectors | text-embedding-3 | gemini-embedding-001 | BGE-M3 / Qwen3-Embedding |
| Index | Azure AI Search | Vector Search / Agent Search | Qdrant / Chroma / Weaviate |
| Fusion | Automatic RRF (k=60) | RRF (rrf_ranking_alpha) | RRF (Qdrant, LangChain) |
| Reranker | Semantic ranker (top 50) | Ranking API (up to 1000) | bge / Qwen3 / mxbai reranker |
| Model | GPT (Azure OpenAI) | Gemini | Llama / Qwen / gpt-oss + vLLM |
| Verification | Groundedness (Pro in preview) | Check Grounding API | HHEM-Open / MiniCheck |
| Evaluation | Foundry evaluators | Evaluation service | RAGAS / DeepEval / TruLens |
| Production | Continuous evaluation | Online Monitors | Phoenix / MLflow / Langfuse |

#### Three differences that matter

1.  Hybrid search: Azure AI Search includes keyword search. In **Google Vector Search you have to generate the sparse vector yourself**; if you want Google to manage it, use Agent Search. In open source it depends on the database.
2.  Reranker: Azure's reranks only the top 50. Google's Ranking API accepts up to 1000 chunks and works with any search engine, even an external one. In open source you control the model, cost and latency, but you also have to operate it.
3.  Evaluation: both clouds now offer offline evaluation and continuous evaluation on real traffic, with standard traces (OpenTelemetry). In open source, RAGAS or DeepEval (offline) plus Phoenix, MLflow or Langfuse (production) cover the same ground, but you do the integration yourself.

## Appendix · Glossary

| Term | Plain meaning |
|----|----|
| Agentic search | An agent splits the question and runs several searches |
| BM25 | Classic keyword search algorithm |
| Chunk | A piece of a document that is indexed separately |
| Cohen's kappa | A measure of agreement between two raters that discounts agreement by chance |
| Completeness | That the answer doesn't leave out important information |
| Continuous integration (CI) | Automated tests that run on every code change |
| Cross-encoder / bi-encoder | Reads both texts together / turns each text into a vector separately |
| Dense / sparse | A vector with all values active / a vector of weighted terms, almost all zero |
| Embedding / vector | A list of numbers that represents the meaning of a text |
| Entra ID | Microsoft's identity and access system |
| Golden dataset | A set of questions with their correct answers and documents |
| GraphRAG | RAG with a graph of entities and relationships |
| Groundedness / faithfulness | That the answer says nothing that isn't in the documents |
| Hallucination | When the model makes up information |
| HNSW | A graph-shaped structure for quickly finding the nearest vectors |
| Hybrid search | Combining keyword search and meaning-based search |
| IAM | Google Cloud's access control system |
| Inverted index | A "word → documents where it appears" table |
| kNN | Finding the k nearest neighbors |
| Language model (LLM) | The model that writes the answer (GPT, Gemini, Claude, Llama…) |
| LLM judge | Another model that scores the answers |
| MMR | A technique for removing redundant results |
| MRR | How high up the first correct result appears |
| nDCG | Ranking quality: whether the correct items are as high up as possible (Azure's evaluators spell it *NDCG*) |
| OpenTelemetry | An open standard for recording traces and metrics |
| Parsing | Converting a file (PDF, Word) into text with structure |
| Precision@k | What fraction of the top k results is correct |
| Preview / GA | Feature in testing / official, stable feature |
| Quantization | Compressing the numbers in vectors to save memory |
| RAG | Retrieval-augmented generation: searching your documents before answering |
| Recall@k | What fraction of the correct items appears in the top k results |
| Reranker | A model that reorders the candidates by reading the question and the chunk together |
| RRF | Reciprocal rank fusion: combining lists using only positions |
| SPLADE / ELSER | Models that expand text with related terms (learned sparse) |

## Appendix · References

### Official documentation (accessed on 2026-09-23)

**Microsoft Azure**

- Semantic ranker: <https://learn.microsoft.com/en-us/azure/search/semantic-search-overview>
- RRF in hybrid search: <https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking>
- Agentic search: <https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview>
- Document Layout skill: <https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-document-intelligence-layout>
- Chunking in Azure AI Search: <https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents>
- RAG evaluators: <https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators>
- Continuous evaluation: <https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/continuous-evaluation-agents>

**Google Cloud**

- Ranking API: <https://cloud.google.com/generative-ai-app-builder/docs/ranking>
- Check Grounding: <https://cloud.google.com/generative-ai-app-builder/docs/check-grounding>
- Document AI Layout Parser: <https://cloud.google.com/document-ai/docs/layout-parse-chunk>
- RAG Engine: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/rag-overview>
- Hybrid search in Vector Search: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/about-hybrid-search>
- Text embeddings: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings>
- Online Monitors: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/evaluate-online>

**Elastic**

- Semantic search: <https://www.elastic.co/docs/solutions/search/semantic-search>
- Vector search: <https://www.elastic.co/docs/solutions/search/vector>
- semantic_text: <https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-text>
- ELSER: <https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-elser>
- Retrievers: <https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers>

### Papers and reports

**Retrieval**

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
- Anthropic, *Contextual Retrieval*, 2024 — <https://www.anthropic.com/engineering/contextual-retrieval> (figures verified via a mirror; the original page blocked automated access)
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

**Evaluation**

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
