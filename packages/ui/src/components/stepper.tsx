'use client';

import { Check } from 'lucide-react';
import {
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  use,
  useMemo
} from 'react';
import { cn } from '#src/lib/utils';
import { Button } from './button';

interface StepperContextValue {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (index: number) => void;
  variant?: 'default' | 'minimal' | 'dots' | 'capsule';
}

const EMPTY_COMPLETED_STEPS: number[] = [];

const StepperContext = createContext<StepperContextValue | undefined>(undefined);

const useStepperContext = () => {
  const context = use(StepperContext);
  if (!context) {
    throw new Error('Stepper components must be used within a Stepper');
  }
  return context;
};

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  completedSteps?: number[];
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (index: number) => void;
  variant?: 'default' | 'minimal' | 'dots' | 'capsule';
  className?: string;
  children: ReactNode;
}

const Stepper = ({
  currentStep,
  totalSteps,
  completedSteps = EMPTY_COMPLETED_STEPS,
  orientation = 'horizontal',
  onStepClick,
  variant = 'default',
  className,
  children
}: StepperProps) => {
  const contextValue = useMemo(
    () => ({
      currentStep,
      totalSteps,
      completedSteps,
      orientation,
      onStepClick,
      variant
    }),
    [currentStep, totalSteps, completedSteps, orientation, onStepClick, variant]
  );
  return (
    <StepperContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex',
          orientation === 'horizontal' ? 'flex-row items-center' : 'flex-col',
          className
        )}
        role="tablist"
        aria-orientation={orientation}
        data-orientation={orientation}
      >
        {children}
      </div>
    </StepperContext.Provider>
  );
};

interface StepProps {
  index: number;
  label?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
}

interface StepState {
  isActive: boolean;
  isCompleted: boolean;
  isClickable: boolean;
  state: 'active' | 'completed' | 'inactive';
  tabId: string;
  panelId: string;
  orientation: 'horizontal' | 'vertical';
  totalSteps: number;
  onClick: () => void;
}

const useStepState = (index: number): StepState => {
  const { currentStep, completedSteps, orientation, onStepClick, totalSteps } = useStepperContext();
  const isCompleted = completedSteps.includes(index);
  const isActive = currentStep === index;
  const isClickable = Boolean(onStepClick) && (isCompleted || index <= currentStep);
  return {
    isActive,
    isCompleted,
    isClickable,
    state: isActive ? 'active' : isCompleted ? 'completed' : 'inactive',
    tabId: `step-${index}`,
    panelId: `step-panel-${index}`,
    orientation: orientation ?? 'horizontal',
    totalSteps,
    onClick: () => isClickable && onStepClick?.(index)
  };
};

/** Common ARIA + data props applied to every step's interactive button. */
const stepButtonProps = (step: StepState) => ({
  onClick: step.onClick,
  disabled: !step.isClickable,
  id: step.tabId,
  role: 'tab' as const,
  'aria-selected': step.isActive,
  'aria-controls': step.panelId,
  tabIndex: step.isActive ? 0 : -1,
  'data-state': step.state,
  'data-orientation': step.orientation
});

const DotsStep = ({
  index,
  label,
  className,
  step
}: {
  index: number;
  label?: string;
  className?: string;
  step: StepState;
}) => (
  <>
    <button
      type="button"
      {...stepButtonProps(step)}
      className={cn(
        'h-2 w-8 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        step.isActive || step.isCompleted ? 'bg-primary' : 'bg-muted',
        step.isClickable && 'cursor-pointer hover:opacity-80',
        className
      )}
      aria-label={label || `Step ${index + 1}`}
      title={label || `Step ${index + 1}`}
    />
    {index < step.totalSteps - 1 && step.orientation === 'horizontal' && (
      <div className="w-2" aria-hidden="true" role="presentation" />
    )}
  </>
);

function minimalButtonState(step: StepState): string {
  if (step.isActive) return 'bg-primary text-primary-foreground';
  if (step.isCompleted) return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
  return 'bg-muted text-muted-foreground';
}

function minimalNumberState(step: StepState): string {
  if (step.isActive) return 'bg-primary-foreground text-primary';
  if (step.isCompleted) return 'bg-primary text-primary-foreground';
  return 'bg-muted text-muted-foreground';
}

