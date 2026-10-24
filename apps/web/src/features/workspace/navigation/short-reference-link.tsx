import { useReferenceParams } from '@/features/workspace/hooks/use-reference-params';
import { Link, type LinkProps } from '@/lib/navigation/router';

export function ShortReferenceLink(props: LinkProps) {
  const supplied: unknown = props.params;
  const { shortIds } = useReferenceParams(props.params);
  const params =
    supplied && typeof supplied === 'object' ? { ...supplied, ...shortIds } : props.params;
  return <Link {...({ ...props, params } as LinkProps)} />;
}
