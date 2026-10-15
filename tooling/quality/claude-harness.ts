export type Frontmatter = Record<string, unknown>;

export type HarnessFinding = { file: string; message: string };

// Names the harness can point at; built once by the CLI from the checkout.
export type HarnessIndex = {
  agents: ReadonlySet<string>;
  skills: ReadonlySet<string>;
};

export type ReferenceTargets = HarnessIndex & {
  recipes: ReadonlySet<string>;
  scripts: ReadonlySet<string>;
};

// Built-in tool names from https://code.claude.com/docs/en/tools-reference.
// `Task` is the legacy name of `Agent` and is still accepted.
const builtInTools: ReadonlySet<string> = new Set([
  'Agent',
  'Artifact',
  'AskUserQuestion',
  'Bash',
  'CronCreate',
  'CronDelete',
  'CronList',
  'Edit',
  'EndConversation',
  'EnterPlanMode',
  'EnterWorktree',
  'ExitPlanMode',
  'ExitWorktree',
  'Glob',
  'Grep',
  'ListAgents',
  'ListMcpResourcesTool',
  'LSP',
  'Monitor',
  'NotebookEdit',
  'PowerShell',
  'PushNotification',
  'Read',
  'ReadMcpResourceTool',
  'RemoteTrigger',
  'ReportFindings',
  'ScheduleWakeup',
  'SendFeedback',
  'SendMessage',
  'SendUserFile',
  'ShareOnboardingGuide',
  'Skill',
  'SubagentHandback',
  'Task',
  'TaskCreate',
  'TaskGet',
  'TaskList',
  'TaskOutput',
  'TaskStop',
  'TaskUpdate',
  'TodoWrite',
  'ToolSearch',
  'WaitForMcpServers',
  'WebFetch',
  'WebSearch',
  'Workflow',
  'Write'
]);

// Subagent types Claude Code ships, which instructions may delegate to.
const builtInAgents: ReadonlySet<string> = new Set([
  'claude-code-guide',
  'Explore',
  'general-purpose',
  'Plan',
  'statusline-setup'
]);

// Frontmatter keys from https://code.claude.com/docs/en/sub-agents.
const agentKeys = new Set([
  'name',
  'description',
  'tools',
  'disallowedTools',
  'model',
  'permissionMode',
  'maxTurns',
  'autoCompactWindow',
  'skills',
  'mcpServers',
  'hooks',
  'memory',
  'background',
  'omitClaudeMd',
  'effort',
  'isolation',
  'color',
  'initialPrompt',
  'experimental'
]);

// Frontmatter keys from https://code.claude.com/docs/en/skills.
const skillKeys = new Set([
  'name',
  'description',
  'when_to_use',
  'argument-hint',
  'arguments',
  'disable-model-invocation',
  'user-invocable',
  'allowed-tools',
  'disallowed-tools',
  'model',
  'effort',
  'context',
  'agent',
  'background',
  'hooks',
  'paths',
  'shell',
  'metadata',
  'license',
  'compatibility'
]);

const modelAliases = ['inherit', 'haiku', 'sonnet', 'opus', 'fable'];
const modelId = /^claude-[a-z0-9.-]+(?:\[1m\])?$/u;
const efforts = ['low', 'medium', 'high', 'xhigh', 'max'];
const permissionModes = [
  'default',
  'acceptEdits',
  'auto',
  'dontAsk',
  'bypassPermissions',
  'plan',
  'manual'
];
const memoryScopes = ['user', 'project', 'local'];
const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan'];
const agentName = /^[^:-][^:]{0,255}$/u;
const skillName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
// Claude Code truncates description + when_to_use at 1,536 characters in the
// skill listing, so anything past it never reaches the model.
const skillDescriptionLimit = 1536;
// The Agent Skills spec caps names at 64 characters.
const skillNameLimit = 64;

