import { createElement, Fragment, type ReactNode } from 'react';

export const dropdownMenuTestMock = {
  DropdownMenu: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  DropdownMenuContent: ({ children }: { children: ReactNode }) =>
    createElement('div', null, children),
  DropdownMenuItem: ({
    children,
    onSelect,
    ...props
  }: {
    children: ReactNode;
    onSelect?: () => void;
  }) => createElement('button', { onClick: onSelect, type: 'button', ...props }, children),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) =>
    createElement(Fragment, null, children)
};
