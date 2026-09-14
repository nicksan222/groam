import { execFileSync } from 'node:child_process';
import { isConvexBackendResponding } from '@groam/devkit/wait-for-backend';

export const isLocalBackendRunning = isConvexBackendResponding;

export const localBackendProcessIds = (
  processList: string,
  backendUrl: string,
  projectRoot: string
): number[] => {
  const port = new URL(backendUrl).port;
  const localStatePath = `${projectRoot.replace(/\/$/u, '')}/.convex/local/`;
  return processList.split('\n').flatMap((line) => {
    const match = /^\s*(\d+)\s+(.+)$/u.exec(line);
    if (!match) return [];
    const [, pid, command] = match;
    return command?.includes('convex-local-backend') &&
      command.includes(`--port ${port}`) &&
      command.includes(localStatePath)
      ? [Number(pid)]
      : [];
  });
};

export const stopLocalBackend = async (
  backendUrl: string,
  projectRoot: string,
  options: {
    fetchBackend?: (input: string | URL, init?: RequestInit) => Promise<Response>;
    killProcess?: (pid: number, signal: NodeJS.Signals) => void;
    listProcesses?: () => string;
    wait?: (milliseconds: number) => Promise<void>;
  } = {}
): Promise<boolean> => {
  const fetchBackend = options.fetchBackend ?? fetch;
  const killProcess = options.killProcess ?? process.kill;
  const listProcesses =
    options.listProcesses ??
    (() => execFileSync('ps', ['-A', '-o', 'pid=,command='], { encoding: 'utf8' }));
  const wait = options.wait ?? ((milliseconds) => Bun.sleep(milliseconds));
  const processIds = localBackendProcessIds(listProcesses(), backendUrl, projectRoot);
  if (processIds.length === 0) return !(await isLocalBackendRunning(backendUrl, fetchBackend));

  for (const pid of processIds) killProcess(pid, 'SIGTERM');
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!(await isLocalBackendRunning(backendUrl, fetchBackend))) return true;
    await wait(100);
  }

  for (const pid of processIds) {
    try {
      killProcess(pid, 'SIGKILL');
    } catch {
      // The backend may have exited between the final probe and forced shutdown.
    }
  }
  await wait(100);
  return !(await isLocalBackendRunning(backendUrl, fetchBackend));
};
