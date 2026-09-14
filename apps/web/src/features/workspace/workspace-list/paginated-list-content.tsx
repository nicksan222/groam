import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { Spinner } from '@groam/ui/components/spinner';
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
    return <Shell.PageStack>{empty}</Shell.PageStack>;
  }

  const canLoadMore = status === 'CanLoadMore' || status === 'LoadingMore';
  return (
    <Shell.PageStack>
      {children}
      {canLoadMore ? (
        <div className="flex justify-center">
          <Button
            data-testid={loadMoreTestId}
            disabled={status === 'LoadingMore'}
            onClick={() => onLoadMore(pageSize)}
            variant="outline"
          >
            {status === 'LoadingMore' && <Spinner />} {loadMoreLabel}
          </Button>
        </div>
      ) : null}
    </Shell.PageStack>
  );
}
