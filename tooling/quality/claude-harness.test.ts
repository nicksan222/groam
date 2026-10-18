import { describe, expect, test } from 'vite-plus/test';
import {
  checkAgent,
  checkBuildArgs,
  checkDockerPins,
  checkMcpConfig,
  checkSettings,
  checkSkill,
  claudeProcessWrapper,
  codeSnippets,
  danglingReferences,
  dockerArgDefaults,
  editingTools,
  justRecipes,
  readOnlyAgents,
  relativeLinks,
  repoPathMentions,
  splitFrontmatter,
  splitToolList,
  toolEntryProblem,
  undocumentedAgents
} from './claude-harness';

const index = { agents: new Set(['qa', 'pm', 'worker']), skills: new Set(['seed-local-data']) };
const targets = {
  ...index,
  recipes: new Set(['check', 'dev']),
  scripts: new Set(['lint', 'seed'])
};
const agent = {
  name: 'qa',
  description: 'Verifies behavior.',
  model: 'sonnet',
  effort: 'medium',
  disallowedTools: 'Agent'
};
const readOnly = { ...agent, name: 'pm', disallowedTools: 'Edit, Write, NotebookEdit, Agent' };

function agentFindings(name: string, frontmatter: Record<string, unknown>, body = 'Do the work.') {
  return checkAgent(`${name}.md`, name, { frontmatter, body }, index);
}

function messages(findings: { message: string }[]): string[] {
  return findings.map((finding) => finding.message);
}

