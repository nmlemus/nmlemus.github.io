/** Google Analytics 4 property for nmlemus.github.io. Public: it appears in every page that loads GA. */
export const GA_ID = 'G-BYBYLGV5P3';
export const CONSENT_KEY = 'analytics-consent';

export type Consent = 'granted' | 'denied';

/** What to do with the visitor's stored answer: GA loads only after an explicit accept. */
export function decide(stored: string | null): 'load' | 'skip' | 'ask' {
  if (stored === 'granted') return 'load';
  if (stored === 'denied') return 'skip';
  return 'ask';
}
