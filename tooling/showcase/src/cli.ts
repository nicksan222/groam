import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { env } from '@groam/env/showcase';
import { video } from '#showcase';
import { recordScenario } from '#src/capture/record';
import { createEdit } from '#src/edit';
import { captureSchema, projectSchema } from '#src/model';
import { artifactsDir, publicDir } from '#src/paths';

async function saveJson(path: string, data: unknown) {
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
  await rename(temporary, path);
}

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      draft: { type: 'boolean', default: false },
      help: { type: 'boolean', default: false }
    }
  });
  const [command = 'help', ...extra] = positionals;
  if (values.help || command === 'help') {
    console.info(
      'Showcase: capture | edit | render [--draft] | all [--draft]\nCapture needs a running, seeded local Groam app. See tooling/showcase/README.md.'
    );
    return;
  }
  if (extra.length || !['capture', 'edit', 'render', 'all'].includes(command))
    throw new Error('Unknown command. Run with --help.');
  await mkdir(publicDir, { recursive: true });
  await mkdir(artifactsDir, { recursive: true });
  const capturePath = join(artifactsDir, 'capture.json');
  const projectPath = join(publicDir, 'showcase.json');
  if (command === 'capture' || command === 'all') {
    const capture = await recordScenario(video, {
      baseUrl: env.baseUrl,
      headed: env.headed,
      publicDir
    });
    await saveJson(capturePath, capture);
    console.info(`Capture saved: ${capturePath}`);
  }
  if (['capture', 'edit', 'all'].includes(command)) {
    const capture = captureSchema.parse(JSON.parse(await readFile(capturePath, 'utf8')));
    await saveJson(projectPath, projectSchema.parse({ capture, edit: createEdit(capture, video) }));
    console.info('Edit ready. Open showcase:studio or render the film.');
  }
  if (command === 'render' || command === 'all') {
    const project = projectSchema.parse(JSON.parse(await readFile(projectPath, 'utf8')));
    const { renderProject } = await import('#src/render');
    await renderProject(project, Boolean(values.draft));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