describe('Claude harness checks', () => {
  test('splits frontmatter from the body', () => {
    expect(splitFrontmatter('---\nname: qa\n---\nBody')).toEqual({
      frontmatter: 'name: qa',
      body: 'Body'
    });
    expect(splitFrontmatter('No frontmatter')).toBeNull();
  });

  test('splits tool lists without breaking parenthesised specifiers', () => {
    expect(splitToolList('Read, Agent(worker, qa), Bash(git log *)')).toEqual([
      'Read',
      'Agent(worker, qa)',
      'Bash(git log *)'
    ]);
    expect(splitToolList('Read Grep', /[\s,]/u)).toEqual(['Read', 'Grep']);
    expect(splitToolList(['Read', 'Edit'])).toEqual(['Read', 'Edit']);
    expect(splitToolList(undefined)).toEqual([]);
    expect(splitToolList(42)).toBeNull();
  });

  test('accepts built-in tools, MCP patterns, and known Agent(...) targets only', () => {
    for (const entry of ['Read', 'Bash(git push *)', 'Agent(worker, Explore)', 'mcp__github__*']) {
      expect(toolEntryProblem(entry, index)).toBeNull();
    }
    expect(toolEntryProblem('mcp__*', index)).toBeNull();
    expect(toolEntryProblem('MultiEdit', index)).toBe('unknown tool "MultiEdit"');
    expect(toolEntryProblem('Agent(ghost)', index)).toBe(
      'Agent(...) names unknown subagents: ghost'
    );
    expect(toolEntryProblem('read files', index)).toBe('"read files" is not a tool name');
  });

  test('accepts a well-formed subagent', () => {
    expect(agentFindings('qa', agent)).toEqual([]);
    expect(agentFindings('pm', readOnly)).toEqual([]);
    expect(
      agentFindings(
        'qa',
        {
          ...agent,
          model: 'claude-opus-5-5',
          color: 'blue',
          skills: ['seed-local-data'],
          permissionMode: 'plan',
          maxTurns: 10
        },
        'Do QA.'
      )
    ).toEqual([]);
  });

  test('rejects mismatched names, unknown models and efforts, and empty prompts', () => {
    expect(
      messages(
        agentFindings(
          'qa',
          { ...agent, name: 'tester', model: 'gpt-5', effort: 'extreme', description: '' },
          ' '
        )
      )
    ).toEqual([
      'name must match the filename (qa)',
      'description is required',
      'model must be one of inherit, haiku, sonnet, opus, fable or a full claude-* model id',
      'effort must be one of low, medium, high, xhigh, max',
      'the system prompt body is empty'
    ]);
  });

  test('rejects unknown keys, bad enums, unknown tools, and missing skills', () => {
    expect(
      messages(
        agentFindings(
          'qa',
          {
            ...agent,
            colour: 'blue',
            color: 'teal',
            maxTurns: 0,
            tools: 'Read, Serch',
            skills: ['ghost']
          },
          'Do QA.'
        )
      )
    ).toEqual([
      'unknown frontmatter key "colour" (see code.claude.com/docs/en/sub-agents)',
      'color must be one of red, blue, green, yellow, purple, orange, pink, cyan',
      'maxTurns must be a positive integer',
      'tools: unknown tool "Serch"',
      'skills: no .claude/skills/ghost/SKILL.md'
    ]);
  });

  test('keeps every subagent a leaf and read-only roles unable to edit', () => {
    expect(readOnlyAgents.has('reviewer')).toBe(true);
    expect(readOnlyAgents.has('developer')).toBe(false);
    expect(messages(agentFindings('qa', { ...agent, disallowedTools: undefined }))).toEqual([
      'disallowedTools must include Agent; subagents must not spawn subagents'
    ]);
    expect(
      messages(agentFindings('pm', { ...readOnly, disallowedTools: ['Agent', 'Edit'] }, 'Plan.'))
    ).toEqual([`read-only subagent must also disallow ${editingTools.slice(1).join(', ')}`]);
  });

  test('validates skill frontmatter', () => {
    const skill = { name: 'seed', description: 'Seeds.' };
    expect(checkSkill('s/SKILL.md', 'seed', skill, index)).toEqual([]);
    expect(checkSkill('s/SKILL.md', 'seed', { name: 'reset' }, index)).toHaveLength(2);
    expect(
      messages(
        checkSkill(
          's/SKILL.md',
          'seed',
          {
            ...skill,
            descripton: 'typo',
            description: 'x'.repeat(1500),
            when_to_use: 'y'.repeat(100),
            context: 'fork',
            agent: 'ghost',
            'allowed-tools': 'Read Bash(git status) Serch'
          },
          index
        )
      )
    ).toEqual([
      'unknown frontmatter key "descripton" (see code.claude.com/docs/en/skills)',
      'description + when_to_use is 1601 characters; Claude Code truncates at 1536',
      'agent: no subagent named ghost',
      'allowed-tools: unknown tool "Serch"'
    ]);
    expect(messages(checkSkill('S/SKILL.md', 'Seed', { ...skill, name: 'Seed' }, index))).toEqual([
      'name must be lowercase kebab-case and at most 64 characters'
    ]);
  });

  test('extracts relative links from prose, not code', () => {
    expect(
      relativeLinks(
        '[a](reference/a.md) [b](https://x.dev) [c](#top) [d](b.md#part)\n```\n[e](e.md)\n```\n`[f](f.md)`'
      )
    ).toEqual(['reference/a.md', 'b.md']);
  });

  test('separates code from prose', () => {
    expect(codeSnippets('Run `just dev`.\n```bash\nvp run seed\n```\n')).toEqual({
      code: ['vp run seed\n', 'just dev'],
      prose: 'Run ``.\n\n'
    });
  });

  test('reads Justfile recipes with parameters and defaults', () => {
    expect(
      justRecipes(
        'set dotenv-load\nversion := "1"\n[positional-arguments]\ncheck:\n    vp run check\nquery question lines="80": check\nalias c := check\n'
      )
    ).toEqual(['check', 'query', 'c']);
  });

  test('flags dangling just recipes, vp scripts, skills, and subagents', () => {
    expect(
      danglingReferences(
        'CLAUDE.md',
        'Run `just dev`, `just ship`, `vp run seed --scale small`, `vp run <script>`, and\n```bash\nvp run deploy\n```\nUse the `seed-local-data` skill, the `ghost` skill, and subagent `qa`.',
        targets
      )
    ).toEqual([
      { file: 'CLAUDE.md', message: 'vp run deploy: no such script in package.json' },
      { file: 'CLAUDE.md', message: 'just ship: no such Justfile recipe' },
      { file: 'CLAUDE.md', message: 'skill ghost: no .claude/skills/ghost/SKILL.md' }
    ]);
  });

  test('requires every subagent listed under the Subagents heading to exist', () => {
    const markdown =
      '## Subagents\n\nUse `qa`, `Explore`, `ghost`, and `just check`.\n\n## Next\n\n`other`';
    expect(messages(danglingReferences('CLAUDE.md', markdown, targets, 'Subagents'))).toEqual([
      'Subagents lists ghost, but there is no .claude/agents/ghost.md'
    ]);
  });

  test('finds repository paths rooted at real top-level entries', () => {
    expect(
      repoPathMentions(
        'See `tooling/claude/claude.sh`, `@groam/env/*`, `features/<domain>/hooks`, `_generated/server`, `apps/web`, `rg`.',
        new Set(['tooling', 'apps'])
      )
    ).toEqual(['tooling/claude/claude.sh', 'apps/web']);
  });

  test('keeps tool pins only in Dockerfile ARG defaults', () => {
    const dockerfile =
      'FROM debian\nARG CLAUDE_VERSION=2.1.287\nARG UNPINNED_VERSION\nARG NAME="x"\n';
    expect(dockerArgDefaults(dockerfile)).toEqual(
      new Map([
        ['CLAUDE_VERSION', '2.1.287'],
        ['UNPINNED_VERSION', undefined],
        ['NAME', 'x']
      ])
    );
    expect(messages(checkDockerPins('Dockerfile', dockerfile))).toEqual([
      'ARG UNPINNED_VERSION needs an exact pinned default'
    ]);
    expect(
      messages(
        checkBuildArgs(
          'devcontainer.json',
          { build: { args: { CLAUDE_VERSION: '2.1.287', UNPINNED_VERSION: '1', GONE: '1' } } },
          dockerfile
        )
      )
    ).toEqual([
      'build arg CLAUDE_VERSION duplicates the Dockerfile ARG default; pin it only in the Dockerfile',
      'build arg GONE has no ARG in the Dockerfile; remove it'
    ]);
  });

  test('reads the VS Code Claude process wrapper path', () => {
    const settings = {
      'claudeCode.claudeProcessWrapper': '${containerWorkspaceFolder}/tooling/claude/claude.sh'
    };
    expect(claudeProcessWrapper({ customizations: { vscode: { settings } } })).toBe(
      'tooling/claude/claude.sh'
    );
    expect(claudeProcessWrapper({})).toBeNull();
  });

  test('validates MCP server specs', () => {
    expect(
      checkMcpConfig('mcp.json', { mcpServers: { a: { command: 'x', args: ['y'] } } })
    ).toEqual([]);
    expect(checkMcpConfig('mcp.json', { mcpServers: { a: { args: [1] } } })).toHaveLength(2);
    expect(checkMcpConfig('mcp.json', {})).toHaveLength(1);
  });

  test('requires enabled plugins to come from a known marketplace', () => {
    expect(
      checkSettings('settings.json', {
        enabledPlugins: { 'caveman@caveman': true },
        extraKnownMarketplaces: { caveman: {} }
      })
    ).toEqual([]);
    expect(
      checkSettings('settings.json', { enabledPlugins: { 'caveman@caveman': true } })
    ).toHaveLength(1);
  });

  test('finds subagents missing from the instructions', () => {
    expect(undocumentedAgents(['qa', 'pm'], 'Delegate to `qa`.')).toEqual(['pm']);
  });
});
