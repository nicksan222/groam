import path from 'node:path';

const resolve = (file: string) => path.join(import.meta.dirname, file);

export const setupFiles = {
  consoleGuard: resolve('console-guard/setup.ts'),
  fakeScheduler: resolve('fake-scheduler.ts')
};
