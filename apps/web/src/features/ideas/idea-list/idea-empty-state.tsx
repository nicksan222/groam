import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { Plus } from 'lucide-react';
import { IdeaCopyExplainer } from '@/features/ideas/idea-clone/idea-copy-explainer';
import { testIds } from '@/lib/test-ids';
import { ideaEmptyDescription, ideaEmptyHeadline, startIdeaCta } from './idea-page-copy';

export function IdeaEmptyState({
  canStart,
  onStart,
  originalName
}: {
  canStart: boolean;
  onStart?: () => void;
  originalName?: string;
}) {
  return (
    <Shell.Card data-testid={testIds.emptyScreen} variant="muted">
      <IdeaCopyExplainer className="mx-auto max-w-md text-left" originalName={originalName} />
      <div className="mx-auto max-w-md space-y-1.5">
        <h2 className="text-base font-semibold">{ideaEmptyHeadline}</h2>
        <p className="text-sm leading-6 text-muted-foreground">{ideaEmptyDescription}</p>
      </div>
      {canStart && onStart ? (
        <Button data-testid={testIds.startIdea} onClick={onStart} size="sm">
          <Plus /> {startIdeaCta}
        </Button>
      ) : null}
    </Shell.Card>
  );
}