// Every subagent is a leaf: none may spawn further subagents.
const leafAgentTool = 'Agent';
// Roles that only report back; they must not edit files.
export const readOnlyAgents: ReadonlySet<string> = new Set([
  'pm',
  'pr-maker',
  'pushback',
  'reviewer',
  'traveler',
  'upgrade-reviewer'
]);
export const editingTools = ['Edit', 'Write', 'NotebookEdit'] as const;

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

function oneOf(value: unknown, allowed: readonly string[]): boolean {
  return value === undefined || allowed.includes(String(value));
}

function validModel(value: unknown): boolean {
  return value === undefined || modelAliases.includes(String(value)) || modelId.test(String(value));
}

function stringList(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.every(nonEmptyString) ? value : null;
  return null;
}

/**
 * Splits a tool list (`Read, Bash(git log *)` or a YAML list) into entries,
 * keeping parenthesised specifiers such as `Agent(worker, researcher)` whole.
 * Skills also allow whitespace as a separator.
 */
export function splitToolList(value: unknown, separator: RegExp = /,/u): string[] | null {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.every(nonEmptyString) ? value.map((v) => v.trim()) : null;
  if (!nonEmptyString(value)) return null;
  const entries: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of value) {
    if (char === '(') depth += 1;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && separator.test(char)) {
      entries.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  entries.push(current);
  return entries.map((entry) => entry.trim()).filter(Boolean);
}

/** Returns why a tool entry is invalid, or null when Claude Code accepts it. */
export function toolEntryProblem(entry: string, index: HarnessIndex): string | null {
  if (/^mcp__[\w*-]+(?:__[\w*-]+)?$/u.test(entry)) return null;
  const match = /^(\w+)(?:\((.*)\))?$/su.exec(entry);
  if (!match) return `"${entry}" is not a tool name`;
  const [, tool, specifier] = match;
  if (!builtInTools.has(tool)) return `unknown tool "${tool}"`;
  if ((tool === 'Agent' || tool === 'Task') && specifier !== undefined) {
    const missing = specifier
      .split(',')
      .map((name) => name.trim())
      .filter((name) => name && !index.agents.has(name) && !builtInAgents.has(name));
    if (missing.length > 0) return `${tool}(...) names unknown subagents: ${missing.join(', ')}`;
  }
  return null;
}

function checkTools(
  field: string,
  value: unknown,
  index: HarnessIndex,
  separator?: RegExp
): string[] {
  const entries = splitToolList(value, separator);
  if (entries === null) return [`${field} must be a string or list of tool names`];
  return entries.flatMap((entry) => {
    const problem = toolEntryProblem(entry, index);
    return problem ? [`${field}: ${problem}`] : [];
  });
}

function unknownKeys(frontmatter: Frontmatter, known: ReadonlySet<string>, docs: string): string[] {
  return Object.keys(frontmatter)
    .filter((key) => !known.has(key))
    .map((key) => `unknown frontmatter key "${key}" (see ${docs})`);
}

type FieldRule = [key: string, valid: (value: unknown) => boolean, message: string];

const enumRule = (key: string, allowed: readonly string[]): FieldRule => [
  key,
  (value) => oneOf(value, allowed),
  `${key} must be one of ${allowed.join(', ')}`
];
const booleanRule = (key: string): FieldRule => [
  key,
  (value) => value === undefined || typeof value === 'boolean',
  `${key} must be true or false`
];
const modelRule: FieldRule = [
  'model',
  validModel,
  `model must be one of ${modelAliases.join(', ')} or a full claude-* model id`
];

const agentRules: FieldRule[] = [
  modelRule,
  enumRule('effort', efforts),
  enumRule('permissionMode', permissionModes),
  enumRule('memory', memoryScopes),
  enumRule('color', colors),
  enumRule('isolation', ['worktree']),
  booleanRule('background'),
  booleanRule('omitClaudeMd'),
  [
    'maxTurns',
    (value) => value === undefined || (Number.isInteger(value) && Number(value) > 0),
    'maxTurns must be a positive integer'
  ]
];

