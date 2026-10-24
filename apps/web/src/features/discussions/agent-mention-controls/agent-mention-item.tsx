import { AtSign } from '@groam/icons';
import { ComposerItem, type ComposerItemValue } from '@groam/ui/components/composer';

/** The @groam row in the composer's "@" suggestions. */
export function AgentMentionItem({ item }: { item: ComposerItemValue }) {
  return (
    <ComposerItem className="gap-3 py-2" value={item}>
      <AtSign aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0">
        <span className="block font-medium">@{item.label}</span>
        {item.description ? (
          <span className="block text-xs text-muted-foreground">{item.description}</span>
        ) : null}
      </span>
    </ComposerItem>
  );
}
