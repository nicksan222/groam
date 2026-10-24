import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './fixture.ts';

function lint(source: string, file = 'apps/web/src/features/example/example-panel.tsx') {
  return lintFixture(source, file);
}

// Pattern rules are tested by their own examples (patterns.test.ts).
describe('internal anchors', () => {
  test('uses router links for internal anchors', () => {
    const interpolation = ['$', '{tripId}'].join('');
    for (const href of ['"/trips"', "'/trips'", "{'/trips'}", `{\`/trips/${interpolation}\`}`]) {
      const result = lint(`export const view = <a href=${href}>Trips</a>;`);
      expect(result.status).toBe(1);
      expect(result.output).toContain('Use Link from @/lib/navigation/router');
    }
  });

  test('allows external, fragment, and protocol-relative anchors', () => {
    for (const href of ['"https://groam.example"', '"#details"', '"//cdn.example/file"']) {
      expect(lint(`export const view = <a href=${href}>Open</a>;`).status).toBe(0);
    }
  });
});
