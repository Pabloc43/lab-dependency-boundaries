import assert from 'node:assert/strict';
import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import typescript from 'shiki/langs/typescript.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import darkPlus from 'shiki/themes/dark-plus.mjs';
import type { HighlightedCode } from '../src/ui/code-types.ts';

export const codeBackground = '#142733';

function rgb(color: string): number[] {
  assert.match(color, /^#[0-9a-f]{6}$/i, 'Expected a six-digit theme color');
  return [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
}

function luminance(color: string): number {
  const channels = rgb(color).map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function contrastRatio(foreground: string, background = codeBackground): number {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function readableColor(original: string): string {
  const channels = rgb(original);
  // Keep Dark+ hues, lightening only tokens below AA contrast on the actual code background.
  for (let step = 0; step <= 255; step += 1) {
    const color =
      '#' +
      channels
        .map((value) =>
          Math.round(value + ((255 - value) * step) / 255)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('');
    if (contrastRatio(color) >= 4.5) {
      return color;
    }
  }
  throw new Error('Could not produce a readable token color');
}

export async function createCodeHighlighter() {
  const highlighter = await createHighlighterCore({
    themes: [darkPlus],
    langs: [typescript, javascript, json],
    engine: createJavaScriptRegexEngine(),
  });
  return {
    highlight(source: string, language: HighlightedCode['language']): HighlightedCode {
      const result = highlighter.codeToTokens(source, {
        lang: language,
        theme: 'dark-plus',
      });
      const endings = source.match(/\r\n|\n|\r/g) ?? [];
      const lines = result.tokens.map((tokens, index) => ({
        tokens: tokens.map(({ content, color }) => ({
          content,
          color: readableColor(color ?? result.fg ?? '#d4d4d4'),
        })),
        ending: endings[index] ?? '',
      }));
      const reconstructed = lines
        .map(
          ({ tokens, ending }) => tokens.map(({ content }) => content).join('') + ending,
        )
        .join('');
      assert.equal(
        reconstructed,
        source,
        'Highlighting must preserve the exact source text',
      );
      assert.ok(
        lines.every(({ tokens }) =>
          tokens.every(({ color }) => contrastRatio(color) >= 4.5),
        ),
      );
      return { source, language, lines };
    },
    dispose: () => highlighter.dispose(),
  };
}
