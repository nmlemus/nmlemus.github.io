---
title: "RAG de ponta a ponta: um tutorial prático"
description: "O que é, como funciona cada peça, como se avalia, um exemplo em produção no Azure e uma comparação entre Azure · Google Cloud · open source"
date: 2026-09-25
tags: [rag, retrieval, evaluation]
---

Conectar um banco vetorial é a parte fácil do RAG. Se ele funciona ou não depende de ler bem os documentos, fazer busca híbrida, aplicar reranking e medir a recuperação e as respostas separadamente.

Nos testes da Anthropic (2024), adicionar contexto aos chunks, BM25 e um reranker reduziu as falhas de recuperação em 67%. Ferramentas comerciais de RAG jurídico alucinam em 17–33% dos casos (Stanford, 2024), e no benchmark CRAG da Meta (2024) os melhores sistemas de RAG industriais só respondem sem alucinar em 63% das vezes. Para medir tudo isso, um juiz LLM concorda com humanos em mais de 80% das vezes (Zheng et al., 2023).

Conferi quase tudo o que está aqui na documentação oficial e nos artigos citados em 23 de setembro de 2026. Alguns detalhes de ferramentas marcados com † vêm da experiência geral e não voltei a verificá-los. Recursos marcados com (preview) existem, mas o fornecedor ainda não os recomenda para produção. As siglas são explicadas na primeira vez em que aparecem e ficam reunidas no glossário no final; os artigos são citados pelo nome no texto (*SPLADE*, *ColBERT*, *RAGAS*), com autores, ano e link nas referências.

## Parte I · Conceitos

### 1. O que é RAG, explicado com uma biblioteca

**RAG** (*Retrieval-Augmented Generation*) significa que, antes de responder, um modelo de linguagem busca nos seus documentos e responde a partir do que encontrou, citando a fonte.

Por que você precisa disso? Um modelo de linguagem não conhece os documentos internos da sua empresa, o conhecimento dele para numa data de corte e ele pode inventar coisas ("alucinar"). Com RAG, a resposta se apoia em documentos específicos que qualquer pessoa pode conferir, e atualizar o conhecimento não exige retreinar o modelo.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:965px" viewBox="0 0 1440 320"  xmlns="http://www.w3.org/2000/svg" role="img"
         aria-labelledby="rag-library-title rag-library-desc">
      <title id="rag-library-title">RAG explicado como uma biblioteca</title>
      <desc id="rag-library-desc">Um pipeline da esquerda para a direita com sete etapas (documentos, chunks, índice, busca, reranker, modelo e avaliação) mapeadas para a metáfora de uma biblioteca: o acervo de documentos é cortado em fichas, catalogado, pesquisado por um bibliotecário, filtrado por um especialista (o reranker), redigido por um modelo e corrigido por um professor, com a etapa de geração em destaque.</desc>
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
      <text x="120" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Seus arquivos-fonte</text>
      <text x="120" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">(PDFs, wikis, políticas)</text>
      <!-- ============ STAGE 2 · Index cards (chunks) ============ -->
      <rect x="230" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="240" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">2</text>
      <rect x="240" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="240" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="320" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Fichas</text>
      <text x="320" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">chunks</text>
      <text x="320" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Corte os documentos</text>
      <text x="320" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">em pedaços pequenos</text>
      <!-- ============ STAGE 3 · Catalog (index) ============ -->
      <rect x="430" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="440" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">3</text>
      <rect x="440" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="440" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="520" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Catálogo</text>
      <text x="520" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">índice</text>
      <text x="520" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Arquive cada ficha</text>
      <text x="520" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">por termo e sentido</text>
      <!-- ============ STAGE 4 · Librarian (search) ============ -->
      <rect x="630" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="640" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">4</text>
      <rect x="640" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="640" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="720" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Bibliotecário</text>
      <text x="720" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">busca</text>
      <text x="720" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Traz ~50</text>
      <text x="720" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">fichas candidatas</text>
      <!-- ============ STAGE 5 · Expert (reranker) ============ -->
      <rect x="830" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="840" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">5</text>
      <rect x="840" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="840" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="920" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Especialista</text>
      <text x="920" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">reranker</text>
      <text x="920" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Fica com as</text>
      <text x="920" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">5 melhores</text>
      <!-- ============ STAGE 6 · Writer (model) · HIGHLIGHT ============ -->
      <rect x="1030" y="96" width="20" height="16" rx="8" fill="rgba(254,219,0,0.20)"/>
      <text x="1040" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">6</text>
      <rect x="1040" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="1040" y="120" width="160" height="128" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.2"/>
      <text x="1120" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Redator</text>
      <text x="1120" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">modelo</text>
      <text x="1120" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Escreve a resposta</text>
      <text x="1120" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">com citações</text>
      <!-- ============ STAGE 7 · Teacher (evaluation) ============ -->
      <rect x="1230" y="96" width="20" height="16" rx="8" fill="rgba(0,0,0,0.12)"/>
      <text x="1240" y="107" font-family="Meslo, Menlo, monospace" font-size="9" fill="#000000" text-anchor="middle">7</text>
      <rect x="1240" y="120" width="160" height="128" rx="6" fill="#ffffff"/>
      <rect x="1240" y="120" width="160" height="128" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="1320" y="182" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Professor</text>
      <text x="1320" y="200" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">avaliação</text>
      <text x="1320" y="216" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">Nota: recuperou</text>
      <text x="1320" y="228" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8" text-anchor="middle">bem? respondeu bem?</text>
      <!-- ============ LEGEND (horizontal bottom strip) ============ -->
      <line x1="40" y1="280" x2="1400" y2="280" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="300" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">LEGENDA</text>
      <rect x="132" y="292" width="12" height="12" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1"/>
      <text x="152" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Etapas de recuperação (ingestão → busca → rerank)</text>
      <rect x="470" y="292" width="12" height="12" rx="2" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.2"/>
      <text x="490" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Geração (etapa principal)</text>
      <line x1="720" y1="298" x2="744" y2="298" stroke="#003da5" stroke-width="1" marker-end="url(#arrow)"/>
      <text x="752" y="301" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Passagem de dados entre etapas</text>
    </svg></div><figcaption>RAG como uma biblioteca: documentos → chunks → índice → busca → reranker → modelo → avaliação</figcaption></figure>


Gao et al. (2023/24) descrevem a evolução da área em três estágios:

| Estágio | Ideia |
|----|----|
| Naive RAG | Indexar → recuperar os top k → colar no prompt |
| Advanced RAG | Melhorar as coisas antes da busca (reescrever a pergunta, fazer um chunking melhor) e depois dela (reranking, compressão) |
| Modular RAG | Peças intercambiáveis; fluxos adaptativos, iterativos e agênticos |

### 2. Os três circuitos de um sistema RAG em produção


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 528" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-circuitos-title rag-circuitos-desc">
<title id="rag-circuitos-title">Os três circuitos de um RAG em produção</title>
<desc id="rag-circuitos-desc">Arquitetura de um RAG com três circuitos: preparar os documentos (fontes, parsing e chunking, embeddings, índice), responder a cada pergunta (busca híbrida, reranker, modelo com citações) e avaliar com um golden set e amostragem para realimentar melhorias.</desc>
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
<text x="56" y="205" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">RESPONDER · CADA PERGUNTA</text>
<rect x="40" y="344" width="880" height="112" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="348" width="248" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="357" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">AVALIAR · ANTES E EM PRODUÇÃO</text>
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
<text x="832" y="329" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TRACES</text>
<path d="M 708,404 H 380 Q 372,404 372,396 V 280" fill="none" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#rag-circuitos-arrow)"/>
<rect x="504" y="384" width="72" height="12" rx="2" fill="#ffffff"/>
<text x="540" y="393" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">MELHORIAS</text>
<rect x="72" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="72" y="72" width="176" height="56" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="160" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Fontes</text>
<text x="160" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">SharePoint · Blob · Drive</text>
<rect x="284" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="284" y="72" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="372" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Parsing + chunking</text>
<text x="372" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">estrutura, títulos, tabelas</text>
<rect x="496" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="496" y="72" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Embeddings</text>
<text x="584" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">texto → vetor</text>
<rect x="708" y="72" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="72" width="176" height="56" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="796" y="96" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Índice</text>
<text x="796" y="112" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">vetores + BM25 + permissões</text>
<rect x="72" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="72" y="224" width="176" height="56" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="160" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Usuário</text>
<text x="160" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">pergunta</text>
<rect x="284" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="284" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="372" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Busca híbrida</text>
<text x="372" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">BM25 + vetor · RRF</text>
<rect x="496" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="496" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Reranker</text>
<text x="584" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">top 50 → top 5</text>
<rect x="708" y="224" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="224" width="176" height="56" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="796" y="248" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Modelo com citações</text>
<text x="796" y="264" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">resposta ou “não sei”</text>
<rect x="708" y="376" width="176" height="56" rx="6" fill="#ffffff"/>
<rect x="708" y="376" width="176" height="56" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="796" y="400" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Avaliação</text>
<text x="796" y="416" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">golden set · amostragem</text>
<line x1="40" y1="480" x2="920" y2="480" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="40" y="500" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGENDA</text>
<rect x="112" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="112" y="492" width="20" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="144" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">DESTAQUE</text>
<rect x="200" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="200" y="492" width="20" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="232" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">PROCESSO</text>
<rect x="300" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="300" y="492" width="20" height="12" rx="2" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="332" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FONTE</text>
<rect x="392" y="492" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="392" y="492" width="20" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="424" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">ENTRADA</text>
<line x1="492" y1="496" x2="516" y2="496" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#rag-circuitos-arrow)"/>
<text x="524" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FLUXO</text>
<line x1="588" y1="496" x2="612" y2="496" stroke="#4f5d75" stroke-width="1.2" stroke-dasharray="4,3" marker-end="url(#rag-circuitos-arrow)"/>
<text x="620" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">MELHORIA / FEEDBACK</text>
</svg></div><figcaption>Figura · Os três circuitos de um RAG em produção</figcaption></figure>


## Parte II · Preparando os documentos

### 3. Ler bem o documento (parsing)

