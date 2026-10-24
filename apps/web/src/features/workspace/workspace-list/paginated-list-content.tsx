import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import type { ReactNode } from 'react';
import type { PaginatedListStatus } from '@/types/workspace';

export type { PaginatedListStatus };

export function PaginatedListContent({
  children,
  empty,
  isEmpty,
  loadMoreLabel,
  loadMoreTestId,
  onLoadMore,
  pageSize = 25,
  status
}: {
  children: ReactNode;
  empty: ReactNode;
  isEmpty: boolean;
  loadMoreLabel: string;
  loadMoreTestId?: string;
  onLoadMore: (count: number) => void;
  pageSize?: number;
  status: PaginatedListStatus;
}) {
  if (isEmpty) {
    return <Shell.Stack stack="page">{empty}</Shell.Stack>;
  }

  const canLoadMore = status === 'CanLoadMore' || status === 'LoadingMore';
  return (
    <Shell.Stack stack="page">
      {children}
      {canLoadMore ? (
        <div className="flex justify-center">
          <Button
            data-testid={loadMoreTestId}
            onClick={() => onLoadMore(pageSize)}
            pending={status === 'LoadingMore'}
            variant="outline"
          >
            {loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </Shell.Stack>
  );
}
