import { afterAll, describe, expect, it } from 'vitest';
import { createCodeHighlighter, contrastRatio } from '../scripts/highlight';
const highlighter = await createCodeHighlighter();
afterAll(() => highlighter.dispose());
describe('build-time highlighting', () => {
  it.each([
    '',
    'const value = 1;\n',
    '\tconst value = "<script>";\r\n\r\n',
    'interface Item { price: number }\nconst total = (item: Item) => item.price < 20;\n',
  ])('preserves exact text and safe literal content %j', (source) => {
    const highlighted = highlighter.highlight(source, 'typescript');
    expect(
      highlighted.lines
        .map(
          ({ tokens, ending }) => tokens.map(({ content }) => content).join('') + ending,
        )
        .join(''),
    ).toBe(source);
    expect(
      highlighted.lines
        .flatMap(({ tokens }) => tokens)
        .every(({ color }) => contrastRatio(color) >= 4.5),
    ).toBe(true);
  });
  it('uses distinct editor colors for typed source', () => {
    const { lines } = highlighter.highlight(
      'interface Product { price: number }\nconst total = (item: Product) => "USD" + item.price;',
      'typescript',
    );
    expect(
      new Set(lines.flatMap(({ tokens }) => tokens.map(({ color }) => color))).size,
    ).toBeGreaterThan(3);
  });
  it('highlights the real JSON report format', () => {
    const source = JSON.stringify(
      [{ rule: 'no-circular', from: 'a.ts', to: 'b.ts' }],
      null,
      2,
    );
    expect(highlighter.highlight(source, 'json').source).toBe(source);
  });
});
