import { ListFilter } from '@groam/icons';
import { Kbd } from '@groam/ui/components/kbd';
import { MenuRow } from '@groam/ui/components/menu-row';
import {
  COMMAND_GROUP_HEADING_CLASS_NAME,
  COMMAND_OPTION_ACTIVE_CLASS_NAME,
  COMMAND_OPTION_CLASS_NAME
} from '@groam/ui/lib/command-surface';
import { cn } from '@groam/ui/lib/utils';
import type { ListSearchSuggestion } from './list-search-query';

/** Where text starts in every row of the dialog: 16px gutter, 16px icon, 12px gap. */
export const LIST_SEARCH_TEXT_INSET = 'pl-[calc(var(--spacing)*11)]';

/** Consecutive suggestions of one group, keeping their positions in the whole list. */
function sections(suggestions: readonly ListSearchSuggestion[]) {
  const found: Array<{
    group: string | undefined;
    items: Array<{ index: number; suggestion: ListSearchSuggestion }>;
  }> = [];
  suggestions.forEach((suggestion, index) => {
    const last = found.at(-1);
    if (last && last.group === suggestion.group) last.items.push({ index, suggestion });
    else found.push({ group: suggestion.group, items: [{ index, suggestion }] });
  });
  return found;
}

/** One hint: icon, label (key muted, value medium), right-aligned description, reserved Tab cap. */
function HintRow({
  active,
  id,
  onHover,
  onPick,
  suggestion,
  tabCompletes
}: {
  active: boolean;
  id: string;
  onHover: () => void;
  onPick: () => void;
  suggestion: ListSearchSuggestion;
  tabCompletes: boolean;
}) {
  const Icon = suggestion.icon ?? ListFilter;
  const colon = suggestion.label.indexOf(':') + 1;
  const bareKey = colon === suggestion.label.length;
  return (
    <MenuRow
      aria-selected={active}
      className={cn(
        COMMAND_OPTION_CLASS_NAME,
        'h-9 rounded-none px-4 max-md:h-11',
        active && COMMAND_OPTION_ACTIVE_CLASS_NAME,
        active && 'shadow-[inset_2px_0_0_var(--primary)]'
      )}
      density="popover"
      id={id}
      onClick={onPick}
      onMouseDown={(event) => event.preventDefault()}
      onMouseMove={active ? undefined : onHover}
      role="option"
      tabIndex={-1}
    >
      <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <span className="max-w-[60%] shrink-0 truncate text-sm">
        <span className={bareKey ? 'font-medium text-foreground' : 'text-muted-foreground'}>
          {suggestion.label.slice(0, bareKey ? colon - 1 : colon)}
        </span>
        {bareKey ? (
          <span className="text-muted-foreground">:</span>
        ) : (
          <span className="font-medium text-foreground">{suggestion.label.slice(colon)}</span>
        )}
      </span>
      <span className="ml-auto min-w-0 truncate pl-3 text-xs text-muted-foreground">
        {suggestion.description}
      </span>
      <Kbd
        aria-hidden
        className={cn('shrink-0 max-sm:hidden', !(active && tabCompletes) && 'invisible')}
      >
        Tab
      </Kbd>
    </MenuRow>
  );
}

/**
 * The hint rows, each group in a labelled `role="group"`. The active row ends in a Tab cap, whose
 * width every row reserves so descriptions never shift as the highlight moves.
 */
export function ListSearchHints({
  baseId,
  highlight,
  onHover,
  onPick,
  suggestions,
  tabCompletes
}: {
  baseId: string;
  highlight: number;
  onHover: (index: number) => void;
  onPick: (index: number) => void;
  suggestions: readonly ListSearchSuggestion[];
  tabCompletes: boolean;
}) {
  return sections(suggestions).map(({ group, items }) => {
    const headingId = `${baseId}-group-${items[0]?.index}`;
    const rows = items.map(({ index, suggestion }) => (
      <HintRow
        active={index === highlight}
        id={`${baseId}-hint-${index}`}
        key={suggestion.insert}
        onHover={() => onHover(index)}
        onPick={() => onPick(index)}
        suggestion={suggestion}
        tabCompletes={tabCompletes}
      />
    ));
    return group ? (
      <div aria-labelledby={headingId} key={headingId} role="group">
        <p
          className={cn(COMMAND_GROUP_HEADING_CLASS_NAME, 'pt-3 pr-4', LIST_SEARCH_TEXT_INSET)}
          id={headingId}
        >
          {group}
        </p>
        {rows}
      </div>
    ) : (
      rows
    );
  });
}
