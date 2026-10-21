import { Link as VoidLink } from '@void/react';
import { href } from '@/lib/navigation/paths';
import type { LinkProps, RouteTarget } from '@/types/navigation';

/** Void's client-side link to a typed workspace destination. */
export function Link({ hash, params, search, to, ...rest }: LinkProps) {
  return <VoidLink href={href({ hash, params, search, to } as RouteTarget)} {...rest} />;
}
