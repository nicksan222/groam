import { Search } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useId, useState } from 'react';
import type { ResearchEffort } from '@/types/research';

const efforts = {
  quick: { label: 'Quick', description: 'A focused answer with a few targeted searches.' },
  standard: { label: 'Standard', description: 'Compare options and check the important details.' },
  deep: { label: 'Deep', description: 'Investigate more angles, sources, and open questions.' }
} satisfies Record<ResearchEffort, { label: string; description: string }>;

export function ResearchRunForm({
  topic,
  busy,
  onStart
}: {
  topic: string;
  busy: boolean;
  onStart: (input: { effort: ResearchEffort; topic: string }) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const query = (draft ?? topic).trim();
  const [effort, setEffort] = useState<ResearchEffort>('standard');
  const id = useId();
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && query) void onStart({ effort, topic: query });
      }}
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor={id}>
          Research topic
        </label>
        <Input
          disabled={busy}
          id={id}
          maxLength={2000}
          onChange={(event) => setDraft(event.target.value)}
          value={draft ?? topic}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label className="text-sm font-medium" htmlFor={`${id}-effort`}>
            Research effort
          </label>
          <Select
            disabled={busy}
            onValueChange={(value) => setEffort(value as ResearchEffort)}
            value={effort}
          >
            <SelectTrigger aria-describedby={`${id}-help`} id={`${id}-effort`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(efforts) as ResearchEffort[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {efforts[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button disabled={busy || !query} type="submit">
          <Search aria-hidden />
          {busy ? 'Research in progress…' : 'Research this topic'}
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground" id={`${id}-help`}>
        {efforts[effort].description}
      </p>
    </form>
  );
}
