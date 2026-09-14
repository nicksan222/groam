import { PageLoading } from '@groam/ui/components/page-loading';
import { type PropsWithChildren, useContext } from 'react';
import { ReferenceStatusContext } from '@/features/workspace/hooks/reference-context';

export function ReferenceContent({ children }: PropsWithChildren) {
  const { loading, missing } = useContext(ReferenceStatusContext);
  if (loading) return <PageLoading label="Opening page…" />;
  if (missing)
    return (
      <div className="flex-1 bg-canvas p-6 text-muted-foreground">
        This page was not found or is unavailable to you.
      </div>
    );
  return children;
}