O parsing tem mais impacto do que qualquer outra etapa, e é a que as equipes mais deixam de lado. Converta um PDF em "texto puro" e você perde os títulos, as tabelas ficam embaralhadas e cada chunk perde o seu contexto.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:670px" viewBox="0 0 1000 340"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-parsing-title rag-parsing-desc">
  <title id="rag-parsing-title">Parsing: texto puro versus parsing com estrutura</title>
  <desc id="rag-parsing-desc">Uma comparação de antes e depois do parsing de documentos. À esquerda, a extração de texto puro achata um PDF e perde os títulos e a estrutura da tabela. Uma seta com o rótulo modelo de layout aponta para o painel da direita, onde o parsing que respeita a estrutura mantém a hierarquia de títulos em Markdown e preserva a tabela.</desc>
  <defs>
    <marker id="rp-arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><polygon points="0 0, 9 3.5, 0 7" fill="#003da5"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- arrow between panels (drawn before boxes) -->
  <line x1="420" y1="180" x2="576" y2="180" stroke="#003da5" stroke-width="1.4" marker-end="url(#rp-arrow)"/>
  <rect x="452" y="160" width="96" height="14" rx="2" fill="#ffffff"/>
  <text x="500" y="170" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle" letter-spacing="0.04em">mod. de layout</text>
  <!-- LEFT: plain-text extraction (structure lost) -->
  <rect x="40" y="72" width="380" height="216" rx="6" fill="#ffffff"/>
  <rect x="40" y="72" width="380" height="216" rx="6" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
  <text x="60" y="100" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">EXTRAÇÃO DE TEXTO PURO</text>
  <text x="60" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000">PDF original, achatado</text>
  <text x="60" y="150" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">POLÍTICA DE TELETRABALHO 3.</text>
  <text x="60" y="166" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">Elegibilidade Cargo Dias País</text>
  <text x="60" y="182" font-family="Meslo, Menlo, monospace" font-size="10" fill="#4d6fa8">Ger 2 ES 3 Sex opcional...</text>
  <text x="60" y="222" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• títulos perdidos</text>
  <text x="60" y="240" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• tabela vira uma linha só</text>
  <text x="60" y="258" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">• cada chunk perde o contexto</text>
  <!-- RIGHT: structure-aware parsing (highlighted, accent) -->
  <rect x="580" y="72" width="380" height="216" rx="6" fill="#ffffff"/>
  <rect x="580" y="72" width="380" height="216" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="600" y="100" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.12em">COM ESTRUTURA → MARKDOWN</text>
  <text x="600" y="120" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000">Títulos e tabela preservados</text>
  <text x="600" y="146" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000"># Política de Teletrabalho<tspan fill="#4d6fa8">   ← h1</tspan></text>
  <text x="600" y="162" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">## 3. Elegibilidade por país<tspan fill="#4d6fa8"> ← h2</tspan></text>
  <text x="600" y="178" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">### 3.2 Espanha<tspan fill="#4d6fa8">   ← h3</tspan></text>
  <text x="600" y="204" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">| Cargo   | Dias/sem. |</text>
  <text x="600" y="220" font-family="Meslo, Menlo, monospace" font-size="10" fill="#000000">| Gerente | 2         |</text>
  <text x="600" y="252" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">a tabela continua sendo tabela →</text>
  <text x="600" y="270" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5">o chunk mantém o caminho de títulos</text>
</svg></div><figcaption>Parsing: a extração de texto puro perde a estrutura; o parsing que respeita a estrutura mantém títulos e tabelas</figcaption></figure>


Os estudos concordam nisso:

- Os autores do ColPali (ICLR 2025) "costumam constatar que otimizar o pipeline de ingestão traz melhorias muito maiores do que otimizar o modelo de embedding". O próprio ColPali dispensa a extração de texto e o chunking e indexa diretamente as imagens das páginas; no benchmark ViDoRe ele marcou 81.3 de nDCG@5, contra ~65–67 dos pipelines de parsing.
- No estudo da Unstructured sobre o FinanceBench (2024), o chunking por elementos do documento (títulos, tabelas) chegou a 53.2% de acurácia, contra 48.2% com chunks fixos de 512 tokens, e usou metade dos chunks.
- Um estudo em turco (2026) constatou que o chunking que respeita o layout ajuda muito mais em documentos com tabelas do que em documentos só de texto.

As ferramentas mais usadas são a Document Layout skill (Azure), o Document AI Layout Parser (Google) e o Docling (IBM, open source). A seção 22 compara as três.

### 4. Chunking

O chunking divide cada documento em pedaços pequenos (*chunks*) que são indexados separadamente.

#### 4.1 As estratégias

| Estratégia | Como divide | Custo |
|----|----|----|
| Tamanho fixo | A cada N tokens, com sobreposição opcional | Mínimo |
| Recursivo | Tenta dividir por parágrafo, depois por linha, depois por frase… | Mínimo |
| Por estrutura / página | Pelas seções, títulos ou páginas do documento | Baixo (exige um bom parsing) |
| Semântico | Divide onde o sentido muda entre frases, medido com embeddings | Médio |
| Baseado em LLM ("agêntico") | Um modelo decide onde dividir | Alto |
| Proposições | Um modelo reescreve o texto em fatos atômicos | Alto |

#### 4.2 O que diz a evidência: o chunking semântico é superestimado

- A Vectara (2024) perguntou "Is Semantic Chunking Worth the Computational Cost?" e concluiu que "os custos computacionais associados ao chunking semântico não se justificam por ganhos de desempenho consistentes". O chunking de tamanho fixo venceu nos 4 datasets de documentos reais (no HotpotQA, por exemplo, o F1@5 foi 90.59 com tamanho fixo contra 87.37 com o semântico). O modelo de embedding pesou mais do que o chunking.
- A Chroma (2024) constatou que a estratégia de chunking muda o recall em até 9%. O chunker semântico padrão dela ficou um pouco abaixo da média (83.6% de recall), enquanto um chunker recursivo de 200 tokens sem sobreposição chegou a 88.1%. O melhor resultado (91.9%) usou um modelo de linguagem e custou bem mais.
- A NVIDIA (junho de 2025) obteve a melhor acurácia média (0.648) e a menor variância entre datasets com chunking **por página**.
- Em biomedicina (2026), o chunking semântico ganhou +8.4 pontos de F1 em um dataset, mas nos demais o chunking de tamanho fixo "continua competitivo ou melhor". Depende do domínio.

#### 4.3 O que funciona: adicionar contexto a cada chunk

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th>Chunk sem contexto</th>
<th>Chunk com contexto</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>"| Manager | 2 |"</code><br />
<span class="note">→ 2 o quê? onde?</span></td>
<td><code>"Remote Work Policy &gt; 3. Eligibility &gt; 3.2 Spain | Manager | 2 days/week |"</code><br />
<span class="note">→ dá para entender sozinho</span></td>
</tr>
</tbody>
</table>

O **Contextual Retrieval** da Anthropic (set. 2024) faz um modelo escrever 50–100 tokens de contexto e os coloca no início de cada chunk. Medido como a taxa de falha de recuperação dentro dos 20 primeiros resultados, partindo de uma linha de base de 5.7%:

- contexto só nos vetores: 3.7% (−35%)
- contexto nos vetores e no BM25: 2.9% (−49%)
- tudo isso mais um reranker: 1.9% (−67%)

O custo, pago uma única vez, é de ~\$1.02 por milhão de tokens de documento com prompt caching. Cuidado ao citar esses números: as três porcentagens são reduções em relação à linha de base de 5.7%, então a contribuição do reranker em si é o passo de 2.9% para 1.9%.

O late chunking (Jina, 2024) calcula primeiro o embedding do documento inteiro e só depois o divide, de modo que cada vetor "sabe" de que documento vem. Ele melhora o nDCG@10 de +2.7% a +3.6% sem retreinar.

#### 4.4 Tamanhos iniciais

Bhat et al. (2025) sugerem 64–128 tokens para perguntas factuais curtas e 512–1024 tokens para perguntas que exigem contexto amplo. O Azure recomenda começar com 512 tokens e 25% de sobreposição, e adicionar o título do documento aos chunks do meio.

Um padrão razoável: comece com chunking recursivo ou por seção/página de 256–512 tokens, não divida tabelas, adicione contexto e ajuste medindo (Parte VI).

### 5. Transformar texto em vetores (embeddings)

Um **embedding** é uma lista de números que representa o significado de um texto. Textos com significados parecidos ficam próximos:


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:549px" viewBox="0 0 820 380"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-embed-title rag-embed-desc">
  <title id="rag-embed-title">Embeddings aproximam significados parecidos</title>
  <desc id="rag-embed-desc">Um espaço vetorial conceitual. Os pontos de notebook barato e laptop econômico ficam próximos porque significam quase a mesma coisa, enquanto política de férias fica longe porque não tem relação. A distância no espaço representa diferença de significado, não palavras em comum.</desc>
  <defs>
    <marker id="re-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#003da5"/></marker>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <!-- plane -->
  <rect x="40" y="64" width="740" height="256" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
  <text x="56" y="88" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">ESPAÇO DE EMBEDDINGS · DISTÂNCIA = DIFERENÇA DE SENTIDO</text>
  <!-- close pair: connecting line drawn first -->
  <line x1="232" y1="196" x2="360" y2="164" stroke="#003da5" stroke-width="1" stroke-dasharray="4,3"/>
  <rect x="252" y="168" width="80" height="14" rx="2" fill="#ffffff"/>
  <text x="292" y="178" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">perto</text>
  <!-- point 1: cheap laptop (highlighted accent) -->
  <circle cx="232" cy="196" r="9" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.6"/>
  <text x="232" y="228" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"notebook barato"</text>
  <!-- point 2: inexpensive notebook -->
  <circle cx="360" cy="164" r="9" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.6"/>
  <text x="360" y="148" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"laptop econômico"</text>
  <!-- far point: vacation policy -->
  <line x1="256" y1="204" x2="628" y2="268" stroke="rgba(0,0,0,0.30)" stroke-width="1" stroke-dasharray="2,4"/>
  <rect x="410" y="232" width="60" height="14" rx="2" fill="#ffffff"/>
  <text x="440" y="242" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">longe</text>
  <circle cx="640" cy="272" r="9" fill="rgba(0,0,0,0.05)" stroke="#4d6fa8" stroke-width="1.4"/>
  <text x="640" y="298" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="12" font-weight="600" fill="#000000" text-anchor="middle">"política de férias"</text>
  <!-- legend -->
  <line x1="40" y1="344" x2="780" y2="344" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
  <circle cx="52" cy="362" r="6" fill="rgba(254,219,0,0.30)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="66" y="365" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Sentido parecido, vizinhos próximos</text>
  <circle cx="360" cy="362" r="6" fill="rgba(0,0,0,0.05)" stroke="#4d6fa8" stroke-width="1.4"/>
  <text x="374" y="365" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Sem relação, longe, mesmo com palavras em comum</text>
</svg></div><figcaption>Embeddings aproximam significados parecidos e afastam textos sem relação</figcaption></figure>


| Tipo | O que é | Exemplos |
|----|----|----|
| Denso | Centenas ou milhares de números, todos com valor | text-embedding-3 (OpenAI/Azure), gemini-embedding-001, Qwen3-Embedding, BGE-M3 |
| Esparso aprendido | Lista de termos (quase todos zero) com pesos, expandida com termos relacionados | SPLADE, ELSER (Elastic), modo esparso do BGE-M3 |
| Multivetor | Um vetor por token; a comparação é feita token a token | ColBERT, ColPali |

Meça com os seus próprios dados. Os rankings públicos (como o MTEB) mudam todo mês e nem sempre refletem o seu domínio. E fixe a versão do modelo: se você misturar vetores de modelos diferentes, as buscas deixam de fazer sentido.

### 6. Índice e permissões

O índice guarda cada chunk com seu texto, seu vetor e seus metadados:

| Campo(s) no índice                 | Finalidade                       |
|------------------------------------|----------------------------------|
| `id, content, content_vector`      | o texto do chunk e seu embedding |
| `title, section, page, source_url` | de onde veio                     |
| `allowed_groups`                   | grupos que podem vê-lo           |
| `last_modified`                    | atualidade                       |

Sem `allowed_groups` e um **filtro de segurança** em cada busca, um estagiário poderia receber chunks de documentos do comitê executivo.

## Parte III · Recuperação

### 7. BM25: busca por palavras-chave

O BM25 é o algoritmo clássico de busca por palavras-chave (léxica) e o padrão no Elasticsearch, no OpenSearch e no Azure AI Search. Ele funciona sobre um **índice invertido**, que se parece com o índice remissivo no final de um livro:

| Termo           | Documentos em que aparece (postings)  |
|-----------------|---------------------------------------|
| `"remote work"` | doc3, doc7, doc12                     |
| `"manager"`     | doc7, doc9                            |
| `"spain"`       | doc7, doc12, doc15                    |

A pontuação tem três partes:

| Ingrediente | Ideia | Exemplo |
|----|----|----|
| Frequência do termo | Mais ocorrências = mais pontos, mas com saturação (parâmetro `k1`, 1.2 por padrão no Elasticsearch †) | 3 vezes \> 1 vez, mas 20 vezes ≈ 10 vezes |
| Raridade do termo | Palavras raras valem mais | "ORA-00942" vale muito; "de" quase nada |
| Tamanho do documento | Um texto curto que contém a palavra pontua mais do que um longo (parâmetro `b`, 0.75 por padrão †) | Um parágrafo específico ganha de um manual inteiro |

