import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDirectory = resolve(import.meta.dirname, '../convex/components/better-auth');
const scriptPath = fileURLToPath(import.meta.url);

if (!process.argv.includes('--in-place')) {
  const result = spawnSync(process.execPath, [scriptPath, '--in-place'], {
    cwd: outputDirectory,
    stdio: 'inherit'
  });
  process.exit(result.status ?? 1);
}

const { auth } = await import('@groam/backend/auth-schema');
const database = auth.options.database;

if (typeof database !== 'function') {
  throw new TypeError('Better Auth schema generation requires a database adapter factory.');
}

const adapter = database(auth.options);
if (!adapter.createSchema) {
  throw new TypeError('The Better Auth database adapter does not support schema generation.');
}

const generated = await adapter.createSchema(auth.options, 'generated.ts');
await writeFile(resolve(outputDirectory, generated.path), generated.code);
process.stdout.write('Better Auth schema generated successfully.\n');
