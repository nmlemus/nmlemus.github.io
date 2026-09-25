---
title: O modelo decide o quê. O código decide como.
description: Se a IA escreve código excelente, por que transformar cada passo determinístico de um agente em uma ferramenta? Porque o “às vezes” se acumula.
date: 2026-09-09
tags: [agents, reliability]
---

Há alguns dias, alguém me fez uma pergunta justa:

> “Se a IA é tão boa escrevendo código, por que você insiste que, ao construir um agente, tudo o que pode virar uma ferramenta — código determinístico — deve virar uma?”

A resposta é simples: a IA escreve código excelente. E ainda assim falha às vezes — e o “às vezes” se acumula.

## A aritmética

Imagine um pipeline de 6 passos em que o modelo faz tudo, até as partes determinísticas: fazer parsing de datas, converter moedas, calcular totais. Suponha uma taxa de sucesso de 95% por passo.

$$
0.95^6 \approx 73\%
$$

Uma execução em cada quatro falha em algum ponto. E ninguém escreveu um prompt ruim.

Transforme 4 desses passos em ferramentas e restam apenas os dois passos que exigem julgamento:

$$
0.95^2 \approx 90\%
$$

Sem melhorar um único prompt. Cada passo que você move para o código não melhora um fator do produto: ele o elimina.

| Passos que ficam com o modelo | P(a execução funciona) | Execuções com falha |
|---|---|---|
| 6 de 6 | 0.735 | ≈ 1 em 4 |
| 2 de 6 (4 movidos para ferramentas) | 0.903 | ≈ 1 em 10 |

## Por que isso importa

Os modelos melhoram a cada dia, é verdade. Mas por que deixar para um lance de dados a geração de um código que você sabe exatamente como deve ser?

E há uma diferença que muda tudo:

- Um bug em uma ferramenta falha do mesmo jeito duas vezes. Você o encontra uma vez, escreve um teste e ele está resolvido para sempre.
- Um erro do modelo é sorteado de novo a cada execução. Ele nunca é corrigido: só fica menos provável.

## O paradoxo

A melhor forma de escrever essas ferramentas é com IA. Gere o código uma vez, revise, teste, faça commit. A partir daí, o modelo que o escreveu não está mais no loop.

**O modelo decide o quê. O código decide como.**