O BM25 é rápido, não precisa de modelo, pode ser explicado e é excelente para termos exatos como códigos, siglas e nomes próprios. O ponto fraco são os sinônimos: *"notebook barato"* não encontra *"laptop econômico"*.

### 8. Busca semântica: pelo significado

#### 8.1 Vetores densos (busca de vizinhos mais próximos)

Aqui a pergunta vira um vetor e você recupera os chunks mais próximos. Fazer isso rápido sobre milhões de vetores exige um índice aproximado, geralmente **HNSW** (um grafo de vizinhos).

A busca densa entende sinônimos, paráfrases e idiomas diferentes. Por outro lado, é uma caixa-preta (não dá para explicar por que algo deu match), pode confundir códigos quase idênticos (ORA-00942 vs ORA-00943) e usa mais memória. A quantização reduz a memória comprimindo os números, por exemplo para 8 bits ou para binário.

#### 8.2 Esparso aprendido (SPLADE, ELSER)

O esparso aprendido fica entre os dois. Um modelo expande o texto com termos relacionados e seus pesos, e a busca roda sobre um índice invertido, como no BM25:

```
"cheap laptop" → { laptop: 2.1, notebook: 1.8, computer: 1.2, cheap: 1.9, budget: 1.5, price: 0.9 }
```

É mais fácil de explicar do que os vetores densos e ainda encontra sinônimos. O problema é que depende do idioma do modelo (o ELSER é recomendado só para inglês) e tem limite de tokens (o ELSER codifica os primeiros 512 tokens de cada campo).

#### 8.3 Qual vence

| Consulta | BM25 | Denso | Esparso aprendido |
|----|----|----|----|
| *"notebook barato"* → doc com *"laptop econômico"* | Não | Sim | Sim |
| *"erro ORA-00942"* → doc com esse código | Sim | Pouco confiável | Sim |
| *"posso trabalhar de casa?"* → doc com *"trabalho remoto"* | Não | Sim | Sim, se o idioma tiver suporte |
| Explicar por que deu match | Sim | Não | Em parte |
| Custo | Mínimo | Modelo + memória | Modelo |

Nenhum deles vence sempre, e é por isso que se combinam.

### 9. Busca híbrida e RRF


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 400" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rrf-fusion-title rrf-fusion-desc">
<title id="rrf-fusion-title">Busca híbrida: duas buscas, uma fusão RRF e um reranker</title>
<desc id="rrf-fusion-desc">A pergunta é buscada em paralelo com BM25 e com vetores; o RRF funde os top 50 de cada lista pela posição, um reranker os reordena e os 5 melhores chunks chegam ao modelo.</desc>
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
<text x="560" y="188" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">FUNDE</text>
<rect x="744" y="180" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="768" y="188" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">REORDENA</text>
<text x="928" y="64" fill="#2d3142" font-size="14" font-style="italic" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">O RRF usa só as posições:</text>
<text x="928" y="84" fill="#2d3142" font-size="14" font-style="italic" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">premia a concordância entre as duas listas.</text>
<path d="M 628,88 Q 520,100 480,160" fill="none" stroke="rgba(0,0,0,0.40)" stroke-width="1" stroke-dasharray="4,3"/>
<circle cx="480" cy="160" r="2" fill="#2d3142"/>
<rect x="32" y="168" width="96" height="64" rx="6" fill="#ffffff"/>
<rect x="32" y="168" width="96" height="64" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="80" y="204" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Pergunta</text>
<rect x="168" y="88" width="152" height="64" rx="6" fill="#ffffff"/>
<rect x="168" y="88" width="152" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="244" y="112" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">BM25</text>
<text x="244" y="128" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">termos exatos</text>
<text x="244" y="140" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">índice invertido</text>
<rect x="168" y="248" width="152" height="64" rx="6" fill="#ffffff"/>
<rect x="168" y="248" width="152" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="244" y="272" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Vetorial</text>
<text x="244" y="288" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">sentido</text>
<text x="244" y="300" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">HNSW</text>
<rect x="384" y="168" width="144" height="64" rx="6" fill="#ffffff"/>
<rect x="384" y="168" width="144" height="64" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="456" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">RRF</text>
<text x="456" y="212" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">1/(60 + rank)</text>
<rect x="592" y="168" width="144" height="64" rx="6" fill="#ffffff"/>
<rect x="592" y="168" width="144" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="664" y="192" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Reranker</text>
<text x="664" y="208" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">lê pergunta +</text>
<text x="664" y="220" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">chunk</text>
<rect x="800" y="168" width="128" height="64" rx="6" fill="#ffffff"/>
<rect x="800" y="168" width="128" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="864" y="204" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Top 5 ao modelo</text>
<line x1="32" y1="352" x2="928" y2="352" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="32" y="372" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGENDA</text>
<rect x="120" y="364" width="16" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="144" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Entrada</text>
<rect x="296" y="364" width="16" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="320" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Etapa de busca</text>
<rect x="472" y="364" width="16" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="496" y="372" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Fusão</text>
</svg></div><figcaption>Figura · Busca híbrida: duas buscas, uma fusão RRF e um reranker</figcaption></figure>


#### 9.1 O problema

As duas buscas devolvem pontuações em escalas incompatíveis:

| Posição | BM25 <span style="font-weight:400">(sem limite superior)</span> | Vetorial <span style="font-weight:400">(cosseno 0.33–1 no Azure)</span> |
|----|----|----|
| 1 | doc_B → 12.4 | doc_A → 0.89 |
| 2 | doc_A → 9.1 | doc_C → 0.87 |
| 3 | doc_D → 3.2 | doc_B → 0.81 |

Somar 12.4 + 0.81 faz tanto sentido quanto somar euros e quilos.

#### 9.2 A solução: RRF (Reciprocal Rank Fusion)

O RRF ignora as pontuações e usa só a posição de cada documento em cada lista:

```
RRF(doc) = Σ  1 / (k + position of doc in that list)      with k = 60 typically
       over each list
```

Vamos usar os mesmos rankings de antes:

| Posição  | BM25  | Vetorial |
|----------|-------|----------|
| 1        | doc_B | doc_A    |
| 2        | doc_A | doc_C    |
| 3        | doc_D | doc_B    |

| Doc   | Contribuição BM25 | Contribuição vetorial | Total   | Final |
|-------|-------------------|-----------------------|---------|-------|
| doc_A | 1/62 = 0.01613    | 1/61 = 0.01639        | 0.03252 | 1     |
| doc_B | 1/61 = 0.01639    | 1/63 = 0.01587        | 0.03226 | 2     |
| doc_C | 0                 | 1/62 = 0.01613        | 0.01613 | 3     |
| doc_D | 1/63 = 0.01587    | 0                     | 0.01587 | 4     |


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 500" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rrf-scores-title rrf-scores-desc">
      <title id="rrf-scores-title">Exemplo de RRF com k = 60: pontuação por documento</title>
      <desc id="rrf-scores-desc">Pontuação RRF final de quatro documentos: doc_A 0.03252 e doc_B 0.03226 aparecem nas duas listas e ficam bem à frente de doc_C 0.01613, só vetorial, e doc_D 0.01587, só BM25.</desc>
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
      <text x="480" y="376" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.14em">SCORE RRF = Σ 1/(60 + POSIÇÃO)</text>
      <text x="148" y="104" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_A</text>
      <rect x="160" y="80" width="520" height="40" fill="#ffffff"/>
      <rect x="160" y="80" width="520" height="40" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="688" y="104" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.03252</text>
      <text x="756" y="104" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">alto nas duas listas</text>
      <text x="148" y="168" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_B</text>
      <rect x="160" y="144" width="516" height="40" fill="#ffffff"/>
      <rect x="160" y="144" width="516" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="684" y="168" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.03226</text>
      <text x="148" y="232" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_C</text>
      <rect x="160" y="208" width="260" height="40" fill="#ffffff"/>
      <rect x="160" y="208" width="260" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="428" y="232" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.01613</text>
      <text x="496" y="232" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">só vetorial</text>
      <text x="148" y="296" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">doc_D</text>
      <rect x="160" y="272" width="252" height="40" fill="#ffffff"/>
      <rect x="160" y="272" width="252" height="40" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="420" y="296" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace">0.01587</text>
      <text x="488" y="296" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-style="italic">só BM25</text>
      <text x="40" y="412" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">Posições, BM25: B, A, D · Vetorial: A, C, B</text>
      <line x1="40" y1="436" x2="920" y2="436" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="468" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGENDA</text>
      <rect x="120" y="456" width="16" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="144" y="468" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Vence: consenso entre listas</text>
      <rect x="400" y="456" width="16" height="16" rx="4" fill="rgba(79,93,117,0.15)" stroke="#4f5d75" stroke-width="1"/>
      <text x="424" y="468" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Outros documentos</text>
    </svg></div><figcaption>Figura · Exemplo de RRF com k = 60: pontuação por documento</figcaption></figure>


O doc_A vence porque aparece bem colocado nas duas listas. O RRF premia a concordância entre os dois métodos.

#### 9.3 Por que k = 60?

|  | Posição 1 | Posição 2 | Diferença |
|----|----|----|----|
| k = 0 | 1.000 | 0.500 | o dobro: ser 1º em uma única lista domina |
| k = 60 | 0.0164 | 0.0161 | quase igual: o que conta é ficar bem em várias listas |

O valor vem do artigo original (Cormack, Clarke e Büttcher, SIGIR 2009), onde foi escolhido empiricamente, e o Azure AI Search documenta que ele funciona melhor com valores pequenos, como 60.

#### 9.4 Vantagens, limites e variantes

O RRF não precisa de calibração de escala nem de treino, e aceita N listas (BM25, vários vetores, várias reformulações da pergunta). Ele tem dois pontos fracos. Ignora a magnitude, então ser primeiro "com folga" vale o mesmo que ser primeiro "por um fio". E uma lista ruim conta do mesmo jeito: se a busca vetorial devolve lixo, esse lixo também ganha pontos.

Há duas variantes comuns:

- O RRF ponderado dá mais peso a uma das listas (por exemplo, a lista vetorial ×2). Está disponível no Azure (*vector weighting*), no `EnsembleRetriever` do LangChain † e no Google Vector Search com `rrf_ranking_alpha`.
- A combinação linear normaliza as pontuações e as soma com pesos. Ela aproveita a magnitude, mas você precisa calibrá-la com dados. Exemplos são o retriever `linear` do Elasticsearch e o DBSF no Qdrant †.

Tenha em mente que **o RRF não é um reranker.** Ele só funde listas, e o reranker vem depois.

### 10. Estratégias avançadas de recuperação

