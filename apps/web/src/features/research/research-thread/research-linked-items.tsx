import { ArrowUpRight, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Form } from '@groam/ui/components/form';
import { FormActions } from '@groam/ui/components/form-actions';
import { FormFeedback } from '@groam/ui/components/form-feedback';
import { List } from '@groam/ui/components/list';
import { MutedCopy } from '@groam/ui/components/muted-copy';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@groam/ui/components/select';
import { useFormSubmit } from '@groam/ui/hooks/use-form-submit';
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
  const form = useFormSubmit();
  // Unlinking has its own lifecycle, so Add only spins while adding.
  const unlinking = useFormSubmit();
  const pending = form.isPending || unlinking.isPending;
  const chosen = options.find((option) => targetKey(option.target) === selected);
  const add = form.handle(async () => {
    if (!chosen || unlinking.isPending || !writable) return;
    if (await onLink(chosen.target)) setSelected('');
  });
  const remove = async (target: ResearchLinkTarget) => {
    if (pending || !writable) return;
    await unlinking.run(() => onUnlink(target));
  };

  return (
    <section aria-labelledby="research-linked-heading" className="space-y-2">
      <h2 className="text-xs font-medium text-muted-foreground" id="research-linked-heading">
        Linked trip items
      </h2>
      {links.length ? (
        <List bleed={false}>
          <List.Body>
            <List.Group aria-label="Linked trip items">
              {links.map((link) => {
                const canOpen = link.target.kind === 'issue' || link.target.kind === 'idea';
                return (
                  <List.Row key={link.id}>
                    <List.Main>
                      <List.Title asChild>
                        {canOpen ? (
                          <Button onClick={() => onOpen(link)} type="button" unstyled>
                            {link.label}
                            <ArrowUpRight aria-hidden className="size-3.5" />
                          </Button>
                        ) : (
                          <span>{link.label}</span>
                        )}
                      </List.Title>
                      <List.Description>{kindLabels[link.target.kind]}</List.Description>
                    </List.Main>
                    {writable ? (
                      <List.Avatar>
                        <Button
                          aria-label={`Unlink ${link.label}`}
                          disabled={pending}
                          onClick={() => void remove(link.target)}
                          size="icon"
                          variant="ghost"
                        >
                          <X aria-hidden className="size-3.5" />
                        </Button>
                      </List.Avatar>
                    ) : null}
                  </List.Row>
                );
              })}
            </List.Group>
          </List.Body>
        </List>
      ) : (
        <MutedCopy>
          Connect this research to the ideas, issues, or places it will help you decide on.
        </MutedCopy>
      )}
      {writable && options.length > 0 ? (
        <Form
          actions={
            <FormActions
              size="sm"
              submitDisabled={!chosen || pending}
              isPending={form.isPending}
              submitLabel="Add"
            />
          }
          className="flex flex-wrap items-center gap-2"
          error={form.error}
          isPending={form.isPending}
          onSubmit={add}
        >
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
        </Form>
      ) : null}
      <FormFeedback error={unlinking.error} />
    </section>
  );
}
