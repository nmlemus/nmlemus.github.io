import type { Localized } from './profile.ts';

export interface Project {
  name: string;
  period: string;
  kind: Localized;
  url?: string;
  description: Localized;
}

// Facts from the author's LinkedIn profile (snapshot 2026-09-24).
export const projects: Project[] = [
  {
    name: 'dsagent', period: '2025-12–', url: 'https://github.com/nmlemus/dsagent',
    kind: { en: 'open source', es: 'open source', pt: 'open source' },
    description: {
      en: 'An AI agent for data analysis with dynamic planning and a persistent Jupyter kernel. Human-in-the-loop approvals, MCP tools, multi-provider LLMs, API-first.',
      es: 'Un agente de IA para análisis de datos con planificación dinámica y un kernel de Jupyter persistente. Aprobaciones human-in-the-loop, herramientas MCP, múltiples proveedores de LLM, API-first.',
      pt: 'Um agente de IA para análise de dados com planejamento dinâmico e um kernel Jupyter persistente. Aprovações human-in-the-loop, ferramentas MCP, múltiplos provedores de LLM, API-first.',
    },
  },
  {
    name: 'seismic-fault-detection', period: '2014–2015',
    kind: { en: 'patent · Dell EMC', es: 'patente · Dell EMC', pt: 'patente · Dell EMC' },
    description: {
      en: '“Methods and Apparatus for Automatic Identification of Faults on Noisy Seismic Data.” AI fault detection for oil & gas seismic interpretation: 40% fewer false positives, interpretation time from weeks to hours.',
      es: '“Methods and Apparatus for Automatic Identification of Faults on Noisy Seismic Data.” Detección de fallas con IA para interpretación sísmica en petróleo y gas: 40% menos falsos positivos, tiempo de interpretación de semanas a horas.',
      pt: '“Methods and Apparatus for Automatic Identification of Faults on Noisy Seismic Data.” Detecção de falhas com IA para interpretação sísmica em óleo e gás: 40% menos falsos positivos, tempo de interpretação de semanas para horas.',
    },
  },
  {
    name: 'hpc4e', period: '2016–',
    kind: { en: 'research', es: 'investigación', pt: 'pesquisa' },
    description: {
      en: 'Exascale HPC simulations for energy: wind energy, biomass-derived fuel combustion and exploration geophysics.',
      es: 'Simulaciones HPC a exaescala para energía: eólica, combustión de biocombustibles y geofísica de exploración.',
      pt: 'Simulações HPC em exaescala para energia: eólica, combustão de biocombustíveis e geofísica de exploração.',
    },
  },
  {
    name: 'biosys', period: '2003–2012',
    kind: { en: 'registered IP · UCI', es: 'propiedad intelectual registrada · UCI', pt: 'propriedade intelectual registrada · UCI' },
    description: {
      en: 'Distributed simulator of biological systems (large-scale ODEs), adopted by research centers of Cuba’s Scientific Pole. Simulation time from days to hours.',
      es: 'Simulador distribuido de sistemas biológicos (EDOs a gran escala), adoptado por centros de investigación del Polo Científico cubano. Tiempo de simulación de días a horas.',
      pt: 'Simulador distribuído de sistemas biológicos (EDOs em larga escala), adotado por centros de pesquisa do Polo Científico cubano. Tempo de simulação de dias para horas.',
    },
  },
  {
    name: 't-arenal', period: '2004–2010',
    kind: { en: 'registered IP · UCI', es: 'propiedad intelectual registrada · UCI', pt: 'propriedade intelectual registrada · UCI' },
    description: {
      en: 'Distributed computing platform built by the UCI bioinformatics group.',
      es: 'Plataforma de computación distribuida desarrollada por el grupo de bioinformática de la UCI.',
      pt: 'Plataforma de computação distribuída desenvolvida pelo grupo de bioinformática da UCI.',
    },
  },
];