const skillRules: FieldRule[] = [
  modelRule,
  enumRule('effort', efforts),
  enumRule('context', ['fork']),
  enumRule('shell', ['bash', 'powershell'])
];

function fieldProblems(frontmatter: Frontmatter, rules: FieldRule[]): string[] {
  return rules.filter(([key, valid]) => !valid(frontmatter[key])).map(([, , message]) => message);
}

function agentPolicyProblems(
  name: string,
  frontmatter: Frontmatter,
  index: HarnessIndex
): string[] {
  const messages: string[] = [];
  const skills = stringList(frontmatter.skills);
  if (skills === null) messages.push('skills must be a YAML list of skill names');
  for (const skill of (skills ?? []).filter((skill) => !index.skills.has(skill))) {
    messages.push(`skills: no .claude/skills/${skill}/SKILL.md`);
  }
  const disallowed = new Set(splitToolList(frontmatter.disallowedTools) ?? []);
  if (!disallowed.has(leafAgentTool)) {
    messages.push(
      `disallowedTools must include ${leafAgentTool}; subagents must not spawn subagents`
    );
  }
  const missing = editingTools.filter((tool) => !disallowed.has(tool));
  if (readOnlyAgents.has(name) && missing.length > 0) {
    messages.push(`read-only subagent must also disallow ${missing.join(', ')}`);
  }
  return messages;
}

export function checkAgent(
  file: string,
  name: string,
  { frontmatter, body }: { frontmatter: Frontmatter; body: string },
  index: HarnessIndex
): HarnessFinding[] {
  const messages = unknownKeys(frontmatter, agentKeys, 'code.claude.com/docs/en/sub-agents');
  if (frontmatter.name !== name) messages.push(`name must match the filename (${name})`);
  if (!agentName.test(name)) {
    messages.push('name must be 1-256 characters with no ":" or leading "-"');
  }
  if (!nonEmptyString(frontmatter.description)) messages.push('description is required');
  messages.push(
    ...fieldProblems(frontmatter, agentRules),
    ...checkTools('tools', frontmatter.tools, index),
    ...checkTools('disallowedTools', frontmatter.disallowedTools, index),
    ...agentPolicyProblems(name, frontmatter, index)
  );
  if (!body.trim()) messages.push('the system prompt body is empty');
  return messages.map((message) => ({ file, message }));
}

function skillAgentProblems(frontmatter: Frontmatter, index: HarnessIndex): string[] {
  if (frontmatter.agent === undefined) return [];
  const agent = String(frontmatter.agent);
  const messages: string[] = [];
  if (frontmatter.context !== 'fork') messages.push('agent only applies with context: fork');
  if (!index.agents.has(agent) && !builtInAgents.has(agent)) {
    messages.push(`agent: no subagent named ${agent}`);
  }
  return messages;
}

export function checkSkill(
  file: string,
  name: string,
  frontmatter: Frontmatter,
  index: HarnessIndex
): HarnessFinding[] {
  const messages = unknownKeys(frontmatter, skillKeys, 'code.claude.com/docs/en/skills');
  if (frontmatter.name !== name) messages.push(`name must match the skill directory (${name})`);
  if (!skillName.test(name) || name.length > skillNameLimit) {
    messages.push(`name must be lowercase kebab-case and at most ${skillNameLimit} characters`);
  }
  if (!nonEmptyString(frontmatter.description)) messages.push('description is required');
  const listing = [frontmatter.description, frontmatter.when_to_use]
    .filter(nonEmptyString)
    .join(' ');
  if (listing.length > skillDescriptionLimit) {
    messages.push(
      `description + when_to_use is ${listing.length} characters; Claude Code truncates at ${skillDescriptionLimit}`
    );
  }
  messages.push(
    ...fieldProblems(frontmatter, skillRules),
    ...skillAgentProblems(frontmatter, index),
    ...checkTools('allowed-tools', frontmatter['allowed-tools'], index, /[\s,]/u),
    ...checkTools('disallowed-tools', frontmatter['disallowed-tools'], index, /[\s,]/u)
  );
  return messages.map((message) => ({ file, message }));
}