const MinimalStep = ({
  index,
  label,
  className,
  step
}: {
  index: number;
  label?: string;
  className?: string;
  step: StepState;
}) => (
  <>
    <button
      type="button"
      {...stepButtonProps(step)}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        minimalButtonState(step),
        !step.isClickable && 'cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center text-xs',
          minimalNumberState(step)
        )}
      >
        {step.isCompleted ? '✓' : index + 1}
      </span>
      {label && <span>{label}</span>}
    </button>
    {index < step.totalSteps - 1 && step.orientation === 'horizontal' && <StepConnector />}
  </>
);

const renderCapsuleIcon = (icon: ReactNode, step: StepState) => {
  if (!icon || !isValidElement(icon)) return null;
  return cloneElement(icon as ReactElement<Record<string, unknown>>, {
    className: cn(
      'h-3.5 w-3.5',
      step.isActive
        ? 'text-primary-foreground/90'
        : step.isCompleted
          ? 'text-primary/70'
          : 'text-muted-foreground/60'
    )
  });
};

function capsuleButtonState(step: StepState): string {
  if (step.isActive) return 'border-primary bg-primary text-primary-foreground';
  if (step.isCompleted) return 'bg-primary/10 text-primary border-primary/20';
  return 'bg-background text-muted-foreground border-border hover:bg-muted/50 hover:border-border/80';
}

function capsuleNumberState(step: StepState): string {
  if (step.isActive) return 'bg-white/95 text-primary';
  if (step.isCompleted) return 'bg-primary text-primary-foreground';
  return 'bg-muted text-muted-foreground border border-border';
}

const CapsuleStep = ({
  index,
  label,
  description,
  icon,
  className,
  step
}: {
  index: number;
  label?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  step: StepState;
}) => {
  const renderedIcon = renderCapsuleIcon(icon, step);
  return (
    <>
      <button
        type="button"
        {...stepButtonProps(step)}
        className={cn(
          'group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-colors duration-200 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          capsuleButtonState(step),
          !step.isClickable && 'cursor-not-allowed opacity-60',

          className
        )}
      >
        <span
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-200',
            capsuleNumberState(step)
          )}
        >
          {step.isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
        </span>
        {renderedIcon && (
          <span className="inline-flex items-center justify-center" aria-hidden>
            {renderedIcon}
          </span>
        )}
        {label && (
          <span className="text-sm font-semibold tracking-tight whitespace-nowrap">{label}</span>
        )}
        {description && (
          <span className="hidden lg:inline-block text-xs text-muted-foreground/80 ml-1">
            {description}
          </span>
        )}
      </button>
      {index < step.totalSteps - 1 && step.orientation === 'horizontal' && (
        <div
          className="relative h-px w-8 lg:flex-1 lg:w-auto mx-1"
          aria-hidden="true"
          role="presentation"
        >
          <div className="absolute inset-0 bg-border" />
          {step.isCompleted && <div className="absolute inset-0 bg-primary/50" />}
        </div>
      )}
    </>
  );
};

const DefaultIcon = ({
  step,
  icon,
  index
}: {
  step: StepState;
  icon: ReactNode;
  index: number;
}) => {
  if (step.isCompleted && !step.isActive) return <Check className="h-5 w-5" />;
  if (icon) return <div className="h-5 w-5">{icon}</div>;
  return <span className="text-sm font-semibold">{index + 1}</span>;
};

function defaultIconCircleClass(step: StepState): string {
  if (step.isActive) return 'border-primary bg-primary text-primary-foreground';
  if (step.isCompleted) return 'border-primary bg-primary/10 text-primary';
  return 'border-muted-foreground/30 bg-background';
}

