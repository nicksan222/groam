import { execFileSync } from 'node:child_process';
import { repoRoot } from '@groam/devkit/repo-root';

export const git = (args: string[]) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

export function assertTestedCommit(sha: string): void {
  if (git(['rev-parse', 'HEAD']).trim() !== sha)
    throw new Error('Deploy checkout does not match the tested commit.');
}

export function assertCleanCheckout(): void {
  const changes = git(['status', '--porcelain']);
  if (changes.trim()) throw new Error(`The deploy checkout has uncommitted changes:\n${changes}`);
}
