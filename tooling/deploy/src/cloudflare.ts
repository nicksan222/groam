import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { siteDirectories } from './release';
import type { ProductionTarget } from './target';

export const cloudflareDirectory = 'dist/cloudflare';

/** Assemble one atomic asset upload; credentials are never part of this directory. */
export function prepareCloudflare(root: string, target: ProductionTarget): void {
  if (!target.cloudflareAccountId)
    throw new Error('Configure CLOUDFLARE_ACCOUNT_ID before building.');
  const directory = join(root, cloudflareDirectory);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(join(directory, 'assets'), { recursive: true });
  cpSync(join(root, siteDirectories.landing), join(directory, 'assets'), { recursive: true });
  cpSync(join(root, siteDirectories.web), join(directory, 'assets/app'), { recursive: true });
  cpSync(join(root, 'tooling/deploy/src/cloudflare-worker.ts'), join(directory, 'worker.ts'));
  writeFileSync(
    join(directory, 'wrangler.json'),
    JSON.stringify(
      {
        name: target.cloudflareWorkerName,
        account_id: target.cloudflareAccountId,
        main: './worker.ts',
        compatibility_date: '2026-10-20',
        workers_dev: true,
        preview_urls: false,
        assets: {
          directory: './assets',
          binding: 'ASSETS',
          run_worker_first: true,
          not_found_handling: 'none',
          html_handling: 'none'
        }
      },
      null,
      2
    ) + '\n'
  );
}
