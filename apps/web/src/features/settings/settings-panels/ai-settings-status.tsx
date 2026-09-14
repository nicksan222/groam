import { Badge } from '@groam/ui/components/badge';
import { CheckCircle2, CircleAlert } from 'lucide-react';

export function AiSettingsStatus({
  configured,
  fromEnvironment,
  model,
  provider
}: {
  configured: boolean;
  fromEnvironment: boolean;
  model: string | null;
  provider: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3">
      {configured ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
      ) : (
        <CircleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">
            {configured ? 'Groam AI is ready' : 'Groam AI needs setup'}
          </p>
          <Badge variant={configured ? 'secondary' : 'outline'}>
            {fromEnvironment ? 'Environment' : configured ? 'Group key' : 'Not configured'}
          </Badge>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {configured
            ? `Using ${provider}${model ? ` · ${model}` : ''}.`
            : 'Add a provider key below to enable AI chat and reviews.'}
        </p>
      </div>
    </div>
  );
}
