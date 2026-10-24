import { ComposerList, ComposerPopup, type ComposerItemValue } from '@groam/ui/components/composer';
import { AgentMentionItem } from '@/features/discussions/agent-mention-controls/agent-mention-item';
import { ComposerCommandItem } from '@/features/discussions/composer-commands/composer-command-item';
import { testIds } from '@/lib/test-ids';

/** Suggestions for the active composer trigger: @groam for "@", commands and choices for "/". */
export function DiscussionComposerSuggestions({ trigger }: { trigger: null | string }) {
  const commands = trigger === '/';
  return (
    <ComposerPopup>
      <ComposerList
        aria-label={commands ? 'Commands' : 'Mentions'}
        data-testid={commands ? testIds.composerCommandMenu : undefined}
      >
        {(item: ComposerItemValue) =>
          item.kind === 'agent' ? (
            <AgentMentionItem item={item} key={item.id} />
          ) : (
            <ComposerCommandItem item={item} key={item.id} />
          )
        }
      </ComposerList>
    </ComposerPopup>
  );
}
