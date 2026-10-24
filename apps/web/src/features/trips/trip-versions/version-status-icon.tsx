import { AlertTriangle, CheckCircle2, Pencil, Users } from '@groam/icons';
import { IconTile } from '@groam/ui/components/icon-tile';
import { ideaStatusLabel } from '@/features/ideas/idea-status';
import type { VersionStatus } from './proposal-types';

export function VersionStatusIcon({ status }: { status: VersionStatus }) {
  const variant =
    status === 'conflicted'
      ? 'outline-destructive'
      : status === 'merged'
        ? 'outline'
        : 'outline-muted';
  const Icon =
    status === 'conflicted'
      ? AlertTriangle
      : status === 'merged'
        ? CheckCircle2
        : status === 'in_review'
          ? Users
          : Pencil;
  return (
    <IconTile aria-label={ideaStatusLabel(status)} role="img" size="md" variant={variant}>
      <Icon className="size-4" />
    </IconTile>
  );
}
