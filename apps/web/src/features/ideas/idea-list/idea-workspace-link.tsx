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
    <Link
      className={className}
      onClick={onClick}
      params={href.params}
      search={'search' in href ? href.search : undefined}
      title={title}
      to={href.to}
    >
      {children}
    </Link>
  );
}