| Técnica | O que faz | Evidência principal |
|----|----|----|
| Reescrita com histórico | Transforma *"e quantos dias?"* em uma pergunta completa usando a conversa anterior | Prática padrão |
| HyDE | Um modelo escreve uma resposta hipotética e a busca é feita com ela | Compete com retrievers treinados, sem precisar de rótulos (Gao et al., 2022) |
| Multi-query / RAG-Fusion | Várias reformulações da pergunta, fundidas com RRF | Mais cobertura; risco de fugir do assunto |
| Step-back | Primeiro pergunta algo mais geral | +27% no TimeQA, +7% no MuSiQue (Google DeepMind) |
| Decomposição | Divide uma pergunta complexa em subperguntas | Base da busca agêntica |
| RAPTOR / parent document | Resumos hierárquicos; busca pelo chunk pequeno e devolve o grande | RAPTOR + GPT-4: +20% absoluto no QuALITY |
| GraphRAG | Grafo de entidades + resumos por comunidade | Melhora as perguntas globais ("quais temas se repetem?"). O LazyGraphRAG indexa a 0.1% do custo e faz consultas \>700× mais baratas. Nem sempre vence: em buscas específicas, o RAG clássico costuma empatar com ele ou superá-lo (Han et al., 2025/26; HippoRAG 2) |
| Adaptativo (Self-RAG, Corrective RAG, Adaptive-RAG) | Decide quando buscar e quanto, e corrige se a busca foi ruim | O Adaptive-RAG roteia conforme a complexidade da pergunta |
| Agêntico / "Deep Research" | Busca iterativa treinada com aprendizado por reforço | Search-R1: +41% (7B) sobre o RAG de base; o OpenAI Deep Research leva de 5 a 30 minutos por tarefa |
| Contexto longo vs RAG | Colocar tudo no prompt? | Os modelos se saem pior quando a informação está no meio do contexto ("Lost in the Middle"); recuperar demais piora a resposta; o eficiente é rotear cada consulta (Self-Route), e nenhuma opção vence sempre (LaRA) |

### 11. Estudo de caso: Elasticsearch

O Elasticsearch tem quatro peças "semânticas" diferentes, e é fácil confundi-las:


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:670px" viewBox="0 0 1000 360"  xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="rag-es-title rag-es-desc">
  <title id="rag-es-title">Elasticsearch: três abordagens de recuperação sobre um tipo de campo</title>
  <desc id="rag-es-desc">Três abordagens lado a lado no Elasticsearch, A vetores densos kNN, B esparso aprendido com ELSER e C reranking semântico, ficam acima de um tipo de campo compartilhado, D semantic_text, que faz o chunking do texto, gera embeddings automaticamente e alimenta as abordagens densa e de reranking semântico.</desc>
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
  <text x="500" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Esparso aprendido</text>
  <text x="500" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">ELSER · campo sparse_vector</text>
  <text x="500" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">expande termos, não sinônimos</text>
  <!-- C. Semantic reranking -->
  <rect x="680" y="72" width="280" height="108" rx="6" fill="#ffffff"/>
  <rect x="680" y="72" width="280" height="108" rx="6" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <rect x="692" y="84" width="20" height="12" rx="2" fill="none" stroke="rgba(0,61,165,0.4)" stroke-width="0.8"/>
  <text x="702" y="93" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">C</text>
  <text x="820" y="122" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">Reranking semântico</text>
  <text x="820" y="142" font-family="Meslo, Menlo, monospace" font-size="9" fill="#003da5" text-anchor="middle">text_similarity_reranker</text>
  <text x="820" y="158" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">/ RERANK no ES|QL</text>
  <!-- D. semantic_text (highlighted, underpins A and C) -->
  <rect x="40" y="244" width="920" height="72" rx="6" fill="#ffffff"/>
  <rect x="40" y="244" width="920" height="72" rx="6" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <rect x="52" y="256" width="20" height="12" rx="2" fill="none" stroke="#fedb00" stroke-width="1"/>
  <text x="62" y="265" font-family="Meslo, Menlo, monospace" font-size="7" fill="#003da5" text-anchor="middle">D</text>
  <text x="500" y="278" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="13" font-weight="600" fill="#000000" text-anchor="middle">tipo de campo semantic_text</text>
  <text x="500" y="298" font-family="Meslo, Menlo, monospace" font-size="9" fill="#4d6fa8" text-anchor="middle">faz o chunking do texto e gera embeddings automaticamente, o padrão de pouco esforço que alimenta A e C</text>
  <!-- legend -->
  <line x1="40" y1="336" x2="960" y2="336" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
  <text x="40" y="352" font-family="Meslo, Menlo, monospace" font-size="8" fill="#003da5" letter-spacing="0.14em">LEGENDA</text>
  <rect x="112" y="344" width="12" height="12" rx="2" fill="#ffffff" stroke="#000000" stroke-width="1"/>
  <text x="130" y="353" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Abordagem de busca</text>
  <rect x="300" y="344" width="12" height="12" rx="2" fill="rgba(254,219,0,0.14)" stroke="#fedb00" stroke-width="1.4"/>
  <text x="318" y="353" font-family="Meslo, Menlo, monospace" font-size="8" fill="#4d6fa8">Tipo de campo comum que as alimenta</text>
</svg></div><figcaption>Elasticsearch: três abordagens de recuperação (A·B·C) sobre o campo compartilhado semantic_text (D)</figcaption></figure>


- A. Denso: `dense_vector` + consulta `knn`, com quantização int8, int4 e BBQ. Você pode usar E5 (multilíngue), Jina (pelo Elastic Inference Service) ou modelos externos (OpenAI, Azure OpenAI, Cohere, Bedrock, Vertex AI, Hugging Face).
- B. O ELSER expande termos. O que ele acrescenta são associações aprendidas, não sinônimos. No benchmark BEIR feito pela própria Elastic, ele melhora o nDCG@10 em relação ao BM25 em 18% na média (10 vitórias, 1 empate, 1 derrota). É recomendado para inglês, lê 512 tokens por campo e exige assinatura paga.
- C. Reranker: o retriever `text_similarity_reranker` ou o comando `RERANK` no ES\|QL.
- D. `semantic_text` (GA desde a versão 9.0). Se você não fixar o `inference_id`, índices novos podem passar a usar outro modelo depois de uma atualização de versão, então **fixe sempre o modelo em produção**.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 520" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="elastic-retrievers-title elastic-retrievers-desc">
      <title id="elastic-retrievers-title">Elasticsearch: árvore de retrievers para busca híbrida com reranker</title>
      <desc id="elastic-retrievers-desc">Três níveis aninhados: o retriever externo text_similarity_reranker reordena os top 50 com um modelo de rerank; dentro dele, o rrf funde dois retrievers standard: match com BM25 sobre content e semantic sobre um campo semantic_text.</desc>
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
      <text x="72" y="108" fill="#2d3142" font-size="12" font-weight="500" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">reordena os top 50 com um modelo de rerank · <tspan font-family="Meslo, Menlo, monospace" font-size="12" font-weight="400" fill="#4f5d75">inference_id</tspan></text>
      <rect x="72" y="136" width="816" height="272" rx="8" fill="#ffffff" stroke="#4f5d75" stroke-width="1"/>
      <rect x="88" y="128" width="64" height="16" rx="2" fill="#ffffff"/>
      <text x="96" y="140" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">FUSÃO</text>
      <text x="104" y="176" fill="#2d3142" font-size="16" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="start">rrf</text>
      <text x="104" y="196" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="start">rank_window_size 50 · rank_constant 60</text>
      <rect x="104" y="228" width="360" height="148" rx="8" fill="rgba(0,0,0,0.02)" stroke="#2d3142" stroke-width="1"/>
      <rect x="120" y="220" width="120" height="16" rx="2" fill="#ffffff"/>
      <text x="128" y="232" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">RETRIEVER FOLHA</text>
      <text x="284" y="276" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="middle">standard · match</text>
      <text x="284" y="308" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">BM25</text>
      <text x="284" y="332" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">no campo content</text>
      <rect x="496" y="228" width="360" height="148" rx="8" fill="rgba(0,0,0,0.02)" stroke="#2d3142" stroke-width="1"/>
      <rect x="512" y="220" width="120" height="16" rx="2" fill="#ffffff"/>
      <text x="520" y="232" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">RETRIEVER FOLHA</text>
      <text x="676" y="276" fill="#2d3142" font-size="12" font-weight="600" font-family="Meslo, Menlo, monospace" text-anchor="middle">standard · semantic</text>
      <text x="676" y="308" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Denso ou ELSER</text>
      <text x="676" y="332" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">campo semantic_text</text>
      <text x="40" y="484" fill="#7a8399" font-size="14" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start" font-style="italic">Alternativa ao <tspan font-family="Meslo, Menlo, monospace" font-style="normal" font-size="12">rrf</tspan>: retriever <tspan font-family="Meslo, Menlo, monospace" font-style="normal" font-size="12">linear</tspan> (minmax / l2_norm)</text>
    </svg></div><figcaption>Figura · Elasticsearch: árvore de retrievers para busca híbrida com reranker</figcaption></figure>


Esta é a busca híbrida com reranker em uma única chamada:

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

Você também pode fundir com o retriever `linear` (normalizadores `minmax` ou `l2_norm`) ou, no ES\|QL, com `FORK` + `FUSE` (RRF ou LINEAR) + `RERANK`. No formato multi-field, a Elastic normaliza os campos léxicos e semânticos para que cada grupo contribua com 50%.

Atenção ao vocabulário. No Elastic, *"semantic search"* significa buscar com embeddings; no Azure, o *"semantic ranker"* é um reranker.

## Parte IV · Reranking

### 12. Reranking

#### 12.1 O que é

Um **reranker** pega os ~50–150 candidatos da busca e os reordena lendo a pergunta e cada chunk juntos. Isso é mais preciso do que comparar vetores, porém mais lento, então você só o aplica a poucos candidatos.


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 464" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="bi-vs-cross-encoder-title bi-vs-cross-encoder-desc">
<title id="bi-vs-cross-encoder-title">Embeddings (bi-encoder) vs. reranker (cross-encoder)</title>
<desc id="bi-vs-cross-encoder-desc">O bi-encoder transforma a pergunta e o chunk em vetores separadamente e compara a distância entre eles, o que é rápido para milhões de chunks; o cross-encoder lê pergunta e chunk juntos e dá uma nota de relevância precisa para 50–150 candidatos.</desc>
<defs>
<marker id="bi-vs-cross-encoder-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="bi-vs-cross-encoder-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="bi-vs-cross-encoder-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="32" y="56" width="896" height="176" rx="8" fill="#f3f4f6" stroke="rgba(0,0,0,0.12)" stroke-width="1"/>
<text x="48" y="76" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">BI-ENCODER · BUSCA</text>
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
<text x="544" y="316" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">NOTAS</text>
<rect x="64" y="96" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="96" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="136" y="124" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Pergunta</text>
<rect x="64" y="168" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="168" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="136" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Chunk</text>
<rect x="272" y="96" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="272" y="96" width="176" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="360" y="124" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Vetor da pergunta</text>
<rect x="272" y="168" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="272" y="168" width="176" height="48" rx="6" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="360" y="188" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Vetor do chunk</text>
<text x="360" y="204" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">pré-calculado</text>
<rect x="512" y="132" width="144" height="48" rx="6" fill="#ffffff"/>
<rect x="512" y="132" width="144" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="584" y="152" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Distância</text>
<text x="584" y="168" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">entre vetores</text>
<rect x="64" y="304" width="208" height="48" rx="6" fill="#ffffff"/>
<rect x="64" y="304" width="208" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="168" y="324" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Pergunta + chunk</text>
<text x="168" y="340" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">juntos</text>
<rect x="336" y="304" width="176" height="48" rx="6" fill="#ffffff"/>
<rect x="336" y="304" width="176" height="48" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
<text x="424" y="324" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Modelo reranker</text>
<text x="424" y="340" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">cross-encoder</text>
<rect x="576" y="304" width="160" height="48" rx="6" fill="#ffffff"/>
<rect x="576" y="304" width="160" height="48" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="656" y="332" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Nota de relevância</text>
<text x="704" y="132" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Rápido</text>
<text x="704" y="148" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Pré-calculável</text>
<text x="704" y="164" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Milhões de chunks</text>
<text x="768" y="308" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Preciso</text>
<text x="768" y="324" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Calculado por par</text>
<text x="768" y="340" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Só 50–150 candidatos</text>
<line x1="32" y1="412" x2="928" y2="412" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="32" y="432" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGENDA</text>
<rect x="120" y="424" width="16" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="144" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Entrada</text>
<rect x="296" y="424" width="16" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="320" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Cálculo</text>
<rect x="472" y="424" width="16" height="12" rx="2" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="496" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Pré-calculado</text>
<rect x="648" y="424" width="16" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="672" y="432" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">Reranker</text>
</svg></div><figcaption>Figura · Embeddings (bi-encoder) vs. reranker (cross-encoder)</figcaption></figure>


