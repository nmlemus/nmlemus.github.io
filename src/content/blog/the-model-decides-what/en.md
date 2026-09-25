---
title: The model decides what. Code decides how.
description: If AI writes excellent code, why turn every deterministic step of an agent into a tool? Because “sometimes” compounds.
date: 2026-09-09
tags: [agents, reliability]
---

A few days ago, someone asked me a fair question:

> “If AI is so good at writing code, why do you keep insisting that, when building an agent, everything that can become a tool — deterministic code — should become one?”

The answer is simple: AI writes excellent code. And it still fails sometimes — and “sometimes” compounds.

## The arithmetic

Imagine a 6-step pipeline where the model handles everything, even the deterministic parts: parsing dates, converting currencies, computing totals. Assume a 95% success rate per step.

$$
0.95^6 \approx 73\%
$$

One run in four fails somewhere. And nobody wrote a bad prompt.

Turn 4 of those steps into tools and only the two judgment steps remain:

$$
0.95^2 \approx 90\%
$$

Without improving a single prompt. Every step you move to code doesn’t improve a factor in the product — it removes it.

| Steps left to the model | P(run succeeds) | Failed runs |
|---|---|---|
| 6 of 6 | 0.735 | ≈ 1 in 4 |
| 2 of 6 (4 moved to tools) | 0.903 | ≈ 1 in 10 |

## Why it matters

Models get better every day; that’s true. But why leave to a dice roll the generation of code you know exactly how it should look?

And there’s one difference that changes everything:

- A bug in a tool fails the same way twice. You find it once, write a test for it, and it’s fixed forever.
- A model error gets re-rolled on every run. It never gets fixed — it only gets less likely.

## The paradox

The best way to write those tools is with AI. Generate the code once, review it, test it, commit it. From then on, the model that wrote it is no longer in the loop.

**The model decides what. Code decides how.**
