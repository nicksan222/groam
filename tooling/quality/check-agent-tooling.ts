import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';
import {
  checkRole,
  checkSharedSkill,
  checkMcpConfig,
  checkSettings,
  checkBuildArgs,
  checkDockerPins,
  claudeProcessWrapper,
  danglingReferences,
  relativeLinks,
  repoPathMentions,
  justRecipes,
  splitFrontmatter,
  syncAdapters,
  type DevcontainerConfig,
  type Frontmatter,
  type HarnessFinding,
  type Role
} from './agent-tooling';

const write = process.argv.includes('--sync');
const findings: HarnessFinding[] = [];
const rootEntries = new Set(readdirSync('.'));

function json(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    findings.push({ file, message: `invalid JSON: ${String(error)}` });
    return null;
  }
}

function markdown(file: string): { frontmatter: Frontmatter; body: string } | null {
  try {
    const parts = splitFrontmatter(readFileSync(file, 'utf8'));
    if (!parts) throw new Error('missing YAML frontmatter');
    const frontmatter = Bun.YAML.parse(parts.frontmatter);
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter))
      throw new Error('frontmatter must be an object');
    return { frontmatter: frontmatter as Frontmatter, body: parts.body };
  } catch (error) {
    findings.push({ file, message: String(error) });
    return null;
  }
}

function entries(directory: string): string[] {
  try {
    return readdirSync(directory).sort();
  } catch {
    findings.push({ file: directory, message: 'shared directory is missing' });
    return [];
  }
}

const skillNames = entries('.agents/skills');
const roleFiles = entries('.agents/roles').filter((name) => name.endsWith('.md'));
const targets = {
  agents: new Set(roleFiles.map((file) => basename(file, '.md'))),
  skills: new Set(skillNames),
  recipes: new Set(justRecipes(readFileSync('Justfile', 'utf8'))),
  scripts: new Set(
    Object.keys((json('package.json') as { scripts: Record<string, string> }).scripts)
  )
};

function ignored(path: string): boolean {
  try {
    execFileSync('git', ['check-ignore', '--quiet', path], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function references(file: string, body: string, commands = true): void {
  if (commands) findings.push(...danglingReferences(file, body, targets));
  for (const path of repoPathMentions(body, rootEntries)) {
    if (!existsSync(path) && !ignored(path))
      findings.push({ file, message: `${path} does not exist; update the source reference` });
  }
  for (const link of relativeLinks(body)) {
    if (!existsSync(normalize(join(dirname(file), link))))
      findings.push({ file, message: `link target ${link} does not exist` });
  }
}

function localMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return localMarkdownFiles(path);
    return entry.isFile() && entry.name.endsWith('.md') ? [path] : [];
  });
}

const lock = json('skills-lock.json') as { skills: Record<string, unknown> } | null;
const vendored = new Set(Object.keys(lock?.skills ?? {}));
for (const name of skillNames) {
  const file = `.agents/skills/${name}/SKILL.md`;
  const skill = markdown(file);
  if (!skill) continue;
  findings.push(...checkSharedSkill(file, name, skill.frontmatter));
  if (!skill.body.trim()) findings.push({ file, message: 'the skill body is empty' });
  // Upstream skills describe external projects too; validate their local links,
  // but reserve Groam command/path checks for our own instructions.
  if (vendored.has(name)) {
    for (const link of relativeLinks(skill.body)) {
      if (!existsSync(normalize(join(dirname(file), link))))
        findings.push({ file, message: `link target ${link} does not exist` });
    }
  } else {
    references(file, skill.body);
    for (const reference of localMarkdownFiles(dirname(file)).filter((path) => path !== file)) {
      references(reference, readFileSync(reference, 'utf8'));
    }
  }
}

const roles: Role[] = [];
for (const entry of roleFiles) {
  const name = basename(entry, '.md');
  const file = `.agents/roles/${entry}`;
  const role = markdown(file);
  if (!role) continue;
  const problems = checkRole(file, name, role, targets);
  findings.push(...problems);
  references(file, role.body);
  if (problems.length === 0) roles.push(role.frontmatter as Role);
}

// Synchronization uses only validated inputs. Validation mode is read-only.
if (!write || findings.length === 0) findings.push(...syncAdapters('.', roles, skillNames, write));

for (const file of [
  'AGENTS.md',
  'CLAUDE.md',
  'GEMINI.md',
  '.github/copilot-instructions.md',
  '.agents/README.md'
]) {
  if (existsSync(file)) references(file, readFileSync(file, 'utf8'));
  else findings.push({ file, message: 'instruction entry point is missing' });
}

for (const file of ['.mcp.json', '.claude/settings.json']) {
  if (!existsSync(file)) continue;
  const config = json(file);
  if (config !== null)
    findings.push(
      ...(file === '.mcp.json' ? checkMcpConfig(file, config) : checkSettings(file, config))
    );
}

const dockerfile = '.devcontainer/Dockerfile';
const devcontainerFile = '.devcontainer/devcontainer.json';
if (existsSync(dockerfile)) {
  const source = readFileSync(dockerfile, 'utf8');
  findings.push(...checkDockerPins(dockerfile, source));
  try {
    const config = Bun.JSONC.parse(readFileSync(devcontainerFile, 'utf8')) as DevcontainerConfig;
    findings.push(...checkBuildArgs(devcontainerFile, config, source));
    const wrapper = claudeProcessWrapper(config);
    if (wrapper && !existsSync(wrapper))
      findings.push({ file: devcontainerFile, message: `wrapper ${wrapper} does not exist` });
  } catch (error) {
    findings.push({ file: devcontainerFile, message: String(error) });
  }
}

const launcher = 'tooling/claude/claude.sh';
if (existsSync(launcher)) {
  if ((statSync(launcher).mode & 0o111) === 0)
    findings.push({ file: launcher, message: 'launcher must be executable' });
  try {
    execFileSync('bash', ['-n', launcher], { stdio: 'pipe' });
  } catch {
    findings.push({ file: launcher, message: 'invalid bash syntax' });
  }
}

for (const name of entries('.claude/skills')) {
  const file = `.claude/skills/${name}`;
  if (lstatSync(file).isSymbolicLink() && !existsSync(file))
    findings.push({ file, message: 'broken skill adapter; remove it or restore the shared skill' });
}

// Catch orphaned generated adapters, without forbidding personal/native config.
for (const [directory, extension] of [
  ['.codex/agents', '.toml'],
  ['.claude/agents', '.md']
]) {
  for (const entry of entries(directory)) {
    const file = join(directory, entry);
    if (!entry.endsWith(extension) || lstatSync(file).isDirectory()) continue;
    const source = readFileSync(file, 'utf8');
    if (source.includes('.agents/roles/') && !targets.agents.has(basename(entry, extension)))
      findings.push({ file, message: 'adapter has no shared role; remove or reconcile it' });
  }
}

for (const { file, message } of findings) console.error(`${file}: ${message}`);
if (findings.length) process.exit(1);
console.log(
  `Agent tooling is valid: ${roles.length} shared roles, ${skillNames.length} skills, adapters, references, and runtime configuration.${write ? ' Adapters synchronized.' : ''}`
);
