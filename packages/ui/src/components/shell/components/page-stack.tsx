'use client';

import type { StackProps } from '#src/components/shell/types/banner';
import Stack from './stack';

/** List-page vertical stack — same spacing as `Shell.Stack stack="page"`. */
const PageStack = (props: Omit<StackProps, 'stack'>) => <Stack stack="page" {...props} />;

export default PageStack;