A arquitetura típica tem dois estágios: busca híbrida (que prioriza a cobertura), depois um reranker sobre 100–150 candidatos e, por fim, de 10 a 20 chunks entregues ao modelo que escreve a resposta.

#### 12.2 Tipos

| Tipo | Exemplos | Nota |
|----|----|----|
| Cross-encoder clássico | monoBERT, bge-reranker-v2-m3 | monoBERT: +27% em MRR@10 no MS MARCO (2019) |
| Modelo de linguagem como reranker | RankGPT, RankZephyr (open source), Setwise | O RankZephyr empata com o GPT-4 ou o supera |
| Reranker com raciocínio (2025–26) | Rank1, Rank-R1, ReasonRank | No BRIGHT (busca que exige raciocínio), o melhor modelo do MTEB cai de 59.0 para 18.3; raciocinar sobre a pergunta acrescenta até +12.2 |
| Late interaction | ColBERT | Meio-termo: ~100× mais rápido que um reranker BERT |

#### 12.3 Modelos de destaque (verificados)

| Modelo | Organização / data | Licença | Dado |
|----|----|----|----|
| Rerank 4 Pro / Fast | Cohere, dez. 2025 | Serviço pago | \#2 no leaderboard independente da Agentset (1627 pontos Elo contra ~1457 da v3.5) |
| zerank-2 | ZeroEntropy | Pesos abertos | \#1 na Agentset |
| rerank-2.5 | Voyage (MongoDB), ago. 2025 | Serviço pago | Contexto de 32K, segue instruções |
| Qwen3-Reranker 0.6/4/8B | Alibaba, jun. 2025 | Apache 2.0 | 69.76 no MTEB-R (4B) contra 57.03 do bge-v2-m3 |
| jina-reranker-v3.5 | Jina, jul. 2026 | Não comercial | 63.20 no BEIR com 0.6B de parâmetros |
| mxbai-rerank-large-v2 | Mixedbread, mar. 2025 | Apache 2.0 | 57.49 no BEIR |
| Semantic ranker | Microsoft (Azure AI Search) | Serviço gerenciado | Reordena os top 50, nota de 0 a 4 |
| Ranking API | Google | Serviço gerenciado | Até 1000 chunks por chamada, nota de 0 a 1 |

#### 12.4 Regras práticas

Um reranker é a melhoria mais barata e mais comprovada que você pode fazer. Nos números da Anthropic, só o acréscimo do reranker leva a taxa de falha de 2.9% para 1.9%.

Mas **o reranker só reordena o que a busca encontrou.** Se o documento correto não está entre os candidatos, ele não tem como salvar você, e é por isso que primeiro se mede a cobertura da recuperação (recall).

O que hoje diferencia os rerankers é a capacidade de seguir instruções: você pode passar regras de negócio como "priorize conteúdo recente". Todo fornecedor diz que é o melhor, então meça com os seus dados.

Alguns complementos valem a pena. O MMR remove chunks redundantes. A compressão com LongLLMLingua dá +21.4% de qualidade com ~4× menos tokens. E a posição no prompt importa: coloque o conteúdo mais relevante no começo ou no fim ("Lost in the Middle").

## Parte V · Geração e guardrails

### 13. Geração com citações e guardrails

O prompt fica assim:

```
System:   Answer ONLY from the context. Cite every claim as [n].
          If the context does not contain the answer, say "I don't know".
Context:  [1] Remote Work Policy §3.2 Spain, p. 4: "Manager: 2 days/week..."
          [2] 2026 Annex, p. 1: "...starting January 2026, 3 days for..."
Question: remote work days for a manager in Spain
```

Os guardrails atuam antes, durante e depois da geração:

1.  Antes, detectar tentativas de manipular o modelo ("jailbreak" ou prompt injection).
2.  Durante, se o reranker não deixar nenhum chunk acima do limiar, responder "Não encontrei essa informação" em vez de inventar algo.
3.  Depois, verificar se cada frase da resposta é sustentada pelos chunks. Se a verificação falhar, gerar de novo ou responder com cautela.

## Parte VI · Avaliação

### 14. Dois testes separados


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 580" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="eval-cuadrante-title eval-cuadrante-desc">
      <title id="eval-cuadrante-title">Dois testes: recuperou bem? respondeu bem?</title>
      <desc id="eval-cuadrante-desc">Matriz 2×2 que cruza se a recuperação encontrou os documentos certos com se a resposta foi boa e indica a ação para cada caso; quando as duas falham, a prioridade é corrigir primeiro a recuperação.</desc>
      <defs>
        <marker id="eval-cuadrante-axis-end" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0 0, 8 4, 0 8" fill="#2d3142"/></marker>
        <marker id="eval-cuadrante-axis-start" markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto"><polygon points="8 0, 0 4, 8 8" fill="#2d3142"/></marker>
      </defs>
      <rect width="100%" height="100%" fill="#ffffff"/>
      <rect x="120" y="276" width="360" height="204" fill="rgba(235,108,54,0.04)"/>
      <rect x="160" y="96" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="176" y="120" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">01 · RECUPERAÇÃO NÃO / RESPOSTA SIM</text>
      <text x="176" y="152" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Sorte</text>
      <text x="176" y="200" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">O modelo sabia de memória.</text>
      <text x="176" y="216" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Perigoso.</text>
      <rect x="520" y="96" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="536" y="120" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">02 · RECUPERAÇÃO SIM / RESPOSTA SIM</text>
      <text x="536" y="152" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Tudo certo</text>
      <text x="536" y="200" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Mantenha e monitore.</text>
      <rect x="160" y="296" width="280" height="160" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="176" y="320" fill="#4f5d75" font-size="8" font-weight="600" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">03 · RECUPERAÇÃO NÃO / RESPOSTA NÃO</text>
      <text x="176" y="352" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Corrija primeiro</text>
      <text x="176" y="372" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">a recuperação</text>
      <text x="176" y="408" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Chunking, híbrida, reranker,</text>
      <text x="176" y="424" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">número de resultados.</text>
      <rect x="520" y="296" width="280" height="160" rx="6" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="536" y="320" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">04 · RECUPERAÇÃO SIM / RESPOSTA NÃO</text>
      <text x="536" y="352" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Corrija o prompt</text>
      <text x="536" y="372" fill="#2d3142" font-size="16" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">ou o modelo</text>
      <text x="536" y="408" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Alucina ou ignora o contexto.</text>
      <line x1="128" y1="276" x2="832" y2="276" stroke="#2d3142" stroke-width="1.2" marker-start="url(#eval-cuadrante-axis-start)" marker-end="url(#eval-cuadrante-axis-end)"/>
      <line x1="480" y1="72" x2="480" y2="480" stroke="#2d3142" stroke-width="1.2" marker-start="url(#eval-cuadrante-axis-start)" marker-end="url(#eval-cuadrante-axis-end)"/>
      <text x="480" y="60" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">SIM</text>
      <text x="496" y="64" fill="#4f5d75" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Resposta: respondeu bem?</text>
      <text x="480" y="500" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">NÃO</text>
      <text x="116" y="280" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="end" letter-spacing="0.18em">NÃO</text>
      <text x="844" y="280" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.18em">SIM</text>
      <text x="832" y="504" fill="#4f5d75" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="end">Recuperação: achou os documentos certos?</text>
      <line x1="40" y1="528" x2="920" y2="528" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="556" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGENDA</text>
      <rect x="120" y="544" width="16" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="144" y="556" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Prioridade: comece aqui</text>
      <rect x="360" y="544" width="16" height="16" rx="4" fill="rgba(0,0,0,0.04)" stroke="rgba(79,93,117,0.28)" stroke-width="1"/>
      <text x="384" y="556" fill="#4f5d75" font-size="12" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">Outros casos</text>
    </svg></div><figcaption>Figura · Dois testes: recuperou bem? respondeu bem?</figcaption></figure>


Se você olha só a resposta final, não sabe o que corrigir. A Microsoft chama a avaliação da etapa de recuperação de *process evaluation* e a avaliação da resposta de *system evaluation*.

### 15. O golden dataset (o "gabarito")

O golden dataset é um conjunto de 100 a 300 perguntas, cada uma com a sua resposta correta e os documentos que deveriam aparecer:

``` json
{"query": "Remote work days, manager, Spain?",
 "ground_truth": "2 days per week; 3 from January 2026 according to the annex",
 "relevant_docs": [{"document_id": "teletrabajo_p4", "query_relevance_label": 4},
                   {"document_id": "anexo2026_p1",  "query_relevance_label": 3}]}
```

| De onde vêm as perguntas | Por quê |
|----|----|
| Logs de perguntas reais | É o que as pessoas de fato perguntam |
| Especialistas do negócio (RH, jurídico) | Casos difíceis e armadilhas |
| Geração sintética (RAGAS, simuladores dos provedores de nuvem) | Cobertura rápida, mas sempre com revisão humana |
| Perguntas sem resposta nos documentos | Verificam se o sistema diz "não sei" em vez de inventar |

### 16. Métricas de recuperação, com números

Digamos que, para uma pergunta, os documentos corretos sejam A e C, e o buscador tenha devolvido `[B, A, D, C, E]`.

| Posição      | 1   | 2   | 3   | 4   | 5   |
|--------------|-----|-----|-----|-----|-----|
| Devolvido    | B   | A   | D   | C   | E   |
| Correto?     | ✗   | ✓   | ✗   | ✓   | ✗   |

| Métrica | Pergunta que responde | Cálculo | Valor |
|----|----|----|----|
| Recall@3 (cobertura) | Quantos dos corretos aparecem no top 3? | 1 de 2 | 0.50 |
| Recall@5 | E no top 5? | 2 de 2 | 1.00 |
| Precision@5 (precisão) | Do que eu trouxe, quanto é útil? | 2 de 5 | 0.40 |
| MRR (posição do primeiro acerto) | Em que altura está o primeiro correto? | 1/2 | 0.50 |
| nDCG@5 (qualidade do ranking) | Os corretos estão o mais acima possível? | Real = 1/log₂3 + 1/log₂5 = 1.06; ideal = 1 + 1/log₂3 = 1.63 | 0.65 |

Esses números dizem onde olhar. Se o Recall@50 está baixo, o problema está na recuperação (chunking, embeddings, falta de BM25), e o reranker não vai resolver. Se o Recall@50 está alto mas o nDCG@5 está baixo, o problema está no reranker.

### 17. Métricas de resposta, com números

Suponha que o sistema responda: *"Você tem 2 dias por semana \[1\], 3 a partir de janeiro de 2026 \[2\], e pode escolher as sextas-feiras."*

| Afirmação na resposta      | Sustentada pelos chunks? |
|----------------------------|--------------------------|
| `"2 days/week"`            | ✓                        |
| `"3 from January 2026"`    | ✓                        |
| `"you can choose Fridays"` | ✗ (inventada)            |

| Métrica | Pergunta | Resultado |
|----|----|----|
| Groundedness / Faithfulness (o lado da *precisão*) | Tudo o que disse está nos chunks? | 2/3 = 0.67 ✗ alucinação |
| Completeness / Answer correctness (o lado da *cobertura*) | Disse tudo o que a resposta correta diz? | 2/2 = 1.0 ✓ |
| Relevância | Responde ao que foi perguntado? | ✓ |
| Citações corretas | Cada \[n\] sustenta a sua frase? | ✓ |

