import type { ReactNode } from 'react';

export interface StepsProps {
  currentStep: number;
  totalSteps: number;
  completedSteps?: number[];
  onStepClick?: (index: number) => void;
  variant?: 'default' | 'minimal' | 'dots' | 'capsule';
  orientation?: 'horizontal' | 'vertical';
  position?: 'header' | 'inline';
  className?: string;
  children?: ReactNode;
}
