import { Button } from '@groam/ui/components/button';
import { ArrowLeft } from 'lucide-react';

export type PanelNotFoundProps = {
  backLabel: string;
  message: string;
  onBack: () => void;
};

function PanelNotFound({ backLabel, message, onBack }: PanelNotFoundProps) {
  return (
    <div
      className="dashboard-reveal rounded-xl border border-border p-8 text-center"
      data-slot="panel-not-found"
    >
      <p className="text-sm font-semibold">{message}</p>
      <Button className="mt-3" onClick={onBack} size="sm" variant="outline">
        <ArrowLeft /> {backLabel}
      </Button>
    </div>
  );
}

export { PanelNotFound };
