import { createContext } from 'react';
import type { ShellSplitBreakpoint } from '#src/lib/shell-layout';

export const ColumnsBreakpointContext = createContext<ShellSplitBreakpoint | null>(null);
