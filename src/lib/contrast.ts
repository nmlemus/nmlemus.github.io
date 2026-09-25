// Worst-case code backgrounds: reader mode puts light-theme code on --bg-2; dark mode uses Solarized base03.
export const CODE_BG_LIGHT = '#efe4cc';
export const CODE_BG_DARK = '#002b36';
const MIN_RATIO = 4.5;

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c: number[]) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio between two #rrggbb colors. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Returns `fg` if it already reaches `min` on `bg`; otherwise mixes it toward white (dark bg) or black (light bg) until it does. */
export function ensureContrast(fg: string, bg: string, min = MIN_RATIO): string {
  if (contrast(fg, bg) >= min) return fg;
  const target = luminance(bg) < 0.2 ? 255 : 0;
  const from = rgb(fg);
  for (let step = 1; step <= 100; step++) {
    const mixed = toHex(from.map((v) => v + ((target - v) * step) / 100));
    if (contrast(mixed, bg) >= min) return mixed;
  }
  return toHex([target, target, target]);
}

/** Raise Shiki's inline token colors to ≥4.5:1: `color` is the light theme, `--shiki-dark` the dark one. */
export function remapShikiStyle(style: string): string {
  return style
    .replace(/(^|;)(\s*color:\s*)(#[0-9a-f]{6})\b/gi, (_, sep, prop, hex) => sep + prop + ensureContrast(hex, CODE_BG_LIGHT))
    .replace(/(--shiki-dark:\s*)(#[0-9a-f]{6})\b/gi, (_, prop, hex) => prop + ensureContrast(hex, CODE_BG_DARK));
}
