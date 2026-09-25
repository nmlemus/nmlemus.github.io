import type { Lang } from '../i18n/langs.ts';
import type { FlagCode } from '../lib/flags.ts';

export type Localized = Record<Lang, string>;
export interface LogItem {
  when: string;
  what: Localized;
  country: FlagCode;
}

// Every fact here comes from the author's LinkedIn profile (snapshot 2026-09-24).
// Author's own profile text (provided 2026-09-25); ES/PT translated.
export const bio: Record<Lang, string[]> = {
  en: [
    'I lead AI initiatives that connect business priorities with technical architecture, engineering execution, and team development. My background spans more than 20 years across software development, applied research, and multidisciplinary leadership. I hold a PhD in Computational Modeling and a Master\'s in Bioinformatics.',
    'At Procter & Gamble LATAM, I lead AI/ML programs for media analytics and serve as the regional Generative AI focal point for a community of approximately 20 data scientists. Programs I have led have generated over US$40M in incremental business value. I also manage direct reports and mentor colleagues across Latin America.',
    'I designed the architecture of an enterprise agentic system built around agents, reusable skills, and workflows, and implemented its core components and agents for strategic planning, tactical planning, and marketing mix modeling. The architecture connects with corporate systems through APIs and MCP and incorporates governance, security, and observability requirements.',
    'I combine hands-on development in Python and GCP with experience delivering and monitoring ML solutions in production. Earlier in my career, I led multidisciplinary research and software teams and contributed to patented AI technology for seismic interpretation. My experience as a researcher and educator shapes how I work: making technical choices explicit and helping teams build solutions they can operate, maintain, and improve.',
  ],
  es: [
    'Lidero iniciativas de IA que conectan las prioridades del negocio con la arquitectura técnica, la ejecución de ingeniería y el desarrollo de equipos. Mi trayectoria abarca más de 20 años entre desarrollo de software, investigación aplicada y liderazgo multidisciplinario. Tengo un doctorado en Modelación Computacional y una maestría en Bioinformática.',
    'En Procter & Gamble LATAM lidero programas de IA/ML para analítica de medios y soy el referente regional de IA generativa para una comunidad de aproximadamente 20 científicos de datos. Los programas que he liderado han generado más de US$40M en valor de negocio incremental. También tengo reportes directos a mi cargo y acompaño como mentor a colegas de toda Latinoamérica.',
    'Diseñé la arquitectura de un sistema agéntico empresarial basado en agentes, skills reutilizables y workflows, e implementé sus componentes centrales y los agentes de planificación estratégica, planificación táctica y marketing mix modeling. La arquitectura se conecta con los sistemas corporativos mediante APIs y MCP, e incorpora requisitos de gobernanza, seguridad y observabilidad.',
    'Combino el desarrollo práctico en Python y GCP con experiencia entregando y monitoreando soluciones de ML en producción. Antes en mi carrera lideré equipos multidisciplinarios de investigación y software, y contribuí a una tecnología de IA patentada para interpretación sísmica. Mi experiencia como investigador y docente define cómo trabajo: hacer explícitas las decisiones técnicas y ayudar a los equipos a construir soluciones que puedan operar, mantener y mejorar.',
  ],
  pt: [
    'Lidero iniciativas de IA que conectam as prioridades do negócio à arquitetura técnica, à execução de engenharia e ao desenvolvimento de equipes. Minha trajetória soma mais de 20 anos entre desenvolvimento de software, pesquisa aplicada e liderança multidisciplinar. Tenho doutorado em Modelagem Computacional e mestrado em Bioinformática.',
    'Na Procter & Gamble LATAM, lidero programas de IA/ML para análise de mídia e sou o ponto focal regional de IA generativa para uma comunidade de aproximadamente 20 cientistas de dados. Os programas que liderei geraram mais de US$40M em valor de negócio incremental. Também tenho liderados diretos e atuo como mentor de colegas em toda a América Latina.',
    'Projetei a arquitetura de um sistema agêntico corporativo baseado em agentes, skills reutilizáveis e workflows, e implementei seus componentes centrais e os agentes de planejamento estratégico, planejamento tático e marketing mix modeling. A arquitetura se conecta aos sistemas corporativos por meio de APIs e MCP e incorpora requisitos de governança, segurança e observabilidade.',
    'Combino desenvolvimento prático em Python e GCP com experiência entregando e monitorando soluções de ML em produção. No início da carreira, liderei equipes multidisciplinares de pesquisa e software e contribuí para uma tecnologia de IA patenteada para interpretação sísmica. Minha experiência como pesquisador e professor molda a forma como trabalho: tornar explícitas as escolhas técnicas e ajudar as equipes a construir soluções que consigam operar, manter e melhorar.',
  ],
};