A Microsoft enquadra da mesma forma: a fidelidade ao contexto é o lado da precisão (não acrescentar nada) e a completude é o lado da cobertura (não omitir nada crítico).

Outra opção é a avaliação por "nuggets" (TREC 2024): você define os fatos atômicos que uma boa resposta precisa conter e conta quantos aparecem.

### 18. O LLM como juiz

Ninguém revisa 10,000 respostas à mão, então outro modelo faz o papel de professor. Esse juiz tem vieses conhecidos. Prefere a primeira opção que vê (posição), prefere respostas longas (verbosidade) e prefere textos da própria família de modelos (autopreferência).

Para montar um juiz em que dê para confiar:

1.  Um humano rotula 50–100 casos.
2.  Meça a concordância juiz–humano (kappa de Cohen, acurácia, F1).
3.  O juiz deve ser de uma família de modelos diferente da do gerador.
4.  O juiz deve explicar a sua nota.
5.  Pontuar afirmação por afirmação (RAGChecker) ou por nuggets é melhor do que dar uma única nota geral.

Até onde dá para confiar nele? O GPT-4 como juiz chega a mais de 80% de concordância com humanos, o mesmo nível observado entre dois humanos (Zheng et al., 2023). No TREC 2024, a concordância perfeita entre humano e GPT-4o foi de 56%, e de 72% quando o humano corrigia o rótulo do modelo. Ou seja, o juiz LLM é confiável para comparar sistemas e menos confiável pergunta a pergunta. O ARES combina algumas centenas de rótulos humanos com o juiz automático para produzir intervalos de confiança estatisticamente válidos.

### 19. Avaliação antes do deploy e em produção


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 664" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="eval-bucle-title eval-bucle-desc">
      <title id="eval-bucle-title">O ciclo de avaliação contínua</title>
      <desc id="eval-bucle-desc">Ciclo de seis passos em sentido horário: golden dataset, avaliação offline, quality gate, deploy, avaliação contínua e falhas reais com votos negativos, que realimentam o golden dataset; no centro, as métricas de recuperação e de resposta.</desc>
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
      <text x="324" y="380" fill="#7a8399" font-size="8" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">AMOSTRAS</text>
      <!-- hub -->
      <rect x="356" y="264" width="248" height="104" rx="8" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
      <text x="480" y="292" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.18em">NÚCLEO COMUM</text>
      <text x="480" y="320" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Métricas de busca +</text>
      <text x="480" y="340" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">de resposta</text>
      <rect x="380" y="40" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="380" y="40" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="480" y="68" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Golden dataset</text>
      <text x="480" y="80" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">100–300 perguntas + respostas</text>
      <text x="480" y="92" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">+ documentos</text>
      <rect x="588" y="160" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="588" y="160" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="688" y="196" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Avaliação offline</text>
      <text x="688" y="208" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">recall@k · nDCG · faithfulness</text>
      <rect x="588" y="400" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="588" y="400" width="200" height="72" rx="6" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="688" y="428" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Quality gate</text>
      <text x="688" y="440" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">integração contínua</text>
      <text x="688" y="452" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">bloqueia se regredir</text>
      <rect x="380" y="520" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="380" y="520" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="480" y="560" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Deploy</text>
      <rect x="172" y="400" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="172" y="400" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="272" y="428" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Avaliação contínua</text>
      <text x="272" y="440" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">amostra de tráfego real</text>
      <text x="272" y="452" fill="#4f5d75" font-size="9" font-weight="400" font-family="Meslo, Menlo, monospace" text-anchor="middle">sem gabarito</text>
      <rect x="172" y="160" width="200" height="72" rx="6" fill="#ffffff"/>
      <rect x="172" y="160" width="200" height="72" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
      <text x="272" y="192" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Falhas reais</text>
      <text x="272" y="208" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">e votos negativos</text>
      <line x1="40" y1="612" x2="920" y2="612" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
      <text x="40" y="632" fill="#4f5d75" font-size="8" font-weight="500" font-family="Meslo, Menlo, monospace" text-anchor="start" letter-spacing="0.14em">LEGENDA</text>
      <line x1="140" y1="628" x2="176" y2="628" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#eval-bucle-arrow)"/>
      <text x="184" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Etapa do ciclo</text>
      <line x1="328" y1="628" x2="364" y2="628" stroke="#4f5d75" stroke-width="1" stroke-dasharray="5,4" marker-end="url(#eval-bucle-arrow)"/>
      <text x="372" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Grava nas métricas</text>
      <rect x="580" y="620" width="24" height="16" rx="4" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1.2"/>
      <text x="612" y="632" fill="#2d3142" font-size="12" font-weight="400" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="start">Quality gate</text>
    </svg></div><figcaption>Figura · O ciclo de avaliação contínua</figcaption></figure>


Um quality gate na integração contínua poderia exigir que o Recall@10 não caia mais de 2 pontos, que a faithfulness fique ≥ 95% e que as respostas "não sei" corretas fiquem ≥ 90%. Esses limiares são só exemplos; quem define os reais é o negócio. Em produção, você amostra uma porcentagem do tráfego real e a avalia sem resposta de referência (faithfulness, relevância da resposta, relevância do contexto), junto com os votos positivos e negativos, a latência e o custo.

A Microsoft recomenda uma varredura de parâmetros (*parameter sweep*): testar combinações e medir qual vence. Os números abaixo são ilustrativos, não resultados reais:

| Configuração | Recall@10 | nDCG@5 | Faithfulness | Latência |
|----|----|----|----|----|
| só vetorial | 0.71 | 0.58 | 0.90 | 0.8 s |
| híbrida | 0.84 | 0.66 | 0.92 | 0.9 s |
| híbrida + rerank ← escolhida | 0.84 | 0.79 | 0.95 | 1.3 s |
| \+ agêntica <span style="font-weight:400">(só perguntas complexas)</span> | 0.88 | 0.81 | 0.95 | 3.5 s |

O DeepEval sugere no máximo umas 5 métricas por aplicação. MLflow / Databricks recomendam usar os mesmos avaliadores em desenvolvimento e em produção. E em produção você só pode usar métricas que não precisam de uma resposta correta.

### 20. Por que isso importa: alucinação em sistemas reais

| Estudo | Resultado |
|----|----|
| Stanford (2024): ferramentas jurídicas comerciais com RAG | Alucinam entre 17% e 33% das vezes |
| CRAG (Meta, 2024) | Modelo sozinho: ≤34% de acurácia; RAG simples: 44%; os melhores sistemas de RAG industriais só respondem sem alucinar em 63% das vezes |
| FinanceBench (2023) | O GPT-4-Turbo com recuperação errou ou se recusou a responder em 81% dos casos |
| ALCE (2023) | Mesmo os melhores modelos não sustentam totalmente as suas citações em 50% das vezes |
| Vectara (leaderboard de 2026-09-22, tarefa de resumo) | Taxas de alucinação entre 1.8% e 24.2% conforme o modelo (GPT-4o 9.6%, Gemini 2.5 Pro 7.0%, Claude Sonnet 4.5 12.0%) |
| FaithBench (2024) | Os melhores detectores de alucinação ficam em torno de 50% de acurácia nos casos difíceis |

Vários desses números são de 2023–2024 e vêm de modelos mais antigos, então cite-os sempre com o ano e o modelo.

## Parte VII · Um exemplo em produção no Azure

### 21. Copiloto de políticas internas, passo a passo

O caso é uma empresa com 20,000 funcionários, com documentos de RH, jurídico e compras no SharePoint e no Blob Storage. Ela precisa de permissões por usuário, citações em cada resposta e "não sei" quando não há informação.

#### 21.1 Arquitetura


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 608" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="azure-arquitectura-title azure-arquitectura-desc">
<title id="azure-arquitectura-title">Copiloto de políticas internas no Azure</title>
<desc id="azure-arquitectura-desc">Arquitetura no Azure de um copiloto de políticas: a ingestão leva documentos do SharePoint ou do Blob, por meio de um indexer com skillset, até o Azure AI Search; a app responde ao usuário com busca, Azure OpenAI e Content Safety; Application Insights e Foundry avaliam e observam.</desc>
<defs>
<marker id="azure-arquitectura-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#4f5d75"/></marker>
<marker id="azure-arquitectura-arrow-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#eb6c36"/></marker>
<marker id="azure-arquitectura-arrow-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#2e5aa8"/></marker>
</defs>
<rect width="100%" height="100%" fill="#ffffff"/>
<rect x="40" y="40" width="880" height="120" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="44" width="76" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="53" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">INGESTÃO</text>
<rect x="40" y="200" width="880" height="200" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="204" width="84" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="213" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">CONSULTA</text>
<rect x="40" y="424" width="880" height="120" rx="8" fill="rgba(0,0,0,0.02)" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<rect x="52" y="428" width="204" height="12" rx="2" fill="#ffffff"/>
<text x="56" y="437" fill="rgba(0,0,0,0.55)" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">AVALIAÇÃO E OBSERVABILIDADE</text>
<path d="M 296,104 H 368" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="300" y="84" width="64" height="12" rx="2" fill="#ffffff"/>
<text x="332" y="93" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">DOCUMENTOS</text>
<path d="M 592,104 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="604" y="84" width="48" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="93" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">INDEXA</text>
<path d="M 296,264 H 368" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="304" y="244" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="332" y="253" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">PERGUNTA</text>
<path d="M 592,264 H 664" fill="none" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<rect x="600" y="244" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="253" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">GERA</text>
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
<text x="440" y="345" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">TRACES</text>
<path d="M 592,488 H 664" fill="none" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<rect x="600" y="468" width="56" height="12" rx="2" fill="#ffffff"/>
<text x="628" y="477" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle" letter-spacing="0.06em">AMOSTRAS</text>
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
<text x="776" y="108" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">BM25 + vetor · RRF</text>
<text x="776" y="120" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">semantic ranker · allowed_groups</text>
<rect x="72" y="232" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="72" y="232" width="224" height="64" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="184" y="256" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Usuário</text>
<text x="184" y="272" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">login Entra ID</text>
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
<text x="776" y="356" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">detecção de manipulação †</text>
<text x="776" y="368" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">fidelidade (groundedness)</text>
<rect x="368" y="456" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="368" y="456" width="224" height="64" rx="6" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="480" y="480" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Application Insights</text>
<text x="480" y="496" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">traces OpenTelemetry</text>
<rect x="664" y="456" width="224" height="64" rx="6" fill="#ffffff"/>
<rect x="664" y="456" width="224" height="64" rx="6" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="776" y="476" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Avaliação no Foundry</text>
<text x="776" y="492" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">avaliadores</text>
<text x="776" y="504" fill="#4f5d75" font-size="9" font-family="Meslo, Menlo, monospace" text-anchor="middle">avaliação contínua</text>
<line x1="40" y1="568" x2="920" y2="568" stroke="rgba(0,0,0,0.10)" stroke-width="0.8"/>
<text x="40" y="588" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGENDA</text>
<rect x="112" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="112" y="580" width="20" height="12" rx="2" fill="rgba(235,108,54,0.14)" stroke="#eb6c36" stroke-width="1"/>
<text x="144" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">CHAVE</text>
<rect x="192" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="192" y="580" width="20" height="12" rx="2" fill="#ffffff" stroke="#2d3142" stroke-width="1"/>
<text x="224" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">SERVIÇO</text>
<rect x="292" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="292" y="580" width="20" height="12" rx="2" fill="rgba(0,0,0,0.03)" stroke="rgba(0,0,0,0.30)" stroke-width="1"/>
<text x="324" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">EXTERNO</text>
<rect x="388" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="388" y="580" width="20" height="12" rx="2" fill="rgba(0,0,0,0.05)" stroke="#4f5d75" stroke-width="1"/>
<text x="420" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">DADOS</text>
<rect x="484" y="580" width="20" height="12" rx="2" fill="#ffffff"/>
<rect x="484" y="580" width="20" height="12" rx="2" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
<text x="516" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">ENTRADA</text>
<line x1="580" y1="584" x2="604" y2="584" stroke="#4f5d75" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow)"/>
<text x="612" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">FLUXO</text>
<line x1="668" y1="584" x2="692" y2="584" stroke="#2e5aa8" stroke-width="1.2" marker-end="url(#azure-arquitectura-arrow-link)"/>
<text x="700" y="588" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.06em">CHAMADA AO MODELO</text>
</svg></div><figcaption>Figura · Copiloto de políticas internas no Azure</figcaption></figure>


