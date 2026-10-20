import { Button } from '@groam/ui/components/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { ArrowUpRight, X } from 'lucide-react';
import { useState } from 'react';
import type { LinkTargetOption, ResearchLink, ResearchLinkTarget } from '@/types/research';

const kindLabels: Record<ResearchLinkTarget['kind'], string> = {
  activity: 'Activity',
  destination: 'Destination',
  idea: 'Idea',
  issue: 'Issue',
  stay: 'Stay'
};
const targetKey = (target: ResearchLinkTarget) => `${target.kind}:${target.id}`;

export function ResearchLinkedItems({
  links,
  writable,
  options,
  onLink,
  onUnlink,
  onOpen
}: {
  links: ResearchLink[];
  writable: boolean;
  options: LinkTargetOption[];
  onLink: (target: ResearchLinkTarget) => Promise<boolean>;
  onUnlink: (target: ResearchLinkTarget) => Promise<boolean>;
  onOpen: (link: ResearchLink) => void;
}) {
  const [selected, setSelected] = useState('');
  const [pending, setPending] = useState(false);
  const chosen = options.find((option) => targetKey(option.target) === selected);
  const add = async () => {
    if (!chosen || pending || !writable) return;
    setPending(true);
    try {
      if (await onLink(chosen.target)) setSelected('');
    } finally {
      setPending(false);
    }
  };
  const remove = async (target: ResearchLinkTarget) => {
    if (pending || !writable) return;
    setPending(true);
    try {
      await onUnlink(target);
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="research-linked-heading" className="space-y-4">
      <h2 className="text-sm font-semibold" id="research-linked-heading">
        Linked trip items
      </h2>
      {links.length ? (
        <ul className="divide-y divide-border/40">
          {links.map((link) => {
            const canOpen = link.target.kind === 'issue' || link.target.kind === 'idea';
            return (
              <li className="flex min-w-0 items-center gap-2 py-3 first:pt-0" key={link.id}>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs text-muted-foreground">
                    {kindLabels[link.target.kind]}
                  </span>
                  {canOpen ? (
                    <Button
                      className="h-auto max-w-full justify-start gap-1.5 px-0 py-1 text-left whitespace-normal"
                      onClick={() => onOpen(link)}
                      variant="link"
                    >
                      <span className="min-w-0 break-words">{link.label}</span>
                      <ArrowUpRight
                        aria-hidden
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                    </Button>
                  ) : (
                    <p className="py-1 text-sm font-medium break-words">{link.label}</p>
                  )}
                </div>
                {writable ? (
                  <Button
                    aria-label={`Unlink ${link.label}`}
                    className="shrink-0 text-muted-foreground"
                    disabled={pending}
                    onClick={() => void remove(link.target)}
                    size="icon"
                    variant="ghost"
                  >
                    <X aria-hidden className="size-3.5" />
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          Connect this research to the ideas, issues, or places it will help you decide on.
        </p>
      )}
      {writable && options.length > 0 ? (
        <div className="flex items-center gap-2">
          <Select disabled={pending} onValueChange={setSelected} value={chosen ? selected : ''}>
            <SelectTrigger aria-label="Trip item to link" className="min-w-0 flex-1">
              <SelectValue placeholder="Choose a trip item" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={targetKey(option.target)} value={targetKey(option.target)}>
                  {kindLabels[option.target.kind]} · {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!chosen || pending}
            onClick={() => void add()}
            size="sm"
            variant="outline"
          >
            {pending ? 'Saving…' : 'Add'}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
