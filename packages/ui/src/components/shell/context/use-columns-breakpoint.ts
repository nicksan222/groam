import { useContext } from 'react';
import { ColumnsBreakpointContext } from '#src/components/shell/context/columns-context';

export function useColumnsBreakpoint() {
  const breakpoint = useContext(ColumnsBreakpointContext);
  if (!breakpoint) {
    throw new Error('Shell column slots must be inside Shell.TwoColumns.');
  }
  return breakpoint;
}
