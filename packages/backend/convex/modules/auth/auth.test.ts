import { expect, test } from 'vitest';
import { createTest } from '#testing/factory';

test('does not expose username availability', async () => {
  const response = await createTest().fetch('/api/auth/is-username-available', {
    body: JSON.stringify({ username: 'someone' }),
    headers: {
      'content-type': 'application/json',
      origin: 'http://127.0.0.1:3211'
    },
    method: 'POST'
  });

  expect(response.status).toBe(404);
});