Se você conhece a stack LangChain + Chroma/Qdrant, as peças se correspondem assim:

| Stack open source | No Azure |
|----|----|
| Loaders do LangChain + text splitter | Indexer + Document Layout skill + chunking |
| Chroma / Qdrant | Azure AI Search (vetores + BM25 + filtros em um único serviço) |
| Reranking com um modelo de linguagem | Semantic ranker (e, opcionalmente, um modelo de linguagem depois dele) |
| Sua própria reescrita de consultas | Query rewriting do semantic ranker (preview) ou agentic retrieval |
| GraphRAG | Microsoft GraphRAG como índice separado, só para perguntas globais |

#### 21.2 Uma pergunta, de ponta a ponta

Ana, gerente em Madri, perguntou sobre o contrato dela mais cedo na conversa. Agora ela digita *"e quantos dias posso trabalhar remotamente?"*


<figure class="diagram"><div class="diagram-scroll"><svg style="min-width:643px" viewBox="0 0 960 736" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="azure-secuencia-title azure-secuencia-desc">
      <title id="azure-secuencia-title">Uma pergunta de ponta a ponta: “e quantos dias posso trabalhar remotamente?”</title>
      <desc id="azure-secuencia-desc">Sequência em que a app reescreve a pergunta de Ana com o Azure OpenAI, recupera chunks com busca híbrida e o semantic ranker no Azure AI Search, gera uma resposta com citações e a verifica com o Content Safety antes de responder com citações ou “não sei”.</desc>
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
      <text x="204" y="124" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">pergunta + histórico</text>
      <line x1="300" y1="184" x2="476" y2="184" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="328" y="164" width="120" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="172" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">reescreve a pergunta</text>
      <line x1="476" y1="232" x2="300" y2="232" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="304" y="212" width="168" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="220" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">«dias remotos gerente Espanha»</text>
      <line x1="300" y1="280" x2="660" y2="280" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="304" y="260" width="168" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="268" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">busca híbrida + filtro de acesso</text>
      <path d="M668 324 H696 Q704 324 704 332 V356 Q704 364 696 364 H672" fill="none" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="712" y="324" width="96" height="44" rx="2" fill="#ffffff"/>
      <text x="716" y="336" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">RRF (k=60)</text>
      <text x="716" y="348" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">+ semantic ranker</text>
      <text x="716" y="360" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace">top 50 → nota 0–4</text>
      <line x1="660" y1="404" x2="300" y2="404" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="316" y="384" width="144" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="392" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">5–10 chunks com nota ≥ 2</text>
      <line x1="300" y1="452" x2="476" y2="452" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="320" y="432" width="136" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="440" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">gera com citações [n]</text>
      <line x1="476" y1="500" x2="300" y2="500" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="336" y="480" width="104" height="12" rx="2" fill="#ffffff"/>
      <text x="388" y="488" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">rascunho com citações</text>
      <line x1="300" y1="548" x2="844" y2="548" stroke="#eb6c36" stroke-width="1.2" marker-end="url(#azure-secuencia-arrow-accent)"/>
      <rect x="676" y="528" width="160" height="12" rx="2" fill="#ffffff"/>
      <text x="756" y="536" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">verifica fidelidade ao contexto</text>
      <line x1="844" y1="596" x2="300" y2="596" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="688" y="576" width="136" height="12" rx="2" fill="#ffffff"/>
      <text x="756" y="584" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">sustentado / não sustentado</text>
      <line x1="292" y1="644" x2="116" y2="644" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/>
      <rect x="124" y="624" width="160" height="12" rx="2" fill="#ffffff"/>
      <text x="204" y="632" fill="#7a8399" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">resposta citada ou «não sei»</text>
      <rect x="292" y="128" width="8" height="524" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="476" y="176" width="8" height="64" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="476" y="444" width="8" height="64" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="660" y="272" width="8" height="140" fill="rgba(0,0,0,0.06)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="844" y="540" width="8" height="64" fill="rgba(235,108,54,0.14)" stroke="#4f5d75" stroke-width="0.8"/>
      <rect x="40" y="32" width="144" height="48" rx="6" fill="#ffffff"/>
      <rect x="40" y="32" width="144" height="48" rx="6" fill="rgba(79,93,117,0.10)" stroke="#7a8399" stroke-width="1"/>
      <text x="112" y="52" fill="#2d3142" font-size="12" font-weight="600" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" text-anchor="middle">Ana</text>
      <text x="112" y="68" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" text-anchor="middle">usuária</text>
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
      <text x="40" y="712" fill="#4f5d75" font-size="8" font-family="Meslo, Menlo, monospace" letter-spacing="0.14em">LEGENDA</text>
      <line x1="140" y1="708" x2="180" y2="708" stroke="#4f5d75" stroke-width="1" marker-end="url(#azure-secuencia-arrow)"/><text x="192" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">CHAMADA</text>
      <line x1="300" y1="708" x2="340" y2="708" stroke="#4f5d75" stroke-width="1" stroke-dasharray="4,4" marker-end="url(#azure-secuencia-arrow)"/><text x="352" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">RETORNO</text>
      <line x1="460" y1="708" x2="500" y2="708" stroke="#eb6c36" stroke-width="1.2" marker-end="url(#azure-secuencia-arrow-accent)"/><text x="512" y="712" fill="#2d3142" font-size="8" font-family="Meslo, Menlo, monospace">PASSO-CHAVE: CHECAR FIDELIDADE</text>
    </svg></div><figcaption>Figura · Uma pergunta de ponta a ponta: “e quantos dias posso trabalhar remotamente?”</figcaption></figure>


1.  O modelo reescreve a pergunta usando o histórico da conversa: *"dias de trabalho remoto permitidos para um gerente na Espanha"*.

2.  O BM25 e a busca vetorial rodam em paralelo e são fundidos com RRF (k=60). Antes da pontuação, o filtro de segurança remove tudo o que Ana não tem permissão para ver.

3.  O semantic ranker pega só os top 50 e dá a eles notas de 0 a 4:

    | Nota  | Significado                       |
    |-------|-----------------------------------|
    | 4     | Responde totalmente               |
    | 3     | Relevante, mas incompleto         |
    | 2     | Parcial                           |
    | 1     | Relacionado, responde muito pouco |
    | 0     | Irrelevante                       |

    Chunks com nota \< 2 são descartados. Se não sobrar nenhum, a resposta é "Não encontrei essa informação". A Microsoft avisa que a distribuição das notas pode variar um pouco, então os limiares não devem ser muito finos.

4.  O modelo gera a resposta com citações, usando a estrutura de prompt da seção 13.

5.  Uma verificação de fidelidade confere se cada frase é sustentada pelos chunks. Se falhar, a resposta é gerada de novo ou dada com cautela.

Uma pergunta complexa (*"compare o trabalho remoto na Espanha e no México e me diga qual se aplica se eu me mudar"*) vai para o agentic retrieval do Azure AI Search, que a divide em subconsultas, executa-as em paralelo, reordena cada uma com o semantic ranker e junta os resultados. O planejamento de consultas e a síntese de respostas com LLM ainda estão em preview.

Uma pergunta global (*"quais temas se repetem em todas as políticas de 2026?"*) é onde o GraphRAG vale a pena.

#### 21.3 Avaliação no Azure (Microsoft Foundry)

| Avaliador | Tipo | Precisa de resposta correta | Status |
|----|----|----|----|
| Document Retrieval | Recuperação: NDCG, XDCG, Fidelity, Max Relevance, Holes | Sim (rótulos de relevância) | GA |
| Retrieval | Recuperação, julgada por um modelo de linguagem (escala 1–5) | Não | GA |
| Groundedness | Resposta: fidelidade ao contexto | Não | GA |
| Groundedness Pro | Fidelidade estrita com Content Safety (true/false) | Não | (preview) |
| Relevance | Resposta: responde à pergunta? | Não | GA |
| Response Completeness | Resposta: deixa de fora algo crítico? | Sim | (preview) |

As notas vão de 1 a 5 e, por padrão, o limite de aprovação é 3. A avaliação contínua roda sobre amostras de tráfego real (porcentagem configurável, até 1000 requisições por hora) e envia os resultados para o Application Insights, vinculados aos traces.

## Parte VIII · Comparação: Azure vs Google Cloud vs open source

### 22. Azure vs Google Cloud vs open source

Alguns produtos mudaram de nome recentemente (verificado em 2026-09-23):

- No Google, o *Vertex AI* agora aparece como Gemini Enterprise Agent Platform, o *Vertex AI Search* está sendo renomeado para Agent Search e o *Vector Search 2.0* agora se chama Agent Retrieval.
- Na Microsoft, o *Azure AI Foundry* agora é Microsoft Foundry.

#### Fase 1: Preparando os documentos

| Etapa | O que faz | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 1. Fontes | Onde ficam os documentos | Blob Storage, SharePoint | Cloud Storage, Google Drive | Sistema de arquivos, armazenamento compatível com S3 (MinIO) † |
| 2. Leitura (parsing) | PDF/Word → texto com estrutura | Document Layout skill, que usa o modelo de layout do Document Intelligence e devolve Markdown por seção | Document AI Layout Parser: versão estável desde 2024; versões com Gemini em preview; descrições de figuras e tabelas com Gemini em preview | Docling (IBM, MIT), Unstructured, MinerU †, Marker † |
| 3. Chunking | Chunks com contexto | Document Layout skill (por seção, ou tamanho fixo com sobreposição) e Text Split skill | O Layout Parser divide por estrutura e adiciona os títulos pais. O RAG Engine permite definir tamanho e sobreposição | Text splitters do LangChain e do LlamaIndex; chunking do Docling † |
| 4. Embeddings | Texto → números | Azure OpenAI text-embedding-3-large / -small | gemini-embedding-001 (até 3072 dimensões, 2048 tokens por texto), text-embedding-005 (inglês e código), text-multilingual-embedding-002 | BGE-M3 (denso + esparso + multivetor, mais de 100 idiomas), Qwen3-Embedding (Apache 2.0), multilingual-E5 |
| 5. Índice | Banco onde se busca | Azure AI Search: vetores, palavras-chave e filtros em um único serviço | Vector Search / Agent Retrieval, RAG Engine (banco gerenciado, Pinecone ou Weaviate) ou Agent Search (totalmente gerenciado) | Qdrant, Chroma, Weaviate, Milvus, pgvector, Elasticsearch / OpenSearch † |
| 6. Permissões | Cada usuário vê só o próprio conteúdo | Entra ID + filtro de grupos no índice | Controle de acesso do Google (IAM) + controle de acesso por fonte de dados no Agent Search | Filtros de metadados no banco vetorial † |

#### Fase 2: Respondendo a uma pergunta

