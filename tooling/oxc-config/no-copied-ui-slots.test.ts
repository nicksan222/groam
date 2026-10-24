import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vite-plus/test';
import { patternDefinitions } from './plugin/patterns.ts';

const uiSource = join(import.meta.dirname, '../../packages/ui/src');
const staticSlot = /data-slot=(?:"([^"]+)"|'([^']+)'|\{\s*["'`]([^"'`$]+)["'`]\s*\})/g;

/** Every literal `data-slot` a @groam/ui component renders (tests excluded). */
function uiSlots(directory: string, found = new Set<string>()): Set<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') uiSlots(path, found);
    } else if (path.endsWith('.tsx') && !path.endsWith('.test.tsx')) {
      for (const match of readFileSync(path, 'utf8').matchAll(staticSlot))
        found.add(match[1] ?? match[2] ?? match[3] ?? '');
    }
  }
  return found;
}

// The rule lists exact slot names, so it cannot drift from the primitives it protects.
test('no-copied-ui-slots lists exactly the data-slot names in packages/ui', () => {
  const rule = patternDefinitions.find(({ name }) => name === 'no-copied-ui-slots');
  const listed = rule?.pattern.match(/\(\?:([a-z0-9|-]+)\)/)?.[1]?.split('|') ?? [];
  const actual = [...uiSlots(uiSource)].toSorted();

  expect(actual.length).toBeGreaterThan(100);
  expect(
    listed.toSorted(),
    'Update the alternation in plugin/patterns/no-copied-ui-slots.json to the sorted slot names of packages/ui'
  ).toEqual(actual);
});
