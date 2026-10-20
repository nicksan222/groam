import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './lint-fixture.ts';

const file = 'apps/web/src/features/example/icons.tsx';

describe('shared icon boundary', () => {
  test.each([
    "import { Check } from 'lucide-react'; export { Check };",
    "import type { LucideIcon } from 'lucide-react'; export type Icon = LucideIcon;",
    "export { Check } from 'lucide-react/dist/esm/icons/check';",
    "export * from '@heroicons/react/24/outline';",
    "export const icons = import('react-icons/fi');",
    "export const icons = require('@tabler/icons-react');",
    "export { FontAwesomeIcon } from '@fortawesome/react-fontawesome';",
    'export const icon = \'<svg viewBox="0 0 24 24"></svg>\';',
    'export const icon = `<svg viewBox="0 0 24 24">${path}</svg>`;',
    "export { Heart } from '@phosphor-icons/react';",
    "export { CheckIcon } from '@radix-ui/react-icons';",
    'export const icon = <svg viewBox="0 0 24 24"><path d="M1 1" /></svg>;'
  ])('rejects raw icon usage: %s', (source) => {
    const result = lintFixture(source, file);
    expect(result.output).toContain('groam(no-raw-icons)');
    expect(result.output).toContain('Import icons and icon types from @groam/icons');
  });

  test.each([
    'packages/ui/src/components/example.tsx',
    'packages/ai/src/ui/example.tsx',
    'packages/brand/src/example.tsx',
    'apps/landing/src/scripts/example.tsx',
    'apps/web/src/features/example/icons.test.tsx'
  ])('enforces the boundary in every consumer, including tests: %s', (path) => {
    const result = lintFixture("export { Check } from 'lucide-react';", path);
    expect(result.output).toContain('groam(no-raw-icons)');
  });

  test.each([
    ["export { Check } from '@groam/icons';", file],
    ["export type { Icon } from '@groam/icons';", file],
    ["export { reactionIcons } from '@groam/icons/markup';", 'apps/landing/src/scripts/example.ts'],
    ["export { Check } from 'lucide-react';", 'packages/icons/src/index.ts'],
    ['export const mark = <svg />;', 'packages/brand/src/brand-mark.tsx'],
    ["export { Dialog } from '@radix-ui/react-dialog';", file]
  ])('allows owned icons and unrelated libraries: %s', (source, path) => {
    expect(lintFixture(source, path).output).not.toContain('groam(no-raw-icons)');
  });
});
