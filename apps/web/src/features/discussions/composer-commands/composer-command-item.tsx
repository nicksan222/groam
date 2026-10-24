import { Slash } from '@groam/icons';
import { ComposerItem, type ComposerItemValue } from '@groam/ui/components/composer';
import { testIds } from '@/lib/test-ids';

/** One row of the "/" suggestions: a command (with its input hint) or a choice for one. */
export function ComposerCommandItem({ item }: { item: ComposerItemValue }) {
  if (item.kind === 'option') {
    return (
      <ComposerItem data-testid={testIds.composerCommandOption} value={item}>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.description ? (
          <span className="shrink-0 text-xs text-muted-foreground">{item.description}</span>
        ) : null}
      </ComposerItem>
    );
  }
  return (
    <ComposerItem className="gap-3 py-2" data-testid={testIds.composerCommandOption} value={item}>
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted">
        <Slash aria-hidden className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">
          /{item.label}
          {item.data ? (
            <span className="font-normal text-muted-foreground"> {item.data}</span>
          ) : null}
        </span>
        {item.description ? (
          <span className="block text-xs text-muted-foreground">{item.description}</span>
        ) : null}
      </span>
    </ComposerItem>
  );
}
