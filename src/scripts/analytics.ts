import { CONSENT_KEY, GA_ID, decide, type Consent } from '../lib/analytics.ts';

declare global {
  interface Window { dataLayer: unknown[]; [optOut: `ga-disable-${string}`]: boolean }
}

function read(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    return null; // storage blocked: ask on every page, never load silently
  }
}

function save(value: Consent): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Storage blocked: the answer lasts for this page only.
  }
}

let loaded = false;
function loadGa(): void {
  window[`ga-disable-${GA_ID}`] = false; // re-accepting after a decline on the same page
  if (loaded) return;
  loaded = true;
  window.dataLayer = window.dataLayer || [];
  // gtag.js reads the `arguments` object, not an array: keep this a classic function.
  function gtag(..._args: unknown[]) { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', GA_ID);
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

/** Withdrawing consent stops GA on this page (Google's opt-out flag), removes its cookies and skips it from the next page on. */
function optOut(): void {
  window[`ga-disable-${GA_ID}`] = true;
  for (const name of document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter((n) => n.startsWith('_ga'))) {
    for (const domain of ['', `; domain=${location.hostname}`, `; domain=.${location.hostname}`]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    }
  }
}

export function initAnalytics(): void {
  const notice = document.querySelector<HTMLElement>('[data-analytics-notice]');
  if (!notice) return;
  const answer = (value: Consent) => {
    save(value);
    notice.hidden = true;
    if (value === 'granted') loadGa();
    else optOut();
  };
  notice.querySelector('[data-accept]')?.addEventListener('click', () => answer('granted'));
  notice.querySelector('[data-decline]')?.addEventListener('click', () => answer('denied'));
  document.querySelector('[data-analytics-settings]')?.addEventListener('click', () => { notice.hidden = false; });

  const next = decide(read());
  if (next === 'load') loadGa();
  if (next === 'ask') notice.hidden = false;
}
