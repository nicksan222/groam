import { Avatar } from '@groam/ui/components/avatar';
import { AvatarFallback } from '@groam/ui/components/avatar-fallback';
import Shell from '@groam/ui/components/shell/client';
import { initials } from '@groam/ui/lib/avatar';
import { Check } from 'lucide-react';

import type { ProposalDetail } from './proposal-types';

export function ApprovalList({ approvals }: { approvals: ProposalDetail['approvals'] }) {
  if (approvals.length === 0) return null;
  return (
    <div className="border-t px-3 py-3">
      <Shell.Eyebrow className="mb-2 tracking-wide">Approved by</Shell.Eyebrow>
      <div className="flex flex-wrap gap-2">
        {approvals.map((approval) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border bg-background py-1 pl-1 pr-2 text-xs"
            key={approval.userId}
          >
            <Avatar className="size-5">
              <AvatarFallback className="text-[8px]">{initials(approval.name)}</AvatarFallback>
            </Avatar>
            {approval.name}
            <Check className="size-3 text-primary" />
          </span>
        ))}
      </div>
    </div>
  );
}