export const history: LogItem[] = [
  { when: '2022-05', what: { en: 'Senior Data Scientist @ Procter & Gamble, Panama', es: 'Senior Data Scientist @ Procter & Gamble, Panamá', pt: 'Senior Data Scientist @ Procter & Gamble, Panamá' }, country: 'pa' },
  { when: '2019-09', what: { en: 'Data Scientist @ Procter & Gamble', es: 'Data Scientist @ Procter & Gamble', pt: 'Data Scientist @ Procter & Gamble' }, country: 'pa' },
  { when: '2018-08', what: { en: 'Postdoctoral Researcher @ Universidade Federal Fluminense, Rio de Janeiro', es: 'Investigador posdoctoral @ Universidade Federal Fluminense, Río de Janeiro', pt: 'Pesquisador de pós-doutorado @ Universidade Federal Fluminense, Rio de Janeiro' }, country: 'br' },
  { when: '2014-02', what: { en: 'Scientific Researcher (AI Innovation) @ Dell EMC, Rio de Janeiro', es: 'Investigador científico (Innovación en IA) @ Dell EMC, Río de Janeiro', pt: 'Pesquisador científico (Inovação em IA) @ Dell EMC, Rio de Janeiro' }, country: 'br' },
  { when: '2004-09', what: { en: 'Head of the Bioinformatics R&D Group @ UCI, Havana', es: 'Jefe del Grupo de I+D en Bioinformática @ UCI, La Habana', pt: 'Chefe do Grupo de P&D em Bioinformática @ UCI, Havana' }, country: 'cu' },
  { when: '2003-09', what: { en: 'Project Manager, BioSyS @ UCI', es: 'Jefe de proyecto, BioSyS @ UCI', pt: 'Gerente de projeto, BioSyS @ UCI' }, country: 'cu' },
  { when: '2002-09', what: { en: 'Assistant Professor @ UCI', es: 'Profesor asistente @ UCI', pt: 'Professor assistente @ UCI' }, country: 'cu' },
];

export const education: LogItem[] = [
  { when: '2013–2018', what: { en: 'PhD, Computational Modeling @ LNCC. Thesis: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models', es: 'Doctorado en Modelación Computacional @ LNCC. Tesis: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models', pt: 'Doutorado em Modelagem Computacional @ LNCC. Tese: Generalized lambda distribution for uncertainty quantification of large-scale spatio-temporal models' }, country: 'br' },
  { when: '2005–2007', what: { en: 'MSc, Bioinformatics @ InsTEC', es: 'Maestría en Bioinformática @ InsTEC', pt: 'Mestrado em Bioinformática @ InsTEC' }, country: 'cu' },
  // TODO: replace with real years (author to confirm) — left empty rather than guessed.
  { when: '', what: { en: 'BSc, Radiochemistry @ ISCTN, Havana', es: 'Licenciatura en Radioquímica @ ISCTN, La Habana', pt: 'Graduação em Radioquímica @ ISCTN, Havana' }, country: 'cu' },
];

export interface SpokenLanguage {
  flag: FlagCode;
  name: Localized;
  level: Localized;
}

export const spoken: SpokenLanguage[] = [
  { flag: 'es', name: { en: 'Spanish', es: 'Español', pt: 'Espanhol' }, level: { en: 'native', es: 'nativo', pt: 'nativo' } },
  { flag: 'us', name: { en: 'English', es: 'Inglés', pt: 'Inglês' }, level: { en: 'professional', es: 'profesional', pt: 'profissional' } },
  { flag: 'br', name: { en: 'Portuguese', es: 'Portugués', pt: 'Português' }, level: { en: 'professional', es: 'profesional', pt: 'profissional' } },
];

export const links = [
  { label: 'linkedin', href: 'https://www.linkedin.com/in/nmlemus' },
  { label: 'github', href: 'https://github.com/nmlemus' },
  { label: 'lattes', href: 'http://lattes.cnpq.br/0845486662407480' },
];
