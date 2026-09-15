import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import { SearchInput } from '@groam/ui/components/search-input';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AttachmentIcon } from '#tsx/ai/attachments/attachment-icon';
import type { AssistantAttachments } from './assistant-attachment-types';

export function AssistantAttachmentPicker({ attachments }: { attachments: AssistantAttachments }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = new Set(attachments.tags.map((tag) => `${tag.kind}:${tag.id}`));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const options = attachments.catalog
    .filter((item) =>
      `${item.label} ${item.description}`.toLocaleLowerCase().includes(normalizedQuery)
    )
    .slice(0, 100);
  return (
    <DropdownMenu
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery('');
      }}
      open={open}
    >
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Attach trip context"
          className="rounded-full"
          disabled={attachments.disabled}
          size="icon-sm"
          title="Attach a trip, destination, or activity"
          type="button"
          variant="ghost"
        >
          <Plus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-80 w-[min(20rem,calc(100vw-1rem))] rounded-xl border-border/70 p-2 shadow-2xl"
        side="top"
      >
        <DropdownMenuLabel>Attach to this AI chat</DropdownMenuLabel>
        <p className="px-2 pb-2 text-xs leading-5 text-muted-foreground">
          Add a trip, destination, or activity. Every agent can use it.
        </p>
        <div className="px-1 pb-1">
          <SearchInput
            aria-label="Search trip context"
            autoFocus
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape') event.stopPropagation();
            }}
            placeholder="Search trips and activities…"
            value={query}
          />
        </div>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <div className="px-2 py-5 text-center text-xs text-muted-foreground">
            {normalizedQuery ? 'No matching trip context.' : 'No trip context is available yet.'}
          </div>
        ) : (
          options.map((item) => {
            const key = `${item.kind}:${item.id}`;
            return (
              <DropdownMenuCheckboxItem
                checked={selected.has(key)}
                className="rounded-xl py-2.5"
                disabled={attachments.disabled}
                key={key}
                onCheckedChange={(checked) =>
                  attachments.onChange({ id: item.id, kind: item.kind }, checked === true)
                }
                onSelect={(event) => event.preventDefault()}
              >
                <AttachmentIcon kind={item.kind} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </DropdownMenuCheckboxItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
