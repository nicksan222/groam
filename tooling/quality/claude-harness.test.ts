import { describe, expect, test } from 'vite-plus/test';
import {
  checkAgent,
  checkMcpConfig,
  checkSettings,
  checkSkill,
  splitFrontmatter,
  undocumentedAgents
} from './claude-harness';

const agent = { name: 'qa', description: 'Verifies behavior.', model: 'sonnet', effort: 'medium' };

describe('Claude harness checks', () => {
  test('splits frontmatter from the body', () => {
    expect(splitFrontmatter('---\nname: qa\n---\nBody')).toEqual({
      frontmatter: 'name: qa',
      body: 'Body'
    });
    expect(splitFrontmatter('No frontmatter')).toBeNull();
  });

  test('accepts a well-formed subagent', () => {
    expect(checkAgent('qa.md', 'qa', agent, 'Do QA.')).toEqual([]);
    expect(
      checkAgent('qa.md', 'qa', { ...agent, disallowedTools: 'Edit, Write' }, 'Do QA.')
    ).toEqual([]);
  });

  test('rejects mismatched names, unknown models and efforts, and empty prompts', () => {
    const messages = checkAgent(
      'qa.md',
      'qa',
      { ...agent, name: 'tester', model: 'gpt-5', effort: 'extreme', description: '' },
      ' '
    ).map((finding) => finding.message);
    expect(messages).toEqual([
      'name must match the filename (qa)',
      'description is required',
      'model must be one of inherit, haiku, sonnet, opus, fable',
      'effort must be one of low, medium, high, xhigh, max',
      'the system prompt body is empty'
    ]);
  });

  test('requires skill names to match their directory', () => {
    expect(checkSkill('s/SKILL.md', 'seed', { name: 'seed', description: 'Seeds.' })).toEqual([]);
    expect(checkSkill('s/SKILL.md', 'seed', { name: 'reset' })).toHaveLength(2);
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
