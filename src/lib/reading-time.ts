const WORDS_PER_MINUTE = 230;

export function readingMinutes(markdown: string): number {
  const prose = markdown.replace(/```[\s\S]*?```/g, ' ');
  const words = prose.split(/\s+/).filter((w) => /\w/.test(w)).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
