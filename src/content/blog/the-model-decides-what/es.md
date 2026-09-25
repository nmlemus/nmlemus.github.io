---
title: El modelo decide qué. El código decide cómo.
description: Si la IA escribe código excelente, ¿por qué convertir cada paso determinista de un agente en una herramienta? Porque el “a veces” se acumula.
date: 2026-09-09
tags: [agents, reliability]
---

Hace unos días alguien me hizo una pregunta justa:

> “Si la IA es tan buena escribiendo código, ¿por qué insistes en que, al construir un agente, todo lo que pueda convertirse en una herramienta — código determinista — debe convertirse en una?”

La respuesta es simple: la IA escribe código excelente. Y aun así falla a veces — y el “a veces” se acumula.

## La aritmética

Imagina un pipeline de 6 pasos donde el modelo lo hace todo, incluso las partes deterministas: parsear fechas, convertir monedas, calcular totales. Supón una tasa de éxito del 95% por paso.

$$
0.95^6 \approx 73\%
$$

Una ejecución de cada cuatro falla en algún punto. Y nadie escribió un mal prompt.

Convierte 4 de esos pasos en herramientas y solo quedan los dos pasos que requieren juicio:

$$
0.95^2 \approx 90\%
$$

Sin mejorar un solo prompt. Cada paso que pasas a código no mejora un factor del producto: lo elimina.

| Pasos que quedan en el modelo | P(la ejecución funciona) | Ejecuciones fallidas |
|---|---|---|
| 6 de 6 | 0.735 | ≈ 1 de cada 4 |
| 2 de 6 (4 pasados a herramientas) | 0.903 | ≈ 1 de cada 10 |

## Por qué importa

Los modelos mejoran cada día, es cierto. Pero ¿por qué dejar a una tirada de dados la generación de un código que sabes exactamente cómo debe ser?

Y hay una diferencia que lo cambia todo:

- Un bug en una herramienta falla igual dos veces. Lo encuentras una vez, le escribes un test y queda resuelto para siempre.
- Un error del modelo se vuelve a tirar en cada ejecución. Nunca se arregla: solo se vuelve menos probable.

## La paradoja

La mejor forma de escribir esas herramientas es con IA. Genera el código una vez, revísalo, pruébalo, haz commit. A partir de ahí, el modelo que lo escribió ya no está en el bucle.

**El modelo decide qué. El código decide cómo.**
