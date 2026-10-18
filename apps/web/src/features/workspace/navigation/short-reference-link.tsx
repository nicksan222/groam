import { Link as RouterLink } from '@tanstack/react-router';
import type { ComponentProps } from 'react';
import { useReferenceParams } from '@/features/workspace/hooks/use-reference-params';

export function ShortReferenceLink(props: ComponentProps<typeof RouterLink>) {
  const supplied: unknown = props.params;
  const { shortIds } = useReferenceParams(props.params);
  const params =
    supplied && typeof supplied === 'object' ? { ...supplied, ...shortIds } : props.params;
  return <RouterLink {...props} params={params as ComponentProps<typeof RouterLink>['params']} />;
}