const DefaultStep = ({
  index,
  label,
  description,
  icon,
  className,
  children,
  step
}: {
  index: number;
  label?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
  step: StepState;
}) => (
  <>
    <div
      className={cn('flex items-center', step.orientation === 'vertical' && 'flex-col', className)}
    >
      <button
        type="button"
        {...stepButtonProps(step)}
        className={cn(
          'relative flex items-center gap-3 p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          step.isClickable ? 'cursor-pointer hover:bg-muted/50' : 'cursor-not-allowed opacity-60'
        )}
      >
        <div
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
            defaultIconCircleClass(step)
          )}
        >
          <DefaultIcon step={step} icon={icon} index={index} />
        </div>
        {(label || description) && (
          <div className="text-left">
            {label && (
              <div
                className={cn(
                  'text-sm font-medium',
                  step.isActive ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </div>
            )}
            {description && <div className="text-xs text-muted-foreground">{description}</div>}
          </div>
        )}
      </button>
      {children}
    </div>
    {index < step.totalSteps - 1 && step.orientation === 'horizontal' && <StepConnector />}
  </>
);

const Step = ({ index, label, description, icon, className, children }: StepProps) => {
  const { variant } = useStepperContext();
  const step = useStepState(index);

  if (variant === 'dots') {
    return <DotsStep index={index} label={label} className={className} step={step} />;
  }
  if (variant === 'minimal') {
    return <MinimalStep index={index} label={label} className={className} step={step} />;
  }
  if (variant === 'capsule') {
    return (
      <CapsuleStep
        index={index}
        label={label}
        description={description}
        icon={icon}
        className={className}
        step={step}
      />
    );
  }
  return (
    <DefaultStep
      index={index}
      label={label}
      description={description}
      icon={icon}
      className={className}
      step={step}
    >
      {children}
    </DefaultStep>
  );
};

const StepConnector = ({ className }: { className?: string }) => {
  const { orientation } = useStepperContext();

  if (orientation === 'vertical') {
    return (
      <div
        className={cn('ml-5 h-8 w-px bg-border', className)}
        aria-hidden="true"
        role="presentation"
      />
    );
  }

  return (
    <div
      className={cn('mx-2 h-px w-8 bg-border', className)}
      aria-hidden="true"
      role="presentation"
    />
  );
};

interface StepContentProps {
  index: number;
  className?: string;
  children: ReactNode;
}

const StepContent = ({ index, className, children }: StepContentProps) => {
  const { currentStep } = useStepperContext();

  if (currentStep !== index) return null;

  const panelId = `step-panel-${index}`;
  const tabId = `step-${index}`;

  return (
    <div className={cn('mt-4', className)} id={panelId} role="tabpanel" aria-labelledby={tabId}>
      {children}
    </div>
  );
};

interface StepperNavigationProps {
  onNext?: () => void;
  onPrevious?: () => void;
  onComplete?: () => void;
  nextLabel?: string;
  previousLabel?: string;
  completeLabel?: string;
  className?: string;
  isLoading?: boolean;
}

const StepperNavigation = ({
  onNext,
  onPrevious,
  onComplete,
  nextLabel = 'Next',
  previousLabel = 'Previous',
  completeLabel = 'Complete',
  className,
  isLoading = false
}: StepperNavigationProps) => {
  const { currentStep, totalSteps } = useStepperContext();
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className={cn('flex items-center justify-between mt-6', className)}>
      <Button variant="outline" onClick={onPrevious} disabled={isFirstStep || isLoading}>
        {previousLabel}
      </Button>

      {isLastStep ? (
        <Button onClick={onComplete} disabled={isLoading}>
          {isLoading ? 'Processing...' : completeLabel}
        </Button>
      ) : (
        <Button onClick={onNext} disabled={isLoading}>
          {nextLabel}
        </Button>
      )}
    </div>
  );
};

interface ProgressBarProps {
  className?: string;
  showLabel?: boolean;
}

const ProgressBar = ({ className, showLabel = false }: ProgressBarProps) => {
  const { currentStep, totalSteps } = useStepperContext();
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
      )}
      <progress
        aria-label="Step completion"
        className="h-2.5 w-full overflow-hidden rounded-full bg-muted accent-primary"
        max={100}
        value={progress}
      />
    </div>
  );
};

Stepper.Step = Step;
Stepper.Content = StepContent;
Stepper.Navigation = StepperNavigation;
Stepper.Connector = StepConnector;
Stepper.ProgressBar = ProgressBar;

export { type StepProps, Stepper, type StepperProps };
