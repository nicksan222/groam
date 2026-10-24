import { describe, expect, test } from 'vite-plus/test';
import { lintFixture } from './fixture.ts';

const restricted = (source: string, file: string) =>
  lintFixture(`${source}\nexport const used = [value];`, file, 'no-restricted-imports').status ===
  1;

describe('import boundaries', () => {
  test('rejects parent-directory imports everywhere', () => {
    for (const file of [
      'apps/web/src/features/trips/hooks/use-trips.ts',
      'packages/backend/convex/modules/trips/index.ts',
      'apps/web/pages/(workspace)/dashboard.tsx'
    ]) {
      expect(restricted("import { value } from '../sections';", file)).toBe(true);
      expect(restricted("import { value } from '../../shared/sections';", file)).toBe(true);
    }
    expect(
      restricted("import { value } from './sections';", 'apps/web/src/features/trips/view.ts')
    ).toBe(false);
  });

  test('lets the backend import only the deployment variables from @groam/env', () => {
    const file = 'packages/backend/convex/convex.config.ts';
    expect(restricted("import { value } from '@groam/env/deployment';", file)).toBe(false);
    expect(restricted("import { value } from '@groam/env/seeder';", file)).toBe(true);
    expect(restricted("import { value } from '@groam/env';", file)).toBe(true);
    expect(
      restricted("import { value } from '@groam/env/seeder';", 'tooling/seeder/src/seed.ts')
    ).toBe(false);
  });

  test('keeps web pages composing feature views', () => {
    const page = 'apps/web/pages/(workspace)/trip-index.tsx';
    for (const allowed of [
      '@/features/dashboard/dashboard-view',
      '@/lib/navigation/router',
      '@/app-layout',
      '@groam/ai/ui',
      '@groam/env/web-client'
    ])
      expect(restricted(`import { value } from '${allowed}';`, page)).toBe(false);
    for (const rejected of [
      '@groam/ui/components/button',
      '@groam/ai/ui/context/agent-context',
      'react',
      './local-view'
    ])
      expect(restricted(`import { value } from '${rejected}';`, page)).toBe(true);
  });
});
