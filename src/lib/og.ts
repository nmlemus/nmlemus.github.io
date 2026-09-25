import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

type Node = { type: string; props: { style: Record<string, unknown>; children?: unknown } };
const el = (style: Record<string, unknown>, children?: unknown): Node => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

let fonts: Promise<[Buffer, Buffer]> | undefined;
function loadFonts() {
  const dir = join(process.cwd(), 'src/assets/og-fonts');
  fonts ??= Promise.all([readFile(join(dir, 'meslo-regular.ttf')), readFile(join(dir, 'meslo-bold.ttf'))]);
  return fonts;
}

/** 1200x630 Open Graph card in the site's terminal style. */
export async function renderOgPng(title: string, dir: string): Promise<Uint8Array> {
  const [regular, bold] = await loadFonts();
  const seg = (text: string, bg: string, color: string) => el({ background: bg, color, padding: '0 14px', height: 44, alignItems: 'center' }, text);
  const arrow = (color: string, bg: string) => el({ color, background: bg, height: 44, alignItems: 'center' }, '');
  const card = el(
    { width: 1200, height: 630, flexDirection: 'column', justifyContent: 'space-between', background: '#002b36', padding: '64px 72px', fontFamily: 'Meslo', color: '#93a1a1' },
    [
      el({ alignItems: 'center', fontSize: 26 }, [
        el({ color: '#6c6c6c', marginRight: 6 }, '╭─'),
        seg('', '#303030', '#ffffff'), arrow('#303030', '#5f5fd7'),
        seg(dir, '#5f5fd7', '#ffffff'), arrow('#5f5fd7', '#00af5f'),
        seg(' main', '#00af5f', '#000000'), arrow('#00af5f', '#002b36'),
      ]),
      el({ fontSize: title.length > 60 ? 52 : 64, fontWeight: 700, color: '#eee8d5', lineHeight: 1.2 }, title),
      el({ justifyContent: 'space-between', fontSize: 26 }, [
        el({ color: '#5fd700' }, '❯ Noel Moreno Lemus'),
        el({ color: '#839496' }, 'nmlemus.github.io'),
      ]),
    ],
  );
  const svg = await satori(card as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Meslo', data: regular, weight: 400, style: 'normal' },
      { name: 'Meslo', data: bold, weight: 700, style: 'normal' },
    ],
  });
  return new Uint8Array(new Resvg(svg).render().asPng());
}
