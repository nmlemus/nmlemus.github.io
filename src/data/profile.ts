import type { Lang } from '../i18n/langs.ts';

export type Localized = Record<Lang, string>;
export interface LogItem {
  when: string;
  what: Localized;
}

// Every fact here comes from the author's LinkedIn profile (snapshot 2026-09-24).
export const bio: Record<Lang, string[]> = {
  en: [
    'I lead AI/ML programs for media analytics across Latin America at Procter & Gamble, where I designed an enterprise agentic AI system built around agents, reusable skills and workflows. Programs I have led have generated over US$40M in incremental business value.',
    'My background is scientific computing. In Havana I led the university’s bioinformatics R&D group and the BioSyS simulation platform. In Brazil I did a PhD in computational modeling at LNCC, worked on AI-based seismic fault detection at Dell EMC (it became a patent), and a postdoc on epidemic modeling at UFF.',
    'This site is where I write down what I learn building AI systems that have to work in production.',
  ],
  es: [
    'Lidero programas de IA/ML para analítica de medios en Latinoamérica en Procter & Gamble, donde diseñé un sistema empresarial de IA agéntica basado en agentes, skills reutilizables y workflows. Los programas que he liderado han generado más de US$40M en valor de negocio incremental.',
    'Vengo de la computación científica. En La Habana dirigí el grupo de I+D en bioinformática de la universidad y la plataforma de simulación BioSyS. En Brasil hice un doctorado en modelación computacional en el LNCC, trabajé en detección de fallas sísmicas con IA en Dell EMC (terminó en una patente) y un posdoctorado en modelación de epidemias en la UFF.',
    'Este sitio es donde escribo lo que aprendo construyendo sistemas de IA que tienen que funcionar en producción.',
  ],
  pt: [
    'Lidero programas de IA/ML para análise de mídia na América Latina na Procter & Gamble, onde projetei um sistema corporativo de IA agêntica baseado em agentes, skills reutilizáveis e workflows. Os programas que liderei geraram mais de US$40M em valor de negócio incremental.',
    'Minha formação é computação científica. Em Havana, liderei o grupo de P&D em bioinformática da universidade e a plataforma de simulação BioSyS. No Brasil, fiz doutorado em modelagem computacional no LNCC, trabalhei com detecção de falhas sísmicas com IA na Dell EMC (virou uma patente) e um pós-doutorado em modelagem de epidemias na UFF.',
    'Este site é onde escrevo o que aprendo construindo sistemas de IA que precisam funcionar em produção.',
  ],
};

export const history: LogItem[] = [
  { when: '2022-05', what: { en: 'Senior Data Scientist @ Procter & Gamble, Panama', es: 'Senior Data Scientist @ Procter & Gamble, Panamá', pt: 'Senior Data Scientist @ Procter & Gamble, Panamá' } },
  { when: '2019-09', what: { en: 'Data Scientist @ Procter & Gamble', es: 'Data Scientist @ Procter & Gamble', pt: 'Data Scientist @ Procter & Gamble' } },
  { when: '2018-08', what: { en: 'Postdoctoral Researcher @ Universidade Federal Fluminense, Rio de Janeiro', es: 'Investigador posdoctoral @ Universidade Federal Fluminense, Río de Janeiro', pt: 'Pesquisador de pós-doutorado @ Universidade Federal Fluminense, Rio de Janeiro' } },
  { when: '2014-02', what: { en: 'Scientific Researcher (AI Innovation) @ Dell EMC, Rio de Janeiro', es: 'Investigador científico (Innovación en IA) @ Dell EMC, Río de Janeiro', pt: 'Pesquisador científico (Inovação em IA) @ Dell EMC, Rio de Janeiro' } },
  { when: '2004-09', what: { en: 'Head of the Bioinformatics R&D Group @ UCI, Havana', es: 'Jefe del Grupo de I+D en Bioinformática @ UCI, La Habana', pt: 'Chefe do Grupo de P&D em Bioinformática @ UCI, Havana' } },
  { when: '2003-09', what: { en: 'Project Manager, BioSyS @ UCI', es: 'Jefe de proyecto, BioSyS @ UCI', pt: 'Gerente de projeto, BioSyS @ UCI' } },
  { when: '2002-09', what: { en: 'Assistant Professor @ UCI', es: 'Profesor asistente @ UCI', pt: 'Professor assistente @ UCI' } },
];

export const education: LogItem[] = [
  { when: '2013–2018', what: { en: 'PhD, Computational Modeling @ LNCC. Thesis: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models', es: 'Doctorado en Modelación Computacional @ LNCC. Tesis: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models', pt: 'Doutorado em Modelagem Computacional @ LNCC. Tese: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models' } },
  { when: '2005–2007', what: { en: 'MSc, Bioinformatics @ InsTEC', es: 'Maestría en Bioinformática @ InsTEC', pt: 'Mestrado em Bioinformática @ InsTEC' } },
];

export const links = [
  { label: 'linkedin', href: 'https://www.linkedin.com/in/nmlemus' },
  { label: 'github', href: 'https://github.com/nmlemus' },
  { label: 'lattes', href: 'http://lattes.cnpq.br/0845486662407480' },
];
