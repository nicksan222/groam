import { describe, expect, test } from 'vite-plus/test';
import { inspectFile } from './conventions';

const file = 'apps/landing/src/components/example.astro';
const violations = (source: string, path = file) =>
  inspectFile(path, source).filter((finding) => finding.category === 'raw-astro-icons');

describe('Astro icon boundary', () => {
  test.each([
    '<svg viewBox="0 0 24 24"><path /></svg>',
    '<svg\n aria-hidden="true"\n/>',
    "---\nimport { Check } from 'lucide-react';\n---",
    "---\nexport { Check } from 'lucide-react/dist/esm/icons/check';\n---",
    "---\nconst icons = import('@heroicons/react/24/outline');\n---"
  ])('rejects raw icons: %s', (source) => {
    expect(violations(source)).toEqual([{ category: 'raw-astro-icons', location: file }]);
  });

  test.each([
    '---\nimport Icon from \'@groam/icons/astro\';\n---\n<Icon name="check" />',
    '<svg data-illustration viewBox="0 0 640 260"><path /></svg>'
  ])('allows owned icons and marked illustrations: %s', (source) => {
    expect(violations(source)).toEqual([]);
  });

  test('allows implementations inside the icon and brand packages', () => {
    for (const path of ['packages/icons/src/icon.astro', 'packages/brand/src/mark.astro']) {
      expect(violations('<svg />', path)).toEqual([]);
    }
  });

  test('an illustration does not exempt other SVGs in the same template', () => {
    expect(violations('<svg data-illustration /><svg />')).toHaveLength(1);
  });
});
