const AUTHOR = 'Noel Moreno Lemus';
const SAME_AS = ['https://www.linkedin.com/in/nmlemus', 'https://github.com/nmlemus', 'http://lattes.cnpq.br/0845486662407480'];

export function person(site: URL) {
  return { '@context': 'https://schema.org', '@type': 'Person', name: AUTHOR, url: site.href, jobTitle: 'AI Technical Leader', sameAs: SAME_AS };
}

export function blogPosting(a: { site: URL; url: string; title: string; description: string; date: Date; updated?: Date; lang: string; image: string }) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: a.title, description: a.description, inLanguage: a.lang, url: a.url, image: a.image,
    datePublished: a.date.toISOString(), dateModified: (a.updated ?? a.date).toISOString(),
    author: { '@type': 'Person', name: AUTHOR, url: a.site.href },
  };
}
