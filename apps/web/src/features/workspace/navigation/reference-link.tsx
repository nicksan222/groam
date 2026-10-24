import { useContext } from 'react';
import { ReferenceContext } from '@/features/workspace/hooks/reference-context';
import { ShortReferenceLink } from '@/features/workspace/navigation/short-reference-link';
import { Link as RouteLink, type LinkProps } from '@/lib/navigation/router';

/** A workspace link that writes entity references in their short form when they are known. */
export function Link(props: LinkProps) {
  const context = useContext(ReferenceContext);
  return context ? <ShortReferenceLink {...props} /> : <RouteLink {...props} />;
}
