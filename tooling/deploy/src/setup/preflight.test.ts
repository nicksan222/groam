import { expect, test } from 'vite-plus/test';
import { collectProblems } from '#src/setup/preflight';

test('reports every failing check at once, by name', async () => {
  const problems = await collectProblems([
    { name: 'Ready', run: () => undefined },
    {
      name: 'Convex variables',
      run: () => {
        throw new Error('The Convex deployment is missing AUTH_EMAIL_RELAY_SECRET.');
      }
    },
    {
      name: 'Web Worker secrets',
      run: () => Promise.reject(new Error('The web Worker is missing AUTH_EMAIL_RELAY_SECRET.'))
    }
  ]);
  expect(problems).toEqual([
    'Convex variables: The Convex deployment is missing AUTH_EMAIL_RELAY_SECRET.',
    'Web Worker secrets: The web Worker is missing AUTH_EMAIL_RELAY_SECRET.'
  ]);
});
