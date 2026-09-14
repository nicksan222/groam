import { Link as RouterLink } from '@tanstack/react-router';
import { type ComponentProps, useContext } from 'react';
import { ReferenceContext } from '@/features/workspace/hooks/reference-context';
import { ShortReferenceLink } from '@/features/workspace/navigation/short-reference-link';

export const Link = ((props: ComponentProps<typeof RouterLink>) => {
  const context = useContext(ReferenceContext);
  return context ? <ShortReferenceLink {...props} /> : <RouterLink {...props} />;
}) as typeof RouterLink;
