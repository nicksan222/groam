'use client';

import { Stepper } from '@groam/ui/components/stepper';
import type React from 'react';
import { useEffect } from 'react';
import { useShellStore } from '#src/components/shell/context';
import type { StepsProps } from '#src/components/shell/types';

type StepsComponentType = React.FC<StepsProps> & {
  Step: typeof Stepper.Step;
};

const EMPTY_COMPLETED_STEPS: number[] = [];

const StepsComponent: StepsComponentType = ({
  currentStep,
  totalSteps,
  completedSteps = EMPTY_COMPLETED_STEPS,
  onStepClick,
  variant = 'default',
  orientation = 'horizontal',
  position = 'header',
  className,
  children
}) => {
  const setSteps = useShellStore((s) => s.setSteps);
  const clearSteps = useShellStore((s) => s.clearSteps);

  useEffect(() => {
    if (position === 'header') {
      setSteps({
        currentStep,
        totalSteps,
        completedSteps,
        onStepClick,
        variant,
        orientation,
        position,
        className,
        children
      });

      return () => {
        clearSteps();
      };
    }
  }, [
    currentStep,
    totalSteps,
    completedSteps,
    onStepClick,
    variant,
    orientation,
    position,
    className,
    children,
    setSteps,
    clearSteps
  ]);

  if (position === 'header') {
    return null;
  }

  return (
    <div className={className}>
      <Stepper
        currentStep={currentStep}
        totalSteps={totalSteps}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
        variant={variant}
        orientation={orientation}
      >
        {children}
      </Stepper>
    </div>
  );
};

StepsComponent.displayName = 'Steps';
StepsComponent.Step = Stepper.Step;

export default StepsComponent;
