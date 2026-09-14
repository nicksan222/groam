import type * as React from 'react';
import identity from './identity.json';

export type BrandMarkProps = React.ComponentProps<'svg'> & {
  decorative?: boolean;
  monochrome?: boolean;
};

/** The canonical Groam mark: separate paths becoming one shared journey. */
export function BrandMark({
  className,
  decorative = false,
  monochrome = false,
  ...props
}: BrandMarkProps) {
  const foreground = monochrome ? 'currentColor' : identity.colors.paper;
  const waypoint = monochrome ? 'currentColor' : identity.colors.signal;

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
      <rect
        fill={monochrome ? 'none' : identity.colors.ink}
        height={identity.size}
        rx={identity.geometry.frameRadius}
        width={identity.size}
      />
      {identity.geometry.routePaths.map((path) => (
        <path
          d={path}
          key={path}
          stroke={foreground}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={identity.geometry.routeWidth}
        />
      ))}
      <circle
        cx={identity.geometry.waypoint.cx}
        cy={identity.geometry.waypoint.cy}
        fill={waypoint}
        r={identity.geometry.waypoint.radius}
      />
    </svg>
  );
}
