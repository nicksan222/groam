import type { CommandSubmit, ComposerCommand, ParsedCommandInput } from '@/types/discussions';

export type { ComposerCommand };

const COMMAND_PATTERN = /^\/([a-z]*)(\s+([\s\S]*))?$/iu;

/** Reads "/name rest" from composer text; null when the text is not a command. */
export function parseCommandInput(text: string): ParsedCommandInput | null {
  const match = COMMAND_PATTERN.exec(text);
  if (!match) return null;
  return {
    argument: (match[3] ?? '').trim(),
    hasArgument: match[2] !== undefined,
    name: (match[1] ?? '').toLowerCase()
  };
}

export function matchingCommands(commands: ComposerCommand[], prefix: string) {
  return commands.filter((command) => command.name.startsWith(prefix.toLowerCase()));
}

export function matchingOptions(command: ComposerCommand, query: string) {
  return command.options?.(query.trim()) ?? [];
}

/** What Enter does with command text; null means send it as a normal message. */
export function resolveCommandSubmit(
  text: string,
  commands: ComposerCommand[]
): CommandSubmit | null {
  const parsed = parseCommandInput(text.trim());
  if (!parsed || parsed.name.length === 0) return null;
  const exact = commands.find((command) => command.name === parsed.name);
  const prefixed = matchingCommands(commands, parsed.name);
  const command = exact ?? (prefixed.length === 1 ? prefixed[0] : undefined);
  if (!command) return { error: `Unknown command /${parsed.name}` };

  if (command.options) return resolveOption(command, parsed.argument);
  if (command.argument && !parsed.argument) {
    return { error: `Add ${command.argument} after /${command.name}` };
  }
  const { run } = command;
  return run ? { run: () => run(parsed.argument) } : null;
}

function resolveOption(command: ComposerCommand, argument: string): CommandSubmit {
  const options = matchingOptions(command, argument);
  const needle = argument.toLowerCase();
  const picked =
    options.find((option) => option.label.toLowerCase() === needle) ??
    (argument && options.length === 1 ? options[0] : undefined);
  if (picked) return { run: picked.run };
  if (options.length === 0) return { error: `Nothing to ${command.name} matches that` };
  return { error: `Pick one from the list to ${command.name}` };
}
