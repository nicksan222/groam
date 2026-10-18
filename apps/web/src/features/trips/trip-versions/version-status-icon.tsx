import { AlertTriangle, CheckCircle2, Pencil, Users } from 'lucide-react';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import type { VersionStatus } from './proposal-types';

export function VersionStatusIcon({ status }: { status: VersionStatus }) {
  const classes =
    status === 'conflicted'
      ? 'border-destructive/30 text-destructive'
      : status === 'merged'
        ? 'border-border text-foreground'
        : 'border-border text-muted-foreground';
  const Icon =
    status === 'conflicted'
      ? AlertTriangle
      : status === 'merged'
        ? CheckCircle2
        : status === 'in_review'
          ? Users
          : Pencil;
  return (
    <div
      aria-label={ideaStatusLabel(status)}
      className={`grid size-10 shrink-0 place-items-center rounded-xl border ${classes}`}
      role="img"
    >
      <Icon className="size-4" />
    </div>
  );
}
