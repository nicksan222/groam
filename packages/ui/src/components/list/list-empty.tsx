import { EmptyScreen, type EmptyScreenProps } from '@groam/ui/components/empty-screen';

/**
 * The empty state, inside `List.Body`. Takes `EmptyScreen`'s props (`icon`, `headline`,
 * `description`, `buttonRaw` for the way forward). Say why it is empty: no matches, or nothing yet.
 */
function ListEmpty(props: EmptyScreenProps) {
  return <EmptyScreen data-slot="list-empty" {...props} />;
}

export { ListEmpty };