| Etapa | O que faz | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 7. Reescrita | Pergunta autossuficiente; dividir perguntas complexas | Query rewriting do semantic ranker (preview); busca agêntica com planejamento (preview) | Agent Search: perguntas de acompanhamento e respostas com busca agêntica | LangChain MultiQueryRetriever, HyDE, transformações de consulta do LlamaIndex † |
| 8. Palavras-chave (BM25) | Correspondência exata | BM25 embutido no AI Search | Vector Search: você gera o vetor esparso (BM25, TF-IDF ou SPLADE) e faz o upload. Agent Search: gerenciado | BM25 do Elasticsearch/OpenSearch; vetores esparsos no Qdrant; SPLADE |
| 9. Significado | Vizinhos mais próximos | Vetores no AI Search | Vector Search / Agent Retrieval (milissegundos mesmo com bilhões de itens, segundo o Google) | Qdrant, Chroma, Weaviate, Milvus, pgvector † |
| 10. Fusão | Combinar listas | RRF automático (k=60), com peso configurável para os vetores | RRF com `rrf_ranking_alpha` | RRF no Qdrant †, busca híbrida do Weaviate †, LangChain EnsembleRetriever † |
| 11. Reranker | Reordenar lendo pergunta e chunk juntos | Semantic ranker: os top 50, nota 0–4 | Ranking API: `semantic-ranker-default-004` / `-fast-004` (1024 tokens, 25 idiomas, nota 0–1, até 1000 chunks por chamada). A versão 005 está em preview desde 1º de setembro de 2026 e passa a ser a padrão até 1º de outubro de 2026, no máximo | bge-reranker-v2-m3, Qwen3-Reranker (Apache 2.0), mxbai-rerank-v2 (Apache 2.0), ColBERTv2; ou um modelo de linguagem como reranker |
| 12. Agente | Buscas encadeadas | Busca agêntica / Foundry IQ (a parte de modelo de linguagem em preview) | Agent Development Kit (ADK) + Agent Runtime; agente Gemini Deep Research | LangGraph, agentes do LlamaIndex † |
| 13. GraphRAG | Grafo para perguntas globais | Microsoft GraphRAG (open source) implantado no Azure; LazyGraphRAG no Microsoft Discovery | Nenhum equivalente gerenciado encontrado (em 2026-09-23) | GraphRAG (Microsoft), LightRAG, HippoRAG 2 |

#### Fase 3: Geração e guardrails

| Etapa | O que faz | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 14. Modelo que escreve | Resposta com citações | Modelos GPT no Azure OpenAI / Microsoft Foundry (também outros modelos no Foundry †) | Gemini (família 3.x); também Claude, Llama, Qwen e outros no Model Garden | Llama, Qwen, Mistral, gpt-oss servidos com vLLM ou Ollama † |
| 15. Proteção da entrada | Bloquear tentativas de manipulação | Content Safety – Prompt Shields † | Model Armor | NeMo Guardrails, Llama Guard † |
| 16. Fidelidade aos documentos | Cada frase está sustentada? | Avaliador Groundedness; Groundedness Pro (preview) | Check Grounding API: nota 0–1 por afirmação + citações, em menos de 500 ms | HHEM-2.1-Open (Vectara), MiniCheck |

#### Fase 4: Avaliação e monitoramento

| Etapa | O que faz | Azure | Google Cloud | Open source |
|----|----|----|----|----|
| 17. Avaliar a recuperação | Encontrou o que devia? | Document Retrieval (NDCG, XDCG, Fidelity, Holes; precisa de rótulos) e Retrieval (juiz, sem rótulos) | Avaliação da qualidade de busca no Agent Search; serviço de avaliação da Agent Platform | RAGAS, DeepEval, RAGChecker, Open RAG Eval (UMBRELA) |
| 18. Avaliar a resposta | Fiel, relevante e completa? | Groundedness, Relevance, Response Completeness (preview); escala 1–5, aprovado com 3 | Serviço de avaliação com métricas baseadas em rubricas, juiz configurável e a opção de avaliar o próprio juiz | RAGAS, DeepEval, TruLens ("RAG triad"), ARES (intervalos de confiança) |
| 19. Avaliação contínua | Avaliar amostras de tráfego real | Avaliação contínua do Foundry: amostragem configurável, até 1000/hora, resultados no Application Insights | Online Monitors: a cada ~10 min, porcentagem e limite configuráveis, resultados no Cloud Logging e no Cloud Monitoring | Langfuse †, Arize Phoenix, MLflow |
| 20. Traces | Ver o que aconteceu em cada etapa | Application Insights / Azure Monitor + OpenTelemetry | Cloud Trace, Cloud Logging, Cloud Monitoring + OpenTelemetry (atributos `gen_ai.`) | OpenTelemetry + Phoenix / Langfuse † |
| 21. Deploy | Onde a app roda | Container Apps, App Service, AKS (Kubernetes) † | Cloud Run, GKE (Kubernetes), Agent Runtime | Docker + Kubernetes, FastAPI † |

#### Resumo em uma imagem

| Etapa | Azure | Google Cloud | Open source |
|----|----|----|----|
| Ler documentos | Document Layout skill | Document AI Layout Parser | Docling / Unstructured |
| Vetores | text-embedding-3 | gemini-embedding-001 | BGE-M3 / Qwen3-Embedding |
| Índice | Azure AI Search | Vector Search / Agent Search | Qdrant / Chroma / Weaviate |
| Fusão | RRF automático (k=60) | RRF (rrf_ranking_alpha) | RRF (Qdrant, LangChain) |
| Reranker | Semantic ranker (top 50) | Ranking API (até 1000) | Reranker bge / Qwen3 / mxbai |
| Modelo | GPT (Azure OpenAI) | Gemini | Llama / Qwen / gpt-oss + vLLM |
| Verificação | Groundedness (Pro em preview) | Check Grounding API | HHEM-Open / MiniCheck |
| Avaliação | Avaliadores do Foundry | Serviço de avaliação | RAGAS / DeepEval / TruLens |
| Produção | Avaliação contínua | Online Monitors | Phoenix / MLflow / Langfuse |

#### Três diferenças que importam

1.  Busca híbrida: o Azure AI Search já inclui busca por palavras-chave. No **Google Vector Search você mesmo precisa gerar o vetor esparso**; se quiser que o Google cuide disso, use o Agent Search. Em open source, depende do banco.
2.  Reranker: o do Azure reordena só os top 50. A Ranking API do Google aceita até 1000 chunks e funciona com qualquer buscador, até um externo. Em open source você controla o modelo, o custo e a latência, mas também precisa operá-lo.
3.  Avaliação: as duas nuvens agora oferecem avaliação offline e avaliação contínua sobre tráfego real, com traces padronizados (OpenTelemetry). Em open source, RAGAS ou DeepEval (offline) mais Phoenix, MLflow ou Langfuse (produção) cobrem o mesmo terreno, mas a integração fica por sua conta.

## Apêndice · Glossário

| Termo | Significado simples |
|----|----|
| Busca agêntica | Um agente divide a pergunta e faz várias buscas |
| BM25 | Algoritmo clássico de busca por palavras-chave |
| Chunk | Um pedaço de documento indexado separadamente |
| Kappa de Cohen | Uma medida de concordância entre dois avaliadores que desconta a concordância ao acaso |
| Completude (completeness) | Que a resposta não deixe de fora informação importante |
| Integração contínua (CI) | Testes automatizados que rodam a cada mudança no código |
| Cross-encoder / bi-encoder | Lê os dois textos juntos / transforma cada texto em vetor separadamente |
| Denso / esparso | Um vetor com todos os valores ativos / um vetor de termos com pesos, quase todos zero |
| Embedding / vetor | Uma lista de números que representa o significado de um texto |
| Entra ID | O sistema de identidade e acesso da Microsoft |
| Golden dataset | Um conjunto de perguntas com as respostas e os documentos corretos |
| GraphRAG | RAG com um grafo de entidades e relações |
| Groundedness / faithfulness | Que a resposta não diga nada que não esteja nos documentos |
| Alucinação | Quando o modelo inventa informação |
| HNSW | Uma estrutura em forma de grafo para encontrar rapidamente os vetores mais próximos |
| Busca híbrida | Combinar busca por palavras-chave e busca por significado |
| IAM | O sistema de controle de acesso do Google Cloud |
| Índice invertido | Uma tabela "palavra → documentos em que aparece" |
| kNN | Encontrar os k vizinhos mais próximos |
| Modelo de linguagem (LLM) | O modelo que escreve a resposta (GPT, Gemini, Claude, Llama…) |
| Juiz LLM | Outro modelo que dá nota às respostas |
| MMR | Uma técnica para remover resultados redundantes |
| MRR | Em que altura aparece o primeiro resultado correto |
| nDCG | Qualidade do ranking: se os itens corretos estão o mais acima possível (os avaliadores do Azure escrevem *NDCG*) |
| OpenTelemetry | Um padrão aberto para registrar traces e métricas |
| Parsing | Converter um arquivo (PDF, Word) em texto com estrutura |
| Precision@k | Que fração dos top k resultados está correta |
| Preview / GA | Recurso em teste / recurso oficial e estável |
| Quantização | Comprimir os números dos vetores para economizar memória |
| RAG | Geração aumentada por recuperação: buscar nos seus documentos antes de responder |
| Recall@k | Que fração dos itens corretos aparece nos top k resultados |
| Reranker | Um modelo que reordena os candidatos lendo a pergunta e o chunk juntos |
| RRF | Reciprocal rank fusion: combinar listas usando só as posições |
| SPLADE / ELSER | Modelos que expandem o texto com termos relacionados (esparso aprendido) |

## Apêndice · Referências

### Documentação oficial (acessada em 2026-09-23)

**Microsoft Azure**

- Semantic ranker: <https://learn.microsoft.com/en-us/azure/search/semantic-search-overview>
- RRF na busca híbrida: <https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking>
- Busca agêntica: <https://learn.microsoft.com/en-us/azure/search/agentic-retrieval-overview>
- Document Layout skill: <https://learn.microsoft.com/en-us/azure/search/cognitive-search-skill-document-intelligence-layout>
- Chunking no Azure AI Search: <https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents>
- Avaliadores de RAG: <https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators>
- Avaliação contínua: <https://learn.microsoft.com/en-us/azure/ai-foundry/how-to/continuous-evaluation-agents>

**Google Cloud**

- Ranking API: <https://cloud.google.com/generative-ai-app-builder/docs/ranking>
- Check Grounding: <https://cloud.google.com/generative-ai-app-builder/docs/check-grounding>
- Document AI Layout Parser: <https://cloud.google.com/document-ai/docs/layout-parse-chunk>
- RAG Engine: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/rag-engine/rag-overview>
- Busca híbrida no Vector Search: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/build/vector-search/about-hybrid-search>
- Embeddings de texto: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/embeddings/get-text-embeddings>
- Online Monitors: <https://docs.cloud.google.com/gemini-enterprise-agent-platform/optimize/evaluation/evaluate-online>

**Elastic**

- Busca semântica: <https://www.elastic.co/docs/solutions/search/semantic-search>
- Busca vetorial: <https://www.elastic.co/docs/solutions/search/vector>
- semantic_text: <https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/semantic-text>
- ELSER: <https://www.elastic.co/docs/explore-analyze/machine-learning/nlp/ml-nlp-elser>
- Retrievers: <https://www.elastic.co/docs/reference/elasticsearch/rest-apis/retrievers>

### Artigos e relatórios

**Recuperação**

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
- Anthropic, *Contextual Retrieval*, 2024 — <https://www.anthropic.com/engineering/contextual-retrieval> (números verificados por meio de um espelho; a página original bloqueou o acesso automatizado)
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

**Avaliação**

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
