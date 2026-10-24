# Shared coding-agent tooling

`AGENTS.md` is the repository entry point. Skills and roles have a single source:

| Location | Purpose |
| --- | --- |
| `.agents/skills/*/SKILL.md` | Agent Skills instructions and bundled references/scripts |
| `.agents/roles/*.md` | Shared subagent briefs with name, description, read-only intent, and optional required skills |
| `.claude/skills/*` | Relative symlinks to the canonical skill folders |
| `.claude/agents/*.md` | Generated Claude wrappers that read the shared roles |
| `.codex/agents/*.toml` | Generated Codex wrappers that read the shared roles |
| `CLAUDE.md`, `.github/copilot-instructions.md` | Relative symlinks to `AGENTS.md` for harnesses with other instruction filenames |

Codex discovers repository skills in `.agents/skills`; Claude discovers the
linked skill folders. Both have native role adapters. Other harnesses can read
the same files through `AGENTS.md`; automatic discovery and delegation depend
on their version and capabilities. A harness that does not automatically load
any entry point must be told to read `AGENTS.md` once. There is no universal
subagent configuration or permission format.

## Authoring and discovery

List the actual skill/role files and read their frontmatter to select a task.
Do not maintain a second roster or copy prompts into adapters. Skill frontmatter
uses the Agent Skills core (`name`, `description`); keep provider-specific
extensions optional. A role has `name`, `description`, `read-only: true|false`,
and an optional list of existing `skills`. All project workers are leaves.
Read-only describes source-editing intent; specialized delivery roles still
require explicit authorization for their documented Git side effects.

Models, effort, provider routing, and permissions belong to the invoking
session. Native restrictions help but role prose is not a security boundary.
When a native role is unavailable, pass its path/content to a general worker;
without workers, perform the pass inline and disclose the lack of independence.

Write guidance that explains how to locate current exports, types, neighboring
implementations, tests, command help, and configuration. Prefer source pointers
over copied snippets, enum lists, credentials, versions, or fixed model names.
Keep important architectural intent explicit. Generated bindings and executable
checks remain authoritative for details.

## Maintenance

- Run `just sync-agents` after adding skills or changing role metadata. It
  creates missing Claude skill links and regenerates the two native role
  wrappers. It does not install tools, stage files, or change user settings.
- `vp run lint:agents` checks shared metadata, links, source/command references,
  adapter drift, and runtime config. `lint:claude` remains a compatibility alias.
  Other harness configuration is welcome. The checker never forbids it.
- `just update-convex-agent-files` refreshes upstream guidance and skills into
  the canonical collection, retains upstream agent metadata, synchronizes
  adapters, and validates the result. The scheduled update opens a PR; normal
  CI still needs to pass. Do not delete shared instructions after an update.
- `skills-lock.json` identifies upstream skills. Preserve their content when
  reorganizing; refresh through their upstream installer. Local link checks
  apply to their entry points, but Groam-only command checks do not. Supporting
  Markdown in locally maintained skills is also checked.
- Structural checks cannot prove prose remains correct. Validate changes with
  realistic discovery tasks and the relevant code checks. When source changes
  invalidate guidance, update that guidance in the same change.
- If a role is removed or renamed, remove its old generated wrappers. The
  checker flags orphaned wrappers; it does not delete unrelated native agents.
- Skill links require a checkout with symlinks enabled. On systems that cannot
  materialize Git symlinks, use direct `.agents/skills` discovery or configure
  the harness's skill search path there; do not maintain independent copies.

Personal plugins are optional enhancements; shared instructions never depend
on them. Keep plugin selection, provider routing, credentials, and permissions in local/user
configuration.

Project MCP server definitions live in `.mcp.json`. Harnesses with another MCP
configuration format should import those definitions using their native setup;
configure credentials and trust locally. MCP availability is optional for code
navigation and does not alter authorization.

## Adapter references

Adapters use the minimum documented format; upstream format changes can still
require maintenance. Check the current documentation before extending them:

- [Agent Skills specification](https://agentskills.io/specification)
- [Codex skill discovery](https://developers.openai.com/codex/skills)
- [Codex custom agents](https://developers.openai.com/codex/subagents)
- [Claude skills](https://code.claude.com/docs/en/skills)
- [Claude subagents](https://code.claude.com/docs/en/sub-agents)
