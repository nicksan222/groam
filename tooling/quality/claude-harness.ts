export type Frontmatter = Record<string, unknown>;

export type HarnessFinding = { file: string; message: string };

const agentModels = new Set(['inherit', 'haiku', 'sonnet', 'opus', 'fable']);
const efforts = new Set(['low', 'medium', 'high', 'xhigh', 'max']);

// Instruction files and directories for other agent harnesses. Claude Code is
// the only harness, so these would be dead weight that drifts out of date.
export const foreignHarnessPaths = [
  'AGENTS.md',
  'GEMINI.md',
  '.agents',
  '.codex',
  '.cursor',
  '.cursorrules',
  '.gemini',
  '.windsurfrules',
  '.github/copilot-instructions.md'
] as const;

export function splitFrontmatter(source: string): { frontmatter: string; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/u.exec(source);
  return match ? { frontmatter: match[1], body: match[2] } : null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toolList(value: unknown): boolean {
  return (
    value === undefined ||
    nonEmptyString(value) ||
    (Array.isArray(value) && value.every(nonEmptyString))
  );
}

export function checkAgent(
  file: string,
  name: string,
  frontmatter: Frontmatter,
  body: string
): HarnessFinding[] {
  const findings: HarnessFinding[] = [];
  const fail = (message: string) => findings.push({ file, message });
  if (frontmatter.name !== name) fail(`name must match the filename (${name})`);
  if (!nonEmptyString(frontmatter.description)) fail('description is required');
  if (frontmatter.model !== undefined && !agentModels.has(String(frontmatter.model))) {
    fail(`model must be one of ${[...agentModels].join(', ')}`);
  }
  if (frontmatter.effort !== undefined && !efforts.has(String(frontmatter.effort))) {
    fail(`effort must be one of ${[...efforts].join(', ')}`);
  }
  if (!toolList(frontmatter.tools)) fail('tools must be a string or list of tool names');
  if (!toolList(frontmatter.disallowedTools)) {
    fail('disallowedTools must be a string or list of tool names');
  }
  if (!body.trim()) fail('the system prompt body is empty');
  return findings;
}

export function checkSkill(file: string, name: string, frontmatter: Frontmatter): HarnessFinding[] {
  const findings: HarnessFinding[] = [];
  if (frontmatter.name !== name) {
    findings.push({ file, message: `name must match the skill directory (${name})` });
  }
  if (!nonEmptyString(frontmatter.description)) {
    findings.push({ file, message: 'description is required' });
  }
  return findings;
}

export function checkMcpConfig(file: string, config: unknown): HarnessFinding[] {
  const servers = (config as { mcpServers?: unknown } | null)?.mcpServers;
  if (!servers || typeof servers !== 'object' || Array.isArray(servers)) {
    return [{ file, message: 'mcpServers must be an object' }];
  }
  return Object.entries(servers).flatMap(([name, server]) => {
    const spec = server as { command?: unknown; url?: unknown; args?: unknown };
    const findings: HarnessFinding[] = [];
    if (!nonEmptyString(spec.command) && !nonEmptyString(spec.url)) {
      findings.push({ file, message: `${name}: needs a command or url` });
    }
    if (
      spec.args !== undefined &&
      !(Array.isArray(spec.args) && spec.args.every((a) => typeof a === 'string'))
    ) {
      findings.push({ file, message: `${name}: args must be a list of strings` });
    }
    return findings;
  });
}

export function checkSettings(file: string, settings: unknown): HarnessFinding[] {
  const { enabledPlugins = {}, extraKnownMarketplaces = {} } = settings as {
    enabledPlugins?: Record<string, unknown>;
    extraKnownMarketplaces?: Record<string, unknown>;
  };
  return Object.entries(enabledPlugins).flatMap(([plugin, enabled]) => {
    const marketplace = plugin.split('@')[1];
    if (typeof enabled !== 'boolean') {
      return [{ file, message: `enabledPlugins.${plugin} must be true or false` }];
    }
    if (!marketplace) return [{ file, message: `${plugin} must be named plugin@marketplace` }];
    if (marketplace !== 'claude-plugins-official' && !(marketplace in extraKnownMarketplaces)) {
      return [{ file, message: `${plugin} needs ${marketplace} in extraKnownMarketplaces` }];
    }
    return [];
  });
}

export function undocumentedAgents(agentNames: string[], instructions: string): string[] {
  return agentNames.filter((name) => !instructions.includes(`\`${name}\``));
}
