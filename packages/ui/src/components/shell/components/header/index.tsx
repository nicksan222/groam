'use client';

import { Stepper } from '@groam/ui/components/stepper';
import { cn } from '@groam/ui/lib/utils';
import React from 'react';
import { useShellStore } from '#src/components/shell/context';
import { selectOrderedActions } from '#src/components/shell/store';
import type { HeaderProps } from '#src/components/shell/types';
import { SHELL_HEADER_PADDING } from '#src/lib/shell-layout';
import Action from '#tsx/components/shell/components/action';
import { renderHeaderAction } from './header-actions';
import { groupHeaderChildren } from './header-slots';

const Header: React.FC<HeaderProps> = ({ children, className, ...rest }) => {
  const rawActions = useShellStore((s) => s.actions);
  const steps = useShellStore((s) => s.steps);

  const actions = React.useMemo(() => selectOrderedActions(rawActions), [rawActions]);

  const otherChildren = React.Children.toArray(children).filter((child) => {
    return React.isValidElement(child) && child.type !== Action;
  });

  const groupedChildren = groupHeaderChildren(otherChildren);

  return (
    <div
      {...rest}
      className={cn(
        'sticky top-0 z-10 flex w-full max-w-full flex-col overflow-hidden',
        'bg-background',
        'border-b border-border/50',
        SHELL_HEADER_PADDING,
        className
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">{groupedChildren}</div>
        {actions.length > 0 && (
          <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
            {actions.map((action, index) => renderHeaderAction(action, index))}
          </div>
        )}
      </div>
      {steps && steps.position === 'header' && (
        <div className="mt-3 md:mt-2 -mx-2 px-2">
          <div
            className={cn(
              'w-full max-w-[100vw] md:max-w-full overflow-x-auto px-2 sm:px-4 md:px-0',
              'flex flex-nowrap md:flex-nowrap'
            )}
          >
            <Stepper
              currentStep={steps.currentStep}
              totalSteps={steps.totalSteps}
              completedSteps={steps.completedSteps}
              onStepClick={steps.onStepClick}
              variant={steps.variant}
              orientation={steps.orientation}
              className={cn('w-full', steps.className)}
            >
              {steps.children}
            </Stepper>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
