---
title: How Coding Harness Affects Token Consumption
description: Same model, same tasks, three harnesses. What Claude Code, OpenCode and Pi consumed, and how much my own configuration skewed the comparison.
date: 2026-09-07
tags: [coding-agents, cost]
---

An extra \$0.10 per task becomes \$10,000 over 100,000 executions. That is an illustrative calculation, but it explains why token consumption deserves attention before usage scales.

For people using coding agents, part of that consumption depends on choices we may barely think about: which harness we use, which plugins we have installed, which skills it discovers, and which instruction files it loads.

We choose a model, open our preferred tool, and start working. But the prompt we type is only part of what the model receives.

This weekend, I wanted to understand how much those choices mattered in my own setup.

I compared Claude Code, OpenCode, and Pi with the same model and the same tasks. Along the way, I found that my personal configuration was affecting the comparison much more than I had expected.

## Why compare harnesses?

By “harness,” I mean the software through which the model works: Claude Code, OpenCode, or Pi in this experiment. It manages the conversation, exposes tools, executes commands, and carries context between calls.

Choosing the same model in three tools does not mean you are sending it the same context or generating the same sequence of calls.

Published research gives a reason to examine this closely. Vats and Golev report differences of up to 40× in tokens per solved task across three harnesses, with smaller differences in pass rates in their evaluated settings.[^1]

Weinberger and Hozez also report substantial differences in cost per successful task between Claude Code and Pi under their experimental conditions. Their study examines how instructions can generate additional reasoning and tool activity without improving task success.[^2]

## What I tested

I ran 19 selected Terminal-Bench tasks three times through each harness: 171 trials in total.

The model was pinned to `claude-sonnet-5` across all three. Tasks ran in separate trial workspaces on the same machine and were scored using their associated tests.

After isolating the personal configuration described below, all three harnesses passed 50 of 57 trials: 87.7%.

Token consumption differed:

- Pi was the reference, with the lowest consumption.
- OpenCode used 3.1× as many tokens.
- Claude Code used 5.2× as many tokens.

Those figures are geometric means of task-level ratios. They describe this workload, rather than a universal ranking.

The identical aggregate pass rate also hides differences on individual tasks. It does not establish that the three tools have equivalent capabilities.

## My existing configuration was part of the experiment

The initial Claude Code results showed a larger token gap. Before attributing it to the harness, I checked what my environment was loading.

The audit identified 110 tools, 10 plugins, seven MCP servers, 68 custom agents, and a global instructions file.

That was the environment I had accumulated for everyday work. Comparing it directly with a much leaner setup meant that personal configuration was mixed into the apparent harness difference.

After isolating that configuration, the Claude Code/Pi token ratios fell into the 3.2×–8.3× range across the tested tasks.

A substantial difference remained. But the initial comparison had overstated what I could attribute to the harness itself.

## What this means for everyday use

A skill, plugin, or Markdown file sitting on disk does not automatically incur a token charge. What matters is whether the harness loads its content or metadata, exposes additional tool definitions, or otherwise includes it in model requests.

My experiment did not isolate the individual contribution of every extension or instruction file. It measured the effect of the combined configurations I tested.

For someone using these tools, that still leads to practical questions:

- Which global and project instructions are being loaded?
- Which skills and tools are exposed for this task?
- Are unrelated plugins or MCP integrations contributing context?
- Does the same task consume differently in a clean profile and the everyday setup?
- Does the additional consumption produce a useful improvement?

Useful extensions can justify their cost. The point is to make that cost visible and evaluate it against the work they help complete.

## Tokens and dollars need separate accounting

The token ratios above should not be read as equivalent billing ratios.

Input, output, cache creation, and cache reads have different pricing. The experiment also used different billing arrangements: Claude Code ran through a subscription, while Pi and OpenCode used metered API access.

Consequently, Claude Code’s reported API-equivalent cost is not directly comparable to an actual incremental subscription charge.

For metered usage, extra consumption can become a recurring expense as execution volume grows. Translating these particular results into projected dollar savings would require matching the billing conditions and measuring a representative workload.

## How much confidence should we place in this?

This is a pilot: 19 selected easy tasks that could run on the host, with three repetitions per harness. It does not cover large repositories, long development sessions, or the full range of capabilities these tools offer.

The findings support two observations in this setup:

- token consumption differed across harnesses even after isolation,
- and my existing configuration materially affected the measurements before isolation.

For my own usage, that changes how I will compare these tools. I want to know the model, the harness, and the configuration behind a result — and what the complete task consumed.

If you use Claude Code, OpenCode, or Pi every day, have you compared your usual setup with a clean one?

Project and experimental details: [github.com/nmlemus/harness-token-efficiency](https://github.com/nmlemus/harness-token-efficiency)

[^1]: Vats & Golev. “The Scaffold Effect in Coding Agents: Harness Choice as a Hidden Variable in Coding-Agent Evaluation.” [arXiv:2607.22585](https://arxiv.org/abs/2607.22585)

[^2]: Weinberger & Hozez. “Same Task, Different Work: Prompt-Induced Waste in Coding Agents.” [arXiv:2608.01347](https://arxiv.org/abs/2608.01347)