/** Relative link targets in a Markdown body (no URLs, anchors, or absolute paths). */
export function relativeLinks(markdown: string): string[] {
  const { prose } = codeSnippets(markdown);
  return [...prose.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/gu)]
    .map((match) => match[1].split('#')[0])
    .filter((target) => target && !/^(?:[a-z][\w+.-]*:|\/)/iu.test(target))
    .map((target) => decodeURI(target));
}

/**
 * Separates fenced code blocks and inline code spans from prose, so references
 * can be read from code while links are read from prose only.
 */
export function codeSnippets(markdown: string): { code: string[]; prose: string } {
  const code: string[] = [];
  const withoutFences = markdown.replace(
    /^(```|~~~)[^\n]*\n([\s\S]*?)^\1[ \t]*$/gmu,
    (_, __, body) => {
      code.push(body as string);
      return '';
    }
  );
  const prose = withoutFences.replace(/`([^`\n]+)`/gu, (_, span) => {
    code.push(span as string);
    return '``';
  });
  return { code, prose };
}

/** Recipe names (and aliases) defined in a Justfile. */
export function justRecipes(justfile: string): string[] {
  const recipes = [...justfile.matchAll(/^@?([A-Za-z_][\w-]*)(?:\s[^:\n]*)?:(?!=)/gmu)].map(
    (match) => match[1]
  );
  const aliases = [...justfile.matchAll(/^alias\s+([\w-]+)\s*:=/gmu)].map((match) => match[1]);
  return [...recipes, ...aliases].filter(
    (name) => !['set', 'export', 'import', 'mod'].includes(name)
  );
}

function commandProblems(snippets: string[], targets: ReferenceTargets): string[] {
  return snippets.flatMap((snippet) => [
    ...[...snippet.matchAll(/(?:^|[\s;&|(])just\s+([a-z][\w-]*)/gmu)]
      .map(([, recipe]) => recipe)
      .filter((recipe) => !targets.recipes.has(recipe))
      .map((recipe) => `just ${recipe}: no such Justfile recipe`),
    ...[...snippet.matchAll(/(?:^|[\s;&|(])vp run\s+([a-z][\w:-]*)/gmu)]
      .map(([, script]) => script)
      .filter((script) => !targets.scripts.has(script))
      .map((script) => `vp run ${script}: no such script in package.json`)
  ]);
}

function knownAgent(name: string, targets: HarnessIndex): boolean {
  return targets.agents.has(name) || builtInAgents.has(name);
}

function namedMentionProblems(markdown: string, targets: ReferenceTargets): string[] {
  const mentions = [
    ...[...markdown.matchAll(/`([\w-]+)`\s+(skill|subagent)s?\b/giu)].map(([, name, kind]) => ({
      name,
      kind
    })),
    ...[...markdown.matchAll(/\b(skill|subagent)\s+`([\w-]+)`/giu)].map(([, kind, name]) => ({
      name,
      kind
    }))
  ];
  return mentions.flatMap(({ name, kind }) => {
    if (kind.toLowerCase() === 'skill') {
      return targets.skills.has(name) ? [] : [`skill ${name}: no .claude/skills/${name}/SKILL.md`];
    }
    return knownAgent(name, targets) ? [] : [`subagent ${name}: no .claude/agents/${name}.md`];
  });
}

function sectionAgentProblems(markdown: string, heading: string, targets: HarnessIndex): string[] {
  return [...markdownSection(markdown, heading).matchAll(/`([a-z][a-z0-9]*(?:-[a-z0-9]+)*)`/gu)]
    .map(([, name]) => name)
    .filter((name) => !knownAgent(name, targets))
    .map((name) => `${heading} lists ${name}, but there is no .claude/agents/${name}.md`);
}

/**
 * Finds `just <recipe>`, `vp run <script>`, and named skill/subagent mentions
 * that do not resolve. `subagentSection` names the heading whose backticked
 * kebab-case words must all be subagents.
 */
export function danglingReferences(
  file: string,
  markdown: string,
  targets: ReferenceTargets,
  subagentSection?: string
): HarnessFinding[] {
  const messages = [
    ...commandProblems(codeSnippets(markdown).code, targets),
    ...namedMentionProblems(markdown, targets),
    ...(subagentSection ? sectionAgentProblems(markdown, subagentSection, targets) : [])
  ];
  return [...new Set(messages)].map((message) => ({ file, message }));
}

function markdownSection(markdown: string, heading: string): string {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => /^#{1,6}\s/u.test(line) && line.includes(heading));
  if (start === -1) return '';
  const level = /^#+/u.exec(lines[start])?.[0].length ?? 1;
  const end = lines.findIndex(
    (line, i) => i > start && new RegExp(`^#{1,${level}}\\s`, 'u').test(line)
  );
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}

/**
 * Backticked repository paths, limited to ones rooted at an existing top-level
 * entry so package aliases (`@groam/env/*`), placeholders (`features/<domain>`),
 * and package-relative fragments (`_generated/server`) are not mistaken for paths.
 */
export function repoPathMentions(markdown: string, rootEntries: ReadonlySet<string>): string[] {
  const { code } = codeSnippets(markdown);
  const paths = code
    .map((snippet) => snippet.trim())
    .filter((snippet) => /^[\w.-]+(?:\/[\w.-]+)*\/?$/u.test(snippet) && snippet.includes('/'))
    .filter((snippet) => rootEntries.has(snippet.split('/')[0]));
  return [...new Set(paths)];
}

/** Dockerfile `ARG NAME=default` values, unquoted. */
export function dockerArgDefaults(dockerfile: string): Map<string, string | undefined> {
  const args = new Map<string, string | undefined>();
  for (const [, name, value] of dockerfile.matchAll(/^\s*ARG\s+(\w+)(?:=(\S*))?/gmu)) {
    args.set(name, value?.replace(/^(["'])(.*)\1$/u, '$2'));
  }
  return args;
}

export type DevcontainerConfig = {
  build?: { args?: Record<string, unknown> };
  customizations?: { vscode?: { settings?: Record<string, unknown> } };
};

/**
 * Tool versions are pinned once, as Dockerfile ARG defaults. A build arg in
 * devcontainer.json would silently override that pin, so flag any duplicate.
 */
export function checkBuildArgs(
  file: string,
  config: DevcontainerConfig,
  dockerfile: string
): HarnessFinding[] {
  const defaults = dockerArgDefaults(dockerfile);
  return Object.keys(config.build?.args ?? {}).flatMap((name) => {
    if (!defaults.has(name)) {
      return [{ file, message: `build arg ${name} has no ARG in the Dockerfile; remove it` }];
    }
    if (defaults.get(name) !== undefined) {
      return [
        {
          file,
          message: `build arg ${name} duplicates the Dockerfile ARG default; pin it only in the Dockerfile`
        }
      ];
    }
    return [];
  });
}

/** Every `*_VERSION` ARG must carry an exact default so rebuilds are reproducible. */
export function checkDockerPins(file: string, dockerfile: string): HarnessFinding[] {
  return [...dockerArgDefaults(dockerfile)]
    .filter(([name]) => name.endsWith('_VERSION'))
    .filter(([, value]) => !value || /^(?:latest|stable|\*)$/iu.test(value))
    .map(([name]) => ({ file, message: `ARG ${name} needs an exact pinned default` }));
}

/** Workspace-relative path of the Claude Code VS Code process wrapper, if set. */
export function claudeProcessWrapper(config: DevcontainerConfig): string | null {
  const wrapper = config.customizations?.vscode?.settings?.['claudeCode.claudeProcessWrapper'];
  if (typeof wrapper !== 'string') return null;
  return wrapper.replace(/^\$\{(?:containerWorkspaceFolder|localWorkspaceFolder)\}\//u, '');
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
