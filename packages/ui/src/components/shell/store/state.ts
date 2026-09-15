import type { ReactNode } from 'react';
import type { ActionProps } from '#src/components/shell/types';

export interface ActionEntry {
  id: string;
  insertionIndex: number;
  props: ActionProps;
}

export interface StepsConfig {
  children?: ReactNode;
  className?: string;
  completedSteps: number[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  position?: 'header' | 'inline';
  totalSteps: number;
  variant?: 'default' | 'minimal' | 'dots' | 'capsule';
}

export interface ShellState {
  actions: ActionEntry[];
  steps: StepsConfig | null;
}
