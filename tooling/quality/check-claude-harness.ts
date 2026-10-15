import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  checkAgent,
  checkMcpConfig,
  checkSettings,
  checkSkill,
  foreignHarnessPaths,
  type Frontmatter,
  type HarnessFinding,
  splitFrontmatter,
  undocumentedAgents
} from './claude-harness';

const agentsDir = '.claude/agents';
const skillsDir = '.claude/skills';
const launcher = 'tooling/claude/claude.sh';
const findings: HarnessFinding[] = [];

function readMarkdown(file: string): { frontmatter: Frontmatter; body: string } | null {
  const parts = splitFrontmatter(readFileSync(file, 'utf8'));
  if (!parts) {
    findings.push({ file, message: 'missing YAML frontmatter' });
    return null;
  }
  try {
    return {
      frontmatter: (Bun.YAML.parse(parts.frontmatter) ?? {}) as Frontmatter,
      body: parts.body
    };
  } catch (error) {
    findings.push({ file, message: `invalid YAML frontmatter: ${(error as Error).message}` });
    return null;
  }
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    findings.push({ file, message: `invalid JSON: ${(error as Error).message}` });
    return null;
  }
}

const agentNames: string[] = [];
for (const entry of readdirSync(agentsDir).filter((file) => file.endsWith('.md'))) {
  const file = join(agentsDir, entry);
  const name = basename(entry, '.md');
  agentNames.push(name);
  const parsed = readMarkdown(file);
  if (parsed) findings.push(...checkAgent(file, name, parsed.frontmatter, parsed.body));
}

for (const name of readdirSync(skillsDir)) {
  const file = join(skillsDir, name, 'SKILL.md');
  if (!existsSync(file)) {
    findings.push({ file, message: 'skill directory has no SKILL.md' });
    continue;
  }
  const parsed = readMarkdown(file);
  if (parsed) findings.push(...checkSkill(file, name, parsed.frontmatter));
}

for (const file of ['tooling/claude/mcp.json', 'tooling/claude/settings.json']) {
  const config = readJson(file);
  if (config === null) continue;
  findings.push(
    ...(file.endsWith('mcp.json') ? checkMcpConfig(file, config) : checkSettings(file, config))
  );
}

for (const name of undocumentedAgents(agentNames, readFileSync('CLAUDE.md', 'utf8'))) {
  findings.push({ file: 'CLAUDE.md', message: `subagent ${name} is not listed under Subagents` });
}

for (const path of foreignHarnessPaths) {
  if (existsSync(path))
    findings.push({ file: path, message: 'Claude Code is the only agent harness; remove it' });
}

if ((statSync(launcher).mode & 0o111) === 0) {
  findings.push({ file: launcher, message: 'launcher must be executable' });
}
try {
  execFileSync('bash', ['-n', launcher], { stdio: 'pipe' });
} catch (error) {
  findings.push({
    file: launcher,
    message: `bash syntax error: ${String((error as { stderr?: Buffer }).stderr)}`
  });
}

if (findings.length === 0) {
  console.log(
    `Claude harness is valid: ${agentNames.length} subagents, skills, settings, MCP servers, and launcher.`
  );
  process.exit(0);
}

for (const { file, message } of findings) console.error(`${file}: ${message}`);
process.exit(1);
