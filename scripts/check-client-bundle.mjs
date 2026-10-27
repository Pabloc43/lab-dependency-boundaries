import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const files = readdirSync('dist/assets');
assert.ok(
  files.some((file) => file.endsWith('.js')),
  'Expected a built client entry',
);
for (const file of files) {
  assert.ok(!/shiki|onig|\.wasm$/i.test(file), `Unexpected highlighter asset: ${file}`);
  if (file.endsWith('.js')) {
    assert.ok(
      !/shikijs|oniguruma|createHighlighter|WebAssembly|onig\.wasm/i.test(
        readFileSync(`dist/assets/${file}`, 'utf8'),
      ),
      `Unexpected runtime highlighter code: ${file}`,
    );
  }
}
console.log('Client assets contain no Shiki runtime chunks or WASM.');
