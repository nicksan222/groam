import { Button } from '@groam/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import { SearchInput } from '@groam/ui/components/search-input';
import { Link2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { LinkTargetOption } from '@/types/research';

export function LinkTargetPicker({
  label = 'Link',
  onSelect,
  options
}: {
  label?: string;
  onSelect: (option: LinkTargetOption) => void;
  options: LinkTargetOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const grouped = new Map<string, LinkTargetOption[]>();
    for (const option of options) {
      if (needle && !option.label.toLowerCase().includes(needle)) continue;
      grouped.set(option.group, [...(grouped.get(option.group) ?? []), option]);
    }
    return [...grouped.entries()];
  }, [options, query]);

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button data-testid={testIds.linkTargetPicker} size="sm" type="button" variant="outline">
          <Link2 aria-hidden /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <SearchInput
          aria-label="Search"
          autoFocus
          data-testid={testIds.linkTargetSearch}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search trip items…"
          value={query}
        />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {groups.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Nothing to link</p>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} role="group" aria-label={group}>
                <p className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{group}</p>
                {items.map((option) => (
                  <Button
                    variant="ghost"
                    className="block h-auto w-full justify-start truncate rounded-md px-2 py-1.5 text-left text-sm font-normal hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    data-testid={testIds.linkTargetOption}
                    key={`${option.target.kind}:${option.target.id}`}
                    onClick={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                    type="button"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
