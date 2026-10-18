import { useId } from 'react';
import type * as React from 'react';
import identity from './identity.json';

export type BrandMarkProps = React.ComponentProps<'svg'> & {
  decorative?: boolean;
  monochrome?: boolean;
};

/** The canonical Groam mark: a person's pin and an agent's pin on the same spot. */
export function BrandMark({
  className,
  decorative = false,
  monochrome = false,
  ...props
}: BrandMarkProps) {
  const gapId = `${useId()}-gap`;
  const { colors, geometry, size } = identity;
  const human = monochrome ? 'currentColor' : colors.paper;
  const agent = monochrome ? 'currentColor' : colors.signal;

  return (
    <svg
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : identity.name}
      className={className}
      fill="none"
      role={decorative ? undefined : 'img'}
      viewBox={identity.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <mask height={size} id={gapId} maskUnits="userSpaceOnUse" width={size} x={0} y={0}>
          <rect fill={colors.maskKeep} height={size} width={size} />
          <path
            d={geometry.humanPin}
            fill={colors.maskCut}
            stroke={colors.maskCut}
            strokeLinejoin="round"
            strokeWidth={geometry.pinGap * 2}
          />
        </mask>
      </defs>
      {monochrome ? null : (
        <rect fill={colors.frame} height={size} rx={geometry.frameRadius} width={size} />
      )}
      <path d={geometry.agentPin} fill={agent} mask={`url(#${gapId})`} />
      <path d={`${geometry.humanPin}${geometry.humanHole}`} fill={human} fillRule="evenodd" />
    </svg>
  );
}
