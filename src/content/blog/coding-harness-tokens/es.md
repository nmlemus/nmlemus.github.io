---
title: Cómo el harness de programación afecta el consumo de tokens
description: Mismo modelo, mismas tareas, tres harnesses. Lo que consumieron Claude Code, OpenCode y Pi, y cuánto sesgó la comparación mi propia configuración.
date: 2026-09-07
tags: [coding-agents, cost]
---

Un extra de \$0.10 por tarea se convierte en \$10,000 a lo largo de 100,000 ejecuciones. Es un cálculo ilustrativo, pero explica por qué el consumo de tokens merece atención antes de que el uso escale.

Para quienes usamos agentes de programación, parte de ese consumo depende de decisiones en las que apenas pensamos: qué harness usamos, qué plugins tenemos instalados, qué skills descubre y qué archivos de instrucciones carga.

Elegimos un modelo, abrimos nuestra herramienta favorita y empezamos a trabajar. Pero el prompt que escribimos es solo una parte de lo que recibe el modelo.

Este fin de semana quise entender cuánto importaban esas decisiones en mi propia configuración.

Comparé Claude Code, OpenCode y Pi con el mismo modelo y las mismas tareas. En el camino descubrí que mi configuración personal estaba afectando la comparación mucho más de lo que esperaba.

## ¿Por qué comparar harnesses?

Por “harness” me refiero al software a través del cual trabaja el modelo: Claude Code, OpenCode o Pi en este experimento. Gestiona la conversación, expone herramientas, ejecuta comandos y lleva el contexto de una llamada a otra.

Elegir el mismo modelo en tres herramientas no significa que le estés enviando el mismo contexto ni que se genere la misma secuencia de llamadas.

La investigación publicada da motivos para examinarlo de cerca. Vats y Golev reportan diferencias de hasta 40× en tokens por tarea resuelta entre tres harnesses, con diferencias menores en las tasas de éxito en los escenarios que evaluaron.[^1]

Weinberger y Hozez también reportan diferencias sustanciales en el costo por tarea exitosa entre Claude Code y Pi en sus condiciones experimentales. Su estudio examina cómo las instrucciones pueden generar razonamiento y actividad de herramientas adicionales sin mejorar el éxito de la tarea.[^2]

## Qué probé

Ejecuté 19 tareas seleccionadas de Terminal-Bench tres veces en cada harness: 171 ejecuciones en total.

El modelo quedó fijado en `claude-sonnet-5` en los tres. Las tareas corrieron en espacios de trabajo separados en la misma máquina y se evaluaron con sus tests asociados.

Tras aislar la configuración personal que describo más abajo, los tres harnesses pasaron 50 de 57 ejecuciones: 87.7%.

El consumo de tokens fue distinto:

- Pi fue la referencia, con el menor consumo.
- OpenCode usó 3.1× más tokens.
- Claude Code usó 5.2× más tokens.

Esas cifras son medias geométricas de ratios por tarea. Describen esta carga de trabajo, no un ranking universal.

La tasa de éxito agregada idéntica también oculta diferencias en tareas individuales. No demuestra que las tres herramientas tengan capacidades equivalentes.

## Mi configuración existente era parte del experimento

Los primeros resultados de Claude Code mostraban una brecha de tokens mayor. Antes de atribuírsela al harness, revisé qué estaba cargando mi entorno.

La auditoría encontró 110 herramientas, 10 plugins, siete servidores MCP, 68 agentes personalizados y un archivo de instrucciones global.

Ese era el entorno que había acumulado para el trabajo diario. Compararlo directamente con una configuración mucho más ligera significaba mezclar la configuración personal con la aparente diferencia entre harnesses.

Tras aislar esa configuración, los ratios de tokens Claude Code/Pi quedaron en el rango de 3.2×–8.3× en las tareas probadas.

Seguía habiendo una diferencia sustancial. Pero la comparación inicial exageraba lo que podía atribuir al harness en sí.

## Qué significa esto en el uso diario

Una skill, un plugin o un archivo Markdown en disco no genera automáticamente un cargo de tokens. Lo que importa es si el harness carga su contenido o sus metadatos, expone definiciones de herramientas adicionales o lo incluye de alguna otra forma en las peticiones al modelo.

Mi experimento no aisló la contribución individual de cada extensión o archivo de instrucciones. Midió el efecto de las configuraciones combinadas que probé.

Para quien usa estas herramientas, eso lleva de todos modos a preguntas prácticas:

- ¿Qué instrucciones globales y de proyecto se están cargando?
- ¿Qué skills y herramientas quedan expuestas para esta tarea?
- ¿Hay plugins o integraciones MCP no relacionados aportando contexto?
- ¿La misma tarea consume distinto en un perfil limpio que en la configuración de todos los días?
- ¿El consumo adicional produce una mejora útil?

Las extensiones útiles pueden justificar su costo. La idea es hacer visible ese costo y evaluarlo frente al trabajo que ayudan a completar.

## Tokens y dólares requieren contabilidades separadas

Los ratios de tokens anteriores no deben leerse como ratios de facturación equivalentes.

La entrada, la salida, la creación de caché y las lecturas de caché tienen precios distintos. El experimento también usó esquemas de facturación diferentes: Claude Code corrió con una suscripción, mientras que Pi y OpenCode usaron acceso a la API medido por uso.

Por lo tanto, el costo equivalente de API que reporta Claude Code no es directamente comparable con un cargo incremental real de la suscripción.

En el uso medido, el consumo extra puede convertirse en un gasto recurrente a medida que crece el volumen de ejecuciones. Traducir estos resultados concretos en ahorros proyectados en dólares exigiría igualar las condiciones de facturación y medir una carga de trabajo representativa.

## ¿Cuánta confianza deberíamos darle a esto?

Es un piloto: 19 tareas fáciles seleccionadas que podían correr en la máquina anfitriona, con tres repeticiones por harness. No cubre repositorios grandes, sesiones de desarrollo largas ni toda la gama de capacidades que ofrecen estas herramientas.

Los resultados sostienen dos observaciones en esta configuración:

- el consumo de tokens difirió entre harnesses incluso después del aislamiento,
- y mi configuración existente afectó de forma importante las mediciones antes del aislamiento.

Para mi propio uso, eso cambia cómo voy a comparar estas herramientas. Quiero saber el modelo, el harness y la configuración que hay detrás de un resultado, y lo que consumió la tarea completa.

Si usas Claude Code, OpenCode o Pi todos los días, ¿has comparado tu configuración habitual con una limpia?

Detalles del proyecto y del experimento: [github.com/nmlemus/harness-token-efficiency](https://github.com/nmlemus/harness-token-efficiency)

[^1]: Vats & Golev. “The Scaffold Effect in Coding Agents: Harness Choice as a Hidden Variable in Coding-Agent Evaluation.” [arXiv:2607.22585](https://arxiv.org/abs/2607.22585)

[^2]: Weinberger & Hozez. “Same Task, Different Work: Prompt-Induced Waste in Coding Agents.” [arXiv:2608.01347](https://arxiv.org/abs/2608.01347)
