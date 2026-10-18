import { join } from 'node:path';
import schema from '@groam/backend/convex/schema';
import { assertLocalDevelopmentUrl } from './backend-session';
import { componentResetTargets } from './local-reset-targets';
import { readLocalConvexCredentials } from './read-local-convex-credentials';
import { replaceLocalConvexTable } from './replace-local-convex-table';

export type ComponentResetResult = {
  imported: number;
};

export async function resetLocalDevelopmentData(convexUrl: string): Promise<ComponentResetResult> {
  assertLocalDevelopmentUrl(convexUrl, 'Convex URL');
  const root = join(import.meta.dirname, '../../../..');
  const credentials = readLocalConvexCredentials(root, convexUrl);
  const targets = [
    ...Object.keys(schema.tables).map((table) => ({ component: '', table })),
    ...componentResetTargets
  ];
  // Reuse Convex bulk replacement for root tables too: no single-mutation read limit.
  for (let offset = 0; offset < targets.length; offset += 8) {
    await Promise.all(
      targets
        .slice(offset, offset + 8)
        .map((target) => replaceLocalConvexTable(credentials, target))
    );
  }
  return { imported: targets.length };
}
