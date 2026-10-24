import type { ComposerItemValue, ComposerTrigger } from '@groam/ui/components/composer';
import type {
  CommandSubmit,
  CommandSuggestions,
  ComposerCommand,
  ParsedCommandInput
} from '@/types/discussions';

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

function matchingCommands(commands: ComposerCommand[], prefix: string) {
  return commands.filter((command) => command.name.startsWith(prefix.toLowerCase()));
}

function matchingOptions(command: ComposerCommand, query: string) {
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

const MAX_OPTIONS = 8;

/**
 * The "/" suggestions for a draft that starts with a command: matching commands while the name
 * is typed, then the matching choices of a pick-from-list command. Each item id maps to what
 * picking it does: run now, or prefill "/name " so the argument can be typed.
 */
export function commandSuggestions(commands: ComposerCommand[], text: string): CommandSuggestions {
  const suggestions: CommandSuggestions = { actions: new Map(), items: [] };
  const parsed = parseCommandInput(text.trimStart());
  if (!parsed) return suggestions;
  if (!parsed.hasArgument) {
    for (const command of matchingCommands(commands, parsed.name)) addCommand(suggestions, command);
    return suggestions;
  }
  const command = commands.find((item) => item.name === parsed.name);
  if (command?.options) addOptions(suggestions, command, parsed.argument);
  return suggestions;
}

function addCommand(suggestions: CommandSuggestions, command: ComposerCommand) {
  const id = `command:${command.name}`;
  const { run } = command;
  if (command.argument || command.options) {
    suggestions.actions.set(id, { prefill: `/${command.name} ` });
  } else if (run) {
    suggestions.actions.set(id, { run: () => run('') });
  } else {
    return;
  }
  suggestions.items.push({
    description: command.description,
    id,
    kind: 'command',
    label: command.name,
    type: 'action',
    ...(command.argument ? { data: command.argument } : {})
  });
}

function addOptions(suggestions: CommandSuggestions, command: ComposerCommand, argument: string) {
  for (const option of matchingOptions(command, argument).slice(0, MAX_OPTIONS)) {
    const id = `option:${option.id}`;
    suggestions.actions.set(id, { run: option.run });
    suggestions.items.push({
      id,
      kind: 'option',
      label: option.label,
      type: 'action',
      ...(option.group ? { description: option.group } : {})
    });
  }
}

/** Composer "/" trigger over precomputed suggestions; items are already filtered. */
export function commandTrigger(items: ComposerItemValue[]): ComposerTrigger {
  return { character: '/', filter: null, items };
}
