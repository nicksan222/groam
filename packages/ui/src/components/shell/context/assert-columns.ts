import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import DesktopRightColumn from '#tsx/components/shell/components/desktop-right-column';
import LeftColumn from '#tsx/components/shell/components/left-column';
import RightColumn from '#tsx/components/shell/components/right-column';

/** Validate the resolved slots, including conditional fragments, without cloning children. */
export function assertColumns(children: ReactNode) {
  const slots: unknown[] = [];
  function visit(nodes: ReactNode) {
    Children.forEach(nodes, (child) => {
      if (child == null) return;
      if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
        visit(child.props.children);
      } else {
        slots.push(isValidElement(child) ? child.type : child);
      }
    });
  }
  visit(children);
  if (
    slots.length !== 2 ||
    slots[0] !== LeftColumn ||
    (slots[1] !== RightColumn && slots[1] !== DesktopRightColumn)
  ) {
    throw new Error(
      'Shell.TwoColumns requires one Shell.LeftColumn followed by one Shell.RightColumn or Shell.DesktopRightColumn. Put content and loading states inside these slots.'
    );
  }
}
