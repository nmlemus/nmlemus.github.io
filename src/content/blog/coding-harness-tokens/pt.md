---
title: Como o harness de programação afeta o consumo de tokens
description: Mesmo modelo, mesmas tarefas, três harnesses. O que Claude Code, OpenCode e Pi consumiram, e quanto a minha própria configuração distorceu a comparação.
date: 2026-09-07
tags: [coding-agents, cost]
---

Um extra de \$0.10 por tarefa vira \$10,000 ao longo de 100,000 execuções. É um cálculo ilustrativo, mas explica por que o consumo de tokens merece atenção antes de o uso escalar.

Para quem usa agentes de programação, parte desse consumo depende de escolhas nas quais mal pensamos: qual harness usamos, quais plugins temos instalados, quais skills ele descobre e quais arquivos de instruções carrega.

Escolhemos um modelo, abrimos a nossa ferramenta preferida e começamos a trabalhar. Mas o prompt que digitamos é só uma parte do que o modelo recebe.

Neste fim de semana, eu quis entender o quanto essas escolhas importavam na minha própria configuração.

Comparei Claude Code, OpenCode e Pi com o mesmo modelo e as mesmas tarefas. No caminho, descobri que a minha configuração pessoal estava afetando a comparação muito mais do que eu esperava.

## Por que comparar harnesses?

Por “harness” eu me refiro ao software por meio do qual o modelo trabalha: Claude Code, OpenCode ou Pi neste experimento. Ele gerencia a conversa, expõe ferramentas, executa comandos e carrega o contexto entre chamadas.

Escolher o mesmo modelo em três ferramentas não significa que você está enviando a ele o mesmo contexto nem gerando a mesma sequência de chamadas.

A pesquisa publicada dá motivos para examinar isso de perto. Vats e Golev relatam diferenças de até 40× em tokens por tarefa resolvida entre três harnesses, com diferenças menores nas taxas de sucesso nos cenários avaliados.[^1]

Weinberger e Hozez também relatam diferenças substanciais no custo por tarefa bem-sucedida entre Claude Code e Pi nas condições experimentais deles. O estudo examina como as instruções podem gerar raciocínio e atividade de ferramentas adicionais sem melhorar o sucesso da tarefa.[^2]

## O que eu testei

Executei 19 tarefas selecionadas do Terminal-Bench três vezes em cada harness: 171 execuções no total.

O modelo foi fixado em `claude-sonnet-5` nos três. As tarefas rodaram em workspaces separados na mesma máquina e foram avaliadas com os seus testes associados.

Depois de isolar a configuração pessoal descrita abaixo, os três harnesses passaram em 50 de 57 execuções: 87.7%.

O consumo de tokens foi diferente:

- Pi foi a referência, com o menor consumo.
- OpenCode usou 3.1× mais tokens.
- Claude Code usou 5.2× mais tokens.

Esses números são médias geométricas de razões por tarefa. Eles descrevem esta carga de trabalho, não um ranking universal.

A taxa de sucesso agregada idêntica também esconde diferenças em tarefas individuais. Ela não demonstra que as três ferramentas têm capacidades equivalentes.

## A minha configuração existente fazia parte do experimento

Os primeiros resultados do Claude Code mostravam uma diferença de tokens maior. Antes de atribuí-la ao harness, verifiquei o que o meu ambiente estava carregando.

A auditoria encontrou 110 ferramentas, 10 plugins, sete servidores MCP, 68 agentes personalizados e um arquivo de instruções global.

Esse era o ambiente que eu tinha acumulado para o trabalho do dia a dia. Compará-lo diretamente com uma configuração muito mais enxuta significava misturar a configuração pessoal com a aparente diferença entre harnesses.

Depois de isolar essa configuração, as razões de tokens Claude Code/Pi ficaram na faixa de 3.2×–8.3× nas tarefas testadas.

Ainda restava uma diferença substancial. Mas a comparação inicial exagerava o que eu podia atribuir ao harness em si.

## O que isso significa no uso diário

Uma skill, um plugin ou um arquivo Markdown parado no disco não gera automaticamente uma cobrança de tokens. O que importa é se o harness carrega o seu conteúdo ou os seus metadados, expõe definições de ferramentas adicionais ou o inclui de alguma outra forma nas requisições ao modelo.

O meu experimento não isolou a contribuição individual de cada extensão ou arquivo de instruções. Ele mediu o efeito das configurações combinadas que testei.

Para quem usa essas ferramentas, isso ainda leva a perguntas práticas:

- Quais instruções globais e de projeto estão sendo carregadas?
- Quais skills e ferramentas ficam expostas para esta tarefa?
- Há plugins ou integrações MCP não relacionados contribuindo com contexto?
- A mesma tarefa consome de forma diferente em um perfil limpo e na configuração do dia a dia?
- O consumo adicional produz uma melhoria útil?

Extensões úteis podem justificar o seu custo. A ideia é tornar esse custo visível e avaliá-lo em relação ao trabalho que elas ajudam a concluir.

## Tokens e dólares precisam de contabilidades separadas

As razões de tokens acima não devem ser lidas como razões de cobrança equivalentes.

Entrada, saída, criação de cache e leituras de cache têm preços diferentes. O experimento também usou modelos de cobrança diferentes: o Claude Code rodou por meio de uma assinatura, enquanto Pi e OpenCode usaram acesso à API cobrado por uso.

Por isso, o custo equivalente de API informado pelo Claude Code não é diretamente comparável a uma cobrança incremental real da assinatura.

No uso cobrado por consumo, o gasto extra pode virar uma despesa recorrente à medida que o volume de execuções cresce. Traduzir estes resultados específicos em economia projetada em dólares exigiria igualar as condições de cobrança e medir uma carga de trabalho representativa.

## Quanta confiança devemos depositar nisso?

É um piloto: 19 tarefas fáceis selecionadas que podiam rodar na máquina host, com três repetições por harness. Não cobre repositórios grandes, sessões de desenvolvimento longas nem toda a gama de capacidades que essas ferramentas oferecem.

Os resultados sustentam duas observações nesta configuração:

- o consumo de tokens diferiu entre os harnesses mesmo depois do isolamento,
- e a minha configuração existente afetou de forma relevante as medições antes do isolamento.

Para o meu próprio uso, isso muda a forma como vou comparar essas ferramentas. Quero saber o modelo, o harness e a configuração por trás de um resultado, e o que a tarefa completa consumiu.

Se você usa Claude Code, OpenCode ou Pi todos os dias, já comparou a sua configuração habitual com uma limpa?

Detalhes do projeto e do experimento: [github.com/nmlemus/harness-token-efficiency](https://github.com/nmlemus/harness-token-efficiency)

[^1]: Vats & Golev. “The Scaffold Effect in Coding Agents: Harness Choice as a Hidden Variable in Coding-Agent Evaluation.” [arXiv:2607.22585](https://arxiv.org/abs/2607.22585)

[^2]: Weinberger & Hozez. “Same Task, Different Work: Prompt-Induced Waste in Coding Agents.” [arXiv:2608.01347](https://arxiv.org/abs/2608.01347)
