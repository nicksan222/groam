import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/** Upload Build Output API files using the same prebuilt REST flow as the Vercel client. */
export async function publishVercel(
  directory: string,
  token: string,
  request: typeof fetch = fetch
) {
  const { orgId, projectId } = JSON.parse(
    readFileSync(join(directory, '.vercel/project.json'), 'utf8')
  ) as { orgId: string; projectId: string };
  if (!token.trim()) throw new Error('VERCEL_TOKEN is required.');
  const query = new URLSearchParams({ teamId: orgId });
  const call = async (path: string, options: RequestInit = {}) => {
    const response = await request(`https://api.vercel.com${path}`, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000)
    });
    if (!response.ok)
      throw new Error(`Vercel ${options.method ?? 'GET'} failed (${response.status}).`);
    return response;
  };
  const projectResponse = await call(`/v9/projects/${projectId}?${query}`);
  const project = (await projectResponse.json()) as { name: string };
  if (!project.name) throw new Error('Vercel project has no name.');
  const output = join(directory, '.vercel/output');
  const files = readdirSync(output, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const path = join(entry.parentPath, entry.name);
      const data = readFileSync(path);
      return {
        file: relative(directory, path).replaceAll('\\', '/'),
        sha: createHash('sha1').update(data).digest('hex'),
        size: data.byteLength,
        data
      };
    });
  for (let offset = 0; offset < files.length; offset += 4) {
    await Promise.all(
      files.slice(offset, offset + 4).map(async ({ data, sha }) => {
        await call(`/v2/files?${query}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', 'x-vercel-digest': sha },
          body: new Uint8Array(data)
        });
      })
    );
  }
  query.set('prebuilt', '1');
  const created = await call(`/v13/deployments?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: project.name,
      project: projectId,
      target: 'production',
      version: 2,
      files: files.map(({ file, sha, size }) => ({ file, sha, size }))
    })
  });
  let deployment = (await created.json()) as {
    id: string;
    readyState: string;
    url: string;
    aliasError?: unknown;
    aliasAssigned?: boolean | number | null;
  };
  for (let attempt = 0; attempt < 120; attempt++) {
    if (deployment.aliasError) throw new Error('Vercel could not assign production domains.');
    if (deployment.readyState === 'READY' && deployment.aliasAssigned) {
      return `https://${deployment.url}`;
    }
    if (['ERROR', 'CANCELED'].includes(deployment.readyState))
      throw new Error(`Vercel deployment ${deployment.id} ${deployment.readyState}.`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const response = await call(`/v13/deployments/${deployment.id}?teamId=${orgId}`);
    deployment = (await response.json()) as typeof deployment;
  }
  throw new Error(`Vercel deployment ${deployment.id} did not become ready in time.`);
}

if (import.meta.main) {
  const directory = process.argv[2];
  if (!directory) throw new Error('Usage: publish-vercel.ts <staging directory> (token on stdin)');
  console.log(await publishVercel(directory, readFileSync(0, 'utf8').trim()));
}
