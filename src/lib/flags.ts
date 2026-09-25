import type { Lang } from '../i18n/langs.ts';

// Hand-drawn 3:2 SVG flags: emoji flags don't render on Windows. Simplified at icon size (no US stars count, no Spanish arms, no Brazilian motto).
export type FlagCode = 'cu' | 'pa' | 'br' | 'es' | 'us';

export const FLAGS: Record<FlagCode, { name: Record<Lang, string>; svg: string }> = {
  cu: {
    name: { en: 'Cuba', es: 'Cuba', pt: 'Cuba' },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><path fill="#002a8f" d="M0 0h30v4H0zM0 8h30v4H0zM0 16h30v4H0z"/><path fill="#cb1515" d="M0 0L17.32 10L0 20z"/><polygon fill="#fff" points="5.77,6.60 6.54,8.95 9.01,8.95 7.01,10.40 7.77,12.75 5.77,11.30 3.78,12.75 4.54,10.40 2.54,8.95 5.01,8.95"/></svg>',
  },
  pa: {
    name: { en: 'Panama', es: 'Panamá', pt: 'Panamá' },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><path fill="#da121a" d="M15 0h15v10H15z"/><path fill="#072357" d="M0 10h15v10H0z"/><polygon fill="#072357" points="7.50,2.20 8.13,4.13 10.16,4.13 8.52,5.33 9.15,7.27 7.50,6.07 5.85,7.27 6.48,5.33 4.84,4.13 6.87,4.13"/><polygon fill="#da121a" points="22.50,12.20 23.13,14.13 25.16,14.13 23.52,15.33 24.15,17.27 22.50,16.07 20.85,17.27 21.48,15.33 19.84,14.13 21.87,14.13"/></svg>',
  },
  br: {
    name: { en: 'Brazil', es: 'Brasil', pt: 'Brasil' },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#009c3b"/><path fill="#ffdf00" d="M15 1.8L28.2 10 15 18.2 1.8 10z"/><circle cx="15" cy="10" r="5.2" fill="#002776"/><path fill="none" stroke="#fff" stroke-width=".9" d="M10.1 8.6q5.3-1.2 9.8 3.4"/></svg>',
  },
  es: {
    name: { en: 'Spain', es: 'España', pt: 'Espanha' },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#aa151b"/><rect y="5" width="30" height="10" fill="#f1bf00"/></svg>',
  },
  us: {
    name: { en: 'United States', es: 'Estados Unidos', pt: 'Estados Unidos' },
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20"><rect width="30" height="20" fill="#fff"/><path fill="#b22234" d="M0 0.00h30v1.54H0zM0 3.08h30v1.54H0zM0 6.15h30v1.54H0zM0 9.23h30v1.54H0zM0 12.31h30v1.54H0zM0 15.38h30v1.54H0zM0 18.46h30v1.54H0z"/><rect width="12" height="10.77" fill="#3c3b6e"/><g fill="#fff"><circle cx="1.20" cy="1.10" r=".45"/><circle cx="3.40" cy="1.10" r=".45"/><circle cx="5.60" cy="1.10" r=".45"/><circle cx="7.80" cy="1.10" r=".45"/><circle cx="10.00" cy="1.10" r=".45"/><circle cx="2.30" cy="2.90" r=".45"/><circle cx="4.50" cy="2.90" r=".45"/><circle cx="6.70" cy="2.90" r=".45"/><circle cx="8.90" cy="2.90" r=".45"/><circle cx="1.20" cy="4.70" r=".45"/><circle cx="3.40" cy="4.70" r=".45"/><circle cx="5.60" cy="4.70" r=".45"/><circle cx="7.80" cy="4.70" r=".45"/><circle cx="10.00" cy="4.70" r=".45"/><circle cx="2.30" cy="6.50" r=".45"/><circle cx="4.50" cy="6.50" r=".45"/><circle cx="6.70" cy="6.50" r=".45"/><circle cx="8.90" cy="6.50" r=".45"/><circle cx="1.20" cy="8.30" r=".45"/><circle cx="3.40" cy="8.30" r=".45"/><circle cx="5.60" cy="8.30" r=".45"/><circle cx="7.80" cy="8.30" r=".45"/><circle cx="10.00" cy="8.30" r=".45"/><circle cx="2.30" cy="10.10" r=".45"/><circle cx="4.50" cy="10.10" r=".45"/><circle cx="6.70" cy="10.10" r=".45"/><circle cx="8.90" cy="10.10" r=".45"/></g></svg>',
  },
};
