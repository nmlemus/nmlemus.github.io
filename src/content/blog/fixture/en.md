---
title: Fixture
description: Fixture post
date: 2026-01-01
tags: [test]
---

Intro paragraph with inline math $\pi_\theta(a_i \mid s_i)$ and a footnote.[^1]

## First section

$$
\Sigma = \begin{pmatrix} \sigma_1^2 & \rho\sigma_1\sigma_2 \\ \rho\sigma_1\sigma_2 & \sigma_2^2 \end{pmatrix}
$$

## Second section

| steps left to the model | P(ok) | failed |
|---|---|---|
| 6 of 6 | 0.735 | ≈ 1 in 4 |
| 2 of 6 (4 → tools) | 0.903 | ≈ 1 in 10 |

## Third section

```python
p_all_model = 0.95 ** 6  # a deliberately long comment line to test horizontal overflow on small phone screens, which must scroll inside the block
```

> A bug in a tool fails the same way twice. A model error gets re-rolled on every run.

[^1]: Generous for real pipelines.
