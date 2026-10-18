import { Button } from '@groam/ui/components/button';
import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { CornerDownLeft, Slash } from 'lucide-react';
import { testIds } from '@/lib/test-ids';
import {
  type ComposerCommand,
  matchingCommands,
  matchingOptions,
  parseCommandInput
} from './composer-command';

const MAX_OPTIONS = 8;
const rowClass =
  'flex h-auto w-full items-center justify-start gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-normal whitespace-normal';

/** Suggestions for "/" commands: the matching commands, then the matching choices for one. */
export function ComposerCommandMenu({
  api,
  commands
}: {
  api: MessageComposerApi;
  commands: ComposerCommand[];
}) {
  const parsed = parseCommandInput(api.text);
  if (!parsed || commands.length === 0) return null;

  const clearAndRun = (run: () => unknown) => {
    api.setText('');
    void run();
  };

  if (!parsed.hasArgument) {
    const matches = matchingCommands(commands, parsed.name);
    if (matches.length === 0) return null;
    return (
      <MenuFrame label="Commands">
        {matches.map((command) => (
          <Button
            className={rowClass}
            data-testid={testIds.composerCommandOption}
            disabled={api.isSubmitting}
            key={command.name}
            onClick={() => {
              if (command.argument || command.options) {
                api.setText(`/${command.name} `);
                return;
              }
              if (command.run) clearAndRun(() => command.run?.(''));
            }}
            type="button"
            variant="ghost"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted">
              <Slash aria-hidden className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium">
                /{command.name}
                {command.argument ? (
                  <span className="font-normal text-muted-foreground"> {command.argument}</span>
                ) : null}
              </span>
              <span className="block text-xs text-muted-foreground">{command.description}</span>
            </span>
          </Button>
        ))}
      </MenuFrame>
    );
  }

  const command = commands.find((item) => item.name === parsed.name);
  if (!command) return null;

  if (!command.options) {
    return (
      <MenuFrame label={`/${command.name}`}>
        <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <CornerDownLeft aria-hidden className="size-3.5" />
          {command.description}. Press Enter to apply.
        </p>
      </MenuFrame>
    );
  }

  const options = matchingOptions(command, parsed.argument).slice(0, MAX_OPTIONS);
  return (
    <MenuFrame label={`/${command.name}`}>
      {options.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Nothing matches</p>
      ) : (
        options.map((option) => (
          <Button
            className={rowClass}
            data-testid={testIds.composerCommandOption}
            disabled={api.isSubmitting}
            key={option.id}
            onClick={() => clearAndRun(option.run)}
            type="button"
            variant="ghost"
          >
            <span className="min-w-0 flex-1 truncate">{option.label}</span>
            {option.group ? (
              <span className="shrink-0 text-xs text-muted-foreground">{option.group}</span>
            ) : null}
          </Button>
        ))
      )}
    </MenuFrame>
  );
}

function MenuFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div
      aria-label={label}
      className="grid max-h-72 gap-0.5 overflow-y-auto rounded-xl border border-border/70 bg-background p-1"
      data-testid={testIds.composerCommandMenu}
      role="group"
    >
      {children}
    </div>
  );
}
