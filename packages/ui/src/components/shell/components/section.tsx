'use client';

import type { SectionProps } from '#src/components/shell/types/banner';
import { shellSectionClassName } from '#src/lib/shell-layout';

/** Standard page section wrapper beneath `Shell.PageBody`. */
const Section = ({ children, className, stack = 'md', ...props }: SectionProps) => (
  <section className={shellSectionClassName({ className, stack })} {...props}>
    {children}
  </section>
);

export default Section;
