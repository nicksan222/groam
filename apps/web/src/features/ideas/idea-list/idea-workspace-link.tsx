import type { ReactNode } from 'react';
import { type IdeaHrefProposal, ideaWorkspaceHref } from '@/features/ideas/idea-href';
import { Link } from '@/features/workspace/navigation/router';

export function IdeaWorkspaceLink({
  children,
  className,
  onClick,
  proposal,
  title
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  proposal: IdeaHrefProposal;
  title?: string;
}) {
  const href = ideaWorkspaceHref(proposal);
  return (
    <Link {...href} className={className} onClick={onClick} title={title}>
      {children}
    </Link>
  );
}
