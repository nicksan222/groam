import {
  existsSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vite-plus/test';
import {
  checkRole,
  checkSharedSkill,
  renderClaudeAgent,
  renderCodexAgent,
  syncAdapters,
  splitFrontmatter,
  danglingReferences,
  relativeLinks,
  repoPathMentions,
  checkMcpConfig,
  checkSettings,
  checkBuildArgs,
  checkDockerPins,
  justRecipes
} from './agent-tooling';

const role = { name: 'reviewer', description: 'Review a bounded change.', 'read-only': true };
const targets = {
  agents: new Set(['reviewer']),
  skills: new Set(['seed']),
  recipes: new Set(['check']),
  scripts: new Set(['test'])
};

describe('portable agent tooling', () => {
  test('validates roles without a fixed roster or provider models', () => {
    expect(
      checkRole(
        'r.md',
        'new-role',
        { frontmatter: { ...role, name: 'new-role' }, body: 'Inspect source.' },
        targets
      )
    ).toEqual([]);
    expect(
      checkRole(
        'r.md',
        'reviewer',
        { frontmatter: { ...role, 'read-only': 'yes', skills: ['missing'] }, body: ' ' },
        targets
      ).map((x) => x.message)
    ).toEqual([
      'read-only must be true or false',
      'skills: no .agents/skills/missing/SKILL.md',
      'the role body is empty'
    ]);
  });

  test('validates the shared skill contract without a Claude tool/model allowlist', () => {
    expect(
      checkSharedSkill('s', 'seed', {
        name: 'seed',
        description: 'Seed local fixtures.',
        metadata: { owner: 'backend' },
        'allowed-tools': 'FutureTool'
      })
    ).toEqual([]);
    expect(checkSharedSkill('s', 'seed', { name: 'other', description: '' })).toHaveLength(2);
    expect(checkSharedSkill('s', 'Bad Name', { name: 'Bad Name', description: 'x' })).toHaveLength(
      1
    );
    expect(
      checkSharedSkill('s', 'seed', { name: 'seed', description: 'x'.repeat(1025) })
    ).toHaveLength(1);
  });

  test('adapters inherit models and refer to the canonical role', () => {
    const claude = renderClaudeAgent(role);
    const codex = renderCodexAgent(role);
    expect(claude).toContain('disallowedTools: Edit, Write, NotebookEdit, Agent');
    expect(claude).toContain('.agents/roles/reviewer.md');
    expect(codex).toContain('developer_instructions = ');
    expect(codex).toContain('.agents/roles/reviewer.md');
    expect(claude).not.toMatch(/^model:/m);
    expect(codex).not.toMatch(/^model\s*=/m);
    expect(renderClaudeAgent({ ...role, 'read-only': false })).toContain('disallowedTools: Agent');
  });

  test('escapes descriptions and names safely in adapters', () => {
    const text = renderCodexAgent({ ...role, description: 'Say "hello"\nthen \\ inspect.' });
    expect(text).toContain('description = "Say \\"hello\\"\\nthen \\\\ inspect."');
  });

  test('sync creates links/wrappers once, detects drift, and preserves foreign files', () => {
    const root = mkdtempSync(join(tmpdir(), 'groam-agents-'));
    try {
      mkdirSync(join(root, '.agents/skills/seed'), { recursive: true });
      writeFileSync(
        join(root, '.agents/skills/seed/SKILL.md'),
        '---\nname: seed\ndescription: Seed.\n---\n'
      );
      mkdirSync(join(root, '.claude/agents'), { recursive: true });
      writeFileSync(join(root, '.claude/agents/personal.md'), 'Keep me.');
      const roles = [role];
      expect(syncAdapters(root, roles, ['seed'], false).length).toBeGreaterThan(0);
      expect(syncAdapters(root, roles, ['seed'], true)).toEqual([]);
      expect(syncAdapters(root, roles, ['seed'], false)).toEqual([]);
      expect(readFileSync(join(root, '.claude/skills/seed/SKILL.md'), 'utf8')).toContain(
        'name: seed'
      );
      expect(readFileSync(join(root, '.claude/agents/personal.md'), 'utf8')).toBe('Keep me.');
      writeFileSync(
        join(root, '.codex/agents/reviewer.toml'),
        renderCodexAgent(role) + '# stale\n'
      );
      expect(syncAdapters(root, roles, ['seed'], false)).toHaveLength(1);
      expect(syncAdapters(root, roles, ['seed'], true)).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('sync refuses to overwrite skill copies or links to a different source', () => {
    const root = mkdtempSync(join(tmpdir(), 'groam-agents-'));
    try {
      mkdirSync(join(root, '.claude/skills/seed'), { recursive: true });
      writeFileSync(join(root, '.claude/skills/seed/private.txt'), 'Keep me.');
      expect(syncAdapters(root, [], ['seed'], true)[0]?.message).toContain('refusing');
      expect(readFileSync(join(root, '.claude/skills/seed/private.txt'), 'utf8')).toBe('Keep me.');
      rmSync(join(root, '.claude/skills/seed'), { recursive: true });
      symlinkSync('../../elsewhere', join(root, '.claude/skills/seed'));
      expect(syncAdapters(root, [], ['seed'], true)[0]?.message).toContain('refusing');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test('sync preserves conflicting native agents and never writes through symlinks', () => {
    const root = mkdtempSync(join(tmpdir(), 'groam-agents-'));
    try {
      mkdirSync(join(root, '.codex/agents'), { recursive: true });
      const agent = join(root, '.codex/agents/reviewer.toml');
      const privateFile = join(root, 'private.toml');
      writeFileSync(privateFile, 'private');
      symlinkSync(privateFile, agent);
      expect(syncAdapters(root, [role], [], true).some((f) => f.message.includes('refusing'))).toBe(
        true
      );
      expect(readFileSync(privateFile, 'utf8')).toBe('private');
      rmSync(agent);
      writeFileSync(agent, 'user agent');
      expect(syncAdapters(root, [role], [], true).some((f) => f.message.includes('refusing'))).toBe(
        true
      );
      expect(readFileSync(agent, 'utf8')).toBe('user agent');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  for (const linkedParent of ['.codex', '.claude', '.claude/agents', '.claude/skills', '.github']) {
    test(`sync refuses linked parent ${linkedParent} before any writes`, () => {
      const root = mkdtempSync(join(tmpdir(), 'groam-agents-'));
      const outside = mkdtempSync(join(tmpdir(), 'groam-external-'));
      try {
        writeFileSync(join(root, 'AGENTS.md'), '# Shared instructions\n');
        mkdirSync(join(root, '.agents/skills/seed'), { recursive: true });
        mkdirSync(join(root, linkedParent, '..'), { recursive: true });
        symlinkSync(outside, join(root, linkedParent));
        const findings = syncAdapters(root, [role], ['seed'], true);
        expect(findings.some((finding) => finding.message.includes('refusing'))).toBe(true);
        expect(readdirSync(outside)).toEqual([]);
        expect(existsSync(join(root, 'CLAUDE.md'))).toBe(false);
      } finally {
        rmSync(root, { recursive: true, force: true });
        rmSync(outside, { recursive: true, force: true });
      }
    });
  }

  test('validates command and role references against current repository names', () => {
    expect(
      danglingReferences(
        'AGENTS.md',
        'Run `just removed` and `vp run deleted`; use the `gone` skill and subagent `absent`.',
        targets
      ).map((x) => x.message)
    ).toEqual([
      'just removed: no such Justfile recipe',
      'vp run deleted: no such script in package.json',
      'skill gone: no .agents/skills/gone/SKILL.md',
      'subagent absent: no .agents/roles/absent.md'
    ]);
    expect(
      danglingReferences('AGENTS.md', 'Run `just check`; use the `seed` skill.', targets)
    ).toEqual([]);
    expect(justRecipes('check:\n    true\nquery name="x": check\nalias c := check\n')).toEqual([
      'check',
      'query',
      'c'
    ]);
  });

  test('extracts markdown links and paths without confusing snippets with prose', () => {
    expect(splitFrontmatter('---\nname: x\n---\nBody')?.body).toBe('Body');
    expect(relativeLinks('[x](reference/a.md#part) [y](https://example.com) `link`')).toEqual([
      'reference/a.md'
    ]);
    expect(
      repoPathMentions(
        'Read `.agents/roles/reviewer.md` and `apps/web`; `@groam/env/*` is an alias.',
        new Set(['.agents', 'apps'])
      )
    ).toEqual(['.agents/roles/reviewer.md', 'apps/web']);
  });

  test('retains MCP, plugin, and container validation without crashing on invalid objects', () => {
    expect(checkMcpConfig('mcp', { mcpServers: { x: null } })).toHaveLength(1);
    expect(checkMcpConfig('mcp', { mcpServers: { x: { command: 'vp', args: ['exec'] } } })).toEqual(
      []
    );
    expect(checkSettings('settings', null)).toHaveLength(1);
    expect(checkDockerPins('Dockerfile', 'ARG TOOL_VERSION=latest')).toHaveLength(1);
    expect(
      checkBuildArgs(
        'devcontainer',
        { build: { args: { TOOL_VERSION: '2' } } },
        'ARG TOOL_VERSION=1'
      )
    ).toHaveLength(1);
  });
});
