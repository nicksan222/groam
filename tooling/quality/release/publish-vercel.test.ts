import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { publishVercel } from '@groam/deploy/publish-vercel';
import { afterEach, expect, test, vi } from 'vite-plus/test';

const directories: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'groam-publish-'));
  directories.push(directory);
  mkdirSync(join(directory, '.vercel/output/static'), { recursive: true });
  writeFileSync(join(directory, '.vercel/output/static/index.html'), 'hello');
  writeFileSync(join(directory, '.vercel/output/config.json'), '{"version":3}');
  writeFileSync(
    join(directory, '.vercel/project.json'),
    '{"orgId":"team_test","projectId":"prj_test"}'
  );
  writeFileSync(join(directory, '.env.local'), 'private');
  return directory;
}
function requester(state = 'READY') {
  return vi.fn<typeof fetch>().mockImplementation(async (url) => {
    if (String(url).includes('/v9/projects/')) return Response.json({ name: 'groam' });
    if (String(url).includes('/v2/files')) return Response.json({});
    return Response.json({
      id: 'dpl_test',
      url: 'groam.vercel.app',
      readyState: state,
      aliasAssigned: true
    });
  });
}
test('uploads only prebuilt files then creates a production deployment in the linked project', async () => {
  const request = requester();
  await expect(publishVercel(fixture(), 'private-token', request)).resolves.toBe(
    'https://groam.vercel.app'
  );
  const creation = request.mock.calls.find(([url]) => String(url).includes('/v13/deployments?'));
  expect(String(creation?.[0])).toContain('prebuilt=1');
  const body = JSON.parse(String(creation?.[1]?.body));
  expect(body).toMatchObject({
    name: 'groam',
    project: 'prj_test',
    target: 'production',
    version: 2
  });
  expect(body.files.map((file: { file: string }) => file.file).sort()).toEqual([
    '.vercel/output/config.json',
    '.vercel/output/static/index.html'
  ]);
  expect(JSON.stringify(body)).not.toContain('private-token');
  for (const [, options] of request.mock.calls)
    expect(options?.headers).toMatchObject({ Authorization: 'Bearer private-token' });
});
test('upload failure prevents deployment creation and does not expose the token', async () => {
  const request = requester();
  request.mockImplementation(async (url) =>
    String(url).includes('/v9/projects/')
      ? Response.json({ name: 'groam' })
      : new Response('private-token', { status: 403 })
  );
  await expect(publishVercel(fixture(), 'private-token', request)).rejects.toThrow(
    'Vercel POST failed (403).'
  );
  expect(request.mock.calls.some(([url]) => String(url).includes('/v13/deployments'))).toBe(false);
});
test('failed builds and alias assignment fail the release', async () => {
  await expect(publishVercel(fixture(), 'token', requester('ERROR'))).rejects.toThrow('ERROR');
  const request = requester();
  request.mockImplementation(async (url) =>
    String(url).includes('/v9/projects/')
      ? Response.json({ name: 'groam' })
      : Response.json({ id: 'dpl_test', readyState: 'READY', aliasError: { code: 'failed' } })
  );
  await expect(publishVercel(fixture(), 'token', request)).rejects.toThrow('production domains');
});

test.each([false, true])(
  'waits for production aliases and catches delayed alias failure: %s',
  async (fail) => {
    vi.useFakeTimers();
    const request = requester();
    let statuses = 0;
    request.mockImplementation(async (url) => {
      if (String(url).includes('/v9/projects/')) return Response.json({ name: 'groam' });
      if (String(url).includes('/v2/files')) return Response.json({});
      statuses++;
      return Response.json({
        id: 'dpl_test',
        url: 'groam.vercel.app',
        readyState: 'READY',
        aliasAssigned: statuses > 1 && !fail,
        aliasError: statuses > 1 && fail ? { code: 'failed' } : null
      });
    });
    const published = publishVercel(fixture(), 'token', request).then(
      (value) => ({ value, error: null }),
      (error: Error) => ({ value: null, error })
    );
    await vi.runAllTimersAsync();
    const result = await published;
    if (fail) expect(result.error?.message).toContain('production domains');
    else expect(result.value).toBe('https://groam.vercel.app');
    expect(statuses).toBe(2);
  }
);
