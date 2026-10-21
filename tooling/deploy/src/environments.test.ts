import { expect, test } from 'vite-plus/test';
import { environments } from '#src/environments';

test('every committed environment uses its own Workers and origins', () => {
  const settings = Object.values(environments);
  const frontends = settings.flatMap(({ web, landing }) => [web, landing]);
  expect(new Set(frontends.map(({ worker }) => worker)).size).toBe(frontends.length);
  expect(new Set(frontends.map(({ host }) => host)).size).toBe(frontends.length);
});
