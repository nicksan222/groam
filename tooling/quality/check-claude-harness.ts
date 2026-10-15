import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import {
  checkAgent,
  checkMcpConfig,
  checkSettings,
  checkSkill,
  checkBuildArgs,
  checkDockerPins,
  claudeProcessWrapper,
  type DevcontainerConfig,
  danglingReferences,
  foreignHarnessPaths,
  type Frontmatter,
  type HarnessFinding,
  type ReferenceTargets,
  relativeLinks,
  repoPathMentions,
  justRecipes,
  splitFrontmatter,
  undocumentedAgents
} from './claude-harness';

const agentsDir = '.claude/agents';
const skillsDir = '.claude/skills';
const instructionsFile = 'CLAUDE.md';
const launcher = 'tooling/claude/claude.sh';
const dockerfile = '.devcontainer/Dockerfile';
const devcontainerConfig = '.devcontainer/devcontainer.json';
// Skills installed from upstream (see skills-lock.json) are refreshed, not
// edited here, so their internal links are not ours to keep in sync.
const vendoredSkills = new Set(
  Object.keys(
    (JSON.parse(readFileSync('skills-lock.json', 'utf8')) as { skills: Record<string, unknown> })
      .skills
  )
);
const findings: HarnessFinding[] = [];

type Markdown = { file: string; frontmatter: Frontmatter; body: string };

function readMarkdown(file: string): Markdown | null {
  const parts = splitFrontmatter(readFileSync(file, 'utf8'));
  if (!parts) {
    findings.push({ file, message: 'missing YAML frontmatter' });
    return null;
  }
  try {
    const frontmatter = (Bun.YAML.parse(parts.frontmatter) ?? {}) as Frontmatter;
    return { file, frontmatter, body: parts.body };
  } catch (error) {
    findings.push({ file, message: `invalid YAML frontmatter: ${(error as Error).message}` });
    return null;
  }
}

function readJson(file: string, parse: (input: string) => unknown = JSON.parse): unknown {
  try {
    return parse(readFileSync(file, 'utf8'));
  } catch (error) {
    findings.push({ file, message: `invalid JSON: ${(error as Error).message}` });
    return null;
  }
}

function gitIgnored(path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '--quiet', path], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const agents = new Map<string, Markdown | null>(
  readdirSync(agentsDir)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => [basename(entry, '.md'), readMarkdown(join(agentsDir, entry))])
);
const skills = new Map<string, Markdown | null>();
for (const name of readdirSync(skillsDir)) {
  const file = join(skillsDir, name, 'SKILL.md');
  if (existsSync(file)) skills.set(name, readMarkdown(file));
  else findings.push({ file, message: 'skill directory has no SKILL.md' });
}

const packageScripts = (
  JSON.parse(readFileSync('package.json', 'utf8')) as {
    scripts: Record<string, string>;
  }
).scripts;
const targets: ReferenceTargets = {
  agents: new Set(agents.keys()),
  skills: new Set(skills.keys()),
  recipes: new Set(justRecipes(readFileSync('Justfile', 'utf8'))),
  scripts: new Set(Object.keys(packageScripts))
};
const rootEntries = new Set(readdirSync('.'));

function checkRepoPaths(file: string, markdown: string): void {
  for (const path of repoPathMentions(markdown, rootEntries)) {
    if (!existsSync(path) && !gitIgnored(path)) {
      findings.push({ file, message: `${path} does not exist; update or remove the reference` });
    }
  }
}

for (const [name, agent] of agents) {
  if (!agent) continue;
  findings.push(...checkAgent(agent.file, name, agent, targets));
  findings.push(...danglingReferences(agent.file, agent.body, targets));
  checkRepoPaths(agent.file, agent.body);
}

for (const [name, skill] of skills) {
  if (!skill) continue;
  findings.push(...checkSkill(skill.file, name, skill.frontmatter, targets));
  if (vendoredSkills.has(name)) continue;
  findings.push(...danglingReferences(skill.file, skill.body, targets));
  for (const link of relativeLinks(skill.body)) {
    if (!existsSync(normalize(join(dirname(skill.file), link)))) {
      findings.push({ file: skill.file, message: `link target ${link} does not exist` });
    }
  }
}

const instructions = readFileSync(instructionsFile, 'utf8');
findings.push(...danglingReferences(instructionsFile, instructions, targets, 'Subagents'));
checkRepoPaths(instructionsFile, instructions);
for (const name of undocumentedAgents([...agents.keys()], instructions)) {
  findings.push({
    file: instructionsFile,
    message: `subagent ${name} is not listed under Subagents`
  });
}

for (const file of [
  'tooling/claude/mcp.json',
  'tooling/claude/mcp.headroom.json',
  'tooling/claude/settings.json'
]) {
  const config = readJson(file);
  if (config === null) continue;
  findings.push(
    ...(file.includes('/mcp.') ? checkMcpConfig(file, config) : checkSettings(file, config))
  );
}

const devcontainer = readJson(devcontainerConfig, Bun.JSONC.parse) as DevcontainerConfig | null;
const dockerfileSource = readFileSync(dockerfile, 'utf8');
findings.push(...checkDockerPins(dockerfile, dockerfileSource));
if (devcontainer) {
  findings.push(...checkBuildArgs(devcontainerConfig, devcontainer, dockerfileSource));
  const wrapper = claudeProcessWrapper(devcontainer);
  if (wrapper && wrapper !== launcher) {
    findings.push({
      file: devcontainerConfig,
      message: `claudeCode.claudeProcessWrapper must point at ${launcher}, not ${wrapper}`
    });
  }
}

for (const path of foreignHarnessPaths) {
  if (existsSync(path)) {
    findings.push({ file: path, message: 'Claude Code is the only agent harness; remove it' });
  }
}

if (!existsSync(launcher)) {
  findings.push({ file: launcher, message: 'launcher is missing' });
} else if ((statSync(launcher).mode & 0o111) === 0) {
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
    `Claude harness is valid: ${agents.size} subagents, ${skills.size} skills, references, settings, MCP servers, dev container pins, and launcher.`
  );
  process.exit(0);
}

for (const { file, message } of findings) console.error(`${file}: ${message}`);
process.exit(1);
