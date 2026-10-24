'use client';

import type React from 'react';
import type { PageBodyProps } from '#src/components/shell/types/banner';
import { shellPageBodyClassName } from '#src/lib/shell-layout';

/**
 * The one body under every page header. `padded` (default) is the page inset, 1600px max width and
 * standard rhythm; `bleed` fills the pane for Calendar and chat. It adds no top padding:
 * the header owns the gap above it. `clearNav` leaves room for the phone bottom nav.
 */
const PageBody: React.FC<PageBodyProps> = ({ children, clearNav, layout = 'padded', ...props }) => (
  <div
    data-slot="shell-page-body"
    {...props}
    className={shellPageBodyClassName({ className: props.className, clearNav, layout })}
    data-layout={layout}
  >
    {children}
  </div>
);

export default PageBody;
