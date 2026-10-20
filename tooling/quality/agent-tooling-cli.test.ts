import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vite-plus/test';

const checker = resolve('tooling/quality/check-agent-tooling.ts');

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'groam-agent-cli-'));
  for (const directory of ['.agents/roles', '.agents/skills/seed/references'])
    mkdirSync(join(root, directory), { recursive: true });
  for (const [file, content] of Object.entries({
    'AGENTS.md': '# Shared instructions\n',
    '.agents/README.md': '# Maintenance\n',
    Justfile: 'check:\n    true\n',
    'package.json': JSON.stringify({ scripts: { test: 'true' } }),
    'skills-lock.json': JSON.stringify({ version: 1, skills: {} }),
    '.agents/roles/reviewer.md':
      '---\nname: reviewer\ndescription: Review.\nread-only: true\n---\nInspect current source.\n',
    '.agents/skills/seed/SKILL.md':
      '---\nname: seed\ndescription: Seed local fixtures.\n---\nInspect source before changing data.\n'
  }))
    writeFileSync(join(root, file), content);
  return root;
}

function run(root: string, ...args: string[]) {
  const result = spawnSync('bun', [checker, ...args], { cwd: root, encoding: 'utf8' });
  if (result.error) throw result.error;
  return result;
}

describe('agent tooling CLI', () => {
  test('bootstraps adapters and entrypoint symlinks, then validates without writes', () => {
    const root = fixture();
    try {
      expect(run(root).status).toBe(1);
      expect(run(root, '--sync').status).toBe(0);
      expect(readlinkSync(join(root, '.github/copilot-instructions.md'))).toBe('../AGENTS.md');
      expect(readlinkSync(join(root, 'CLAUDE.md'))).toBe('AGENTS.md');
      expect(readlinkSync(join(root, '.claude/skills/seed'))).toBe('../../.agents/skills/seed');
      const original = readFileSync(join(root, '.codex/agents/reviewer.toml'), 'utf8');
      expect(run(root).status).toBe(0);
      expect(readFileSync(join(root, '.codex/agents/reviewer.toml'), 'utf8')).toBe(original);
      mkdirSync(join(root, '.cursor'));
      writeFileSync(join(root, '.cursor/settings.json'), '{}');
      writeFileSync(join(root, '.codex/config.toml'), '# Personal harness settings\n');
      expect(run(root).status).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('catches stale commands in local supporting Markdown and broken entrypoint links', () => {
    const root = fixture();
    try {
      expect(run(root, '--sync').status).toBe(0);
      const reference = join(root, '.agents/skills/seed/references/workflow.md');
      writeFileSync(reference, 'Run `just removed` and [read this](missing.md).\n');
      const result = run(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('just removed: no such Justfile recipe');
      expect(result.stderr).toContain('link target missing.md does not exist');
      rmSync(reference);
      writeFileSync(join(root, 'AGENTS.md'), '[Missing](missing.md)\n');
      expect(run(root).stderr).toContain('link target missing.md does not exist');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('detects orphaned native role wrappers and skill links after deletion', () => {
    const root = fixture();
    try {
      expect(run(root, '--sync').status).toBe(0);
      rmSync(join(root, '.agents/roles/reviewer.md'));
      rmSync(join(root, '.agents/skills/seed'), { recursive: true });
      const result = run(root);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('adapter has no shared role');
      expect(result.stderr).toContain('broken skill adapter');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
