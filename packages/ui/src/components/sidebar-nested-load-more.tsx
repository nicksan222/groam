import { SidebarMenuSubButton, SidebarMenuSubItem } from '@groam/ui/components/sidebar';
import { cn } from '@groam/ui/lib/utils';

export type SidebarNestedLoadMoreProps = {
  isLoadingMore?: boolean;
  label?: string;
  loadingLabel?: string;
  onLoadMore: () => void;
};

function SidebarNestedLoadMore({
  isLoadingMore = false,
  label = 'Load more',
  loadingLabel = 'Loading…',
  onLoadMore
}: SidebarNestedLoadMoreProps) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        aria-busy={isLoadingMore}
        className={cn('text-muted-foreground', isLoadingMore && 'pointer-events-none opacity-60')}
        onClick={() => {
          if (isLoadingMore) return;
          onLoadMore();
        }}
      >
        <span>{isLoadingMore ? loadingLabel : label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

export { SidebarNestedLoadMore };
