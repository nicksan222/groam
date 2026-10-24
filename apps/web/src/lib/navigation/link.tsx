import { Link as RouterLink } from '@tanstack/react-router';
import type { LinkProps } from '@/types/navigation';

/** The router's client-side link to a typed workspace destination. */
export function Link({
  hash,
  params,
  preserveScroll,
  search,
  to,
  viewTransition,
  ...rest
}: LinkProps) {
  return (
    <RouterLink
      activeOptions={{ exact: true }}
      {...rest}
      hash={hash}
      params={params}
      resetScroll={preserveScroll ? false : undefined}
      search={search}
      to={to}
      viewTransition={viewTransition}
    />
  );
}
