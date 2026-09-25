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
    name: 'seismic-interpretation', period: '2014–2015',
    kind: { en: 'research · Dell EMC', es: 'investigación · Dell EMC', pt: 'pesquisa · Dell EMC' },
    description: {
      en: 'Visualization and analysis for seismic interpretation.',
      es: 'Visualización y análisis para interpretación sísmica.',
      pt: 'Visualização e análise para interpretação sísmica.',
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
    name: 'biosys', period: '2003–2010',
    kind: { en: 'registered IP · UCI', es: 'propiedad intelectual registrada · UCI', pt: 'propriedade intelectual registrada · UCI' },
    description: {
      en: 'Software for studying biological systems modeled by ODEs: distributed simulations on Grid computing, a results database, clustering, classification, and stability and bifurcation analysis. Adopted by research centers of Cuba’s Scientific Pole; simulation time from days to hours.',
      es: 'Software para estudiar sistemas biológicos modelados con EDOs: simulaciones distribuidas en Grid, base de datos de resultados, clustering, clasificación y análisis de estabilidad y bifurcaciones. Adoptado por centros de investigación del Polo Científico cubano; tiempo de simulación de días a horas.',
      pt: 'Software para estudar sistemas biológicos modelados por EDOs: simulações distribuídas em Grid, banco de dados de resultados, clustering, classificação e análise de estabilidade e bifurcações. Adotado por centros de pesquisa do Polo Científico cubano; tempo de simulação de dias para horas.',
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
  {
    name: 'eela-2', period: '2008–2010',
    kind: { en: 'research · UCI', es: 'investigación · UCI', pt: 'pesquisa · UCI' },
    description: {
      en: 'E-science grid facility for Europe and Latin America: an interoperable Grid infrastructure over RedCLARA and GÉANT for biomedicine, high-energy physics, e-education and climate applications.',
      es: 'Infraestructura grid de e-ciencia para Europa y Latinoamérica: una infraestructura Grid interoperable sobre RedCLARA y GÉANT para aplicaciones de biomedicina, física de altas energías, e-educación y clima.',
      pt: 'Infraestrutura grid de e-ciência para Europa e América Latina: uma infraestrutura Grid interoperável sobre RedCLARA e GÉANT para aplicações de biomedicina, física de altas energias, e-educação e clima.',
    },
  },
];
