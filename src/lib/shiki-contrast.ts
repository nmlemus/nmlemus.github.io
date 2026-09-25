import { remapShikiStyle } from './contrast.ts';

type HastElement = { properties?: Record<string, unknown> };

const fix = (node: HastElement) => {
  const style = node.properties?.style;
  if (typeof style === 'string') node.properties!.style = remapShikiStyle(style);
};

/** Shiki transformer: the stock Solarized themes have comment/accent colors below 4.5:1 (spec §6). */
export const contrastTransformer = {
  name: 'wcag-contrast',
  pre: fix,
  span: fix,
};
