'use client';

import { cn } from '@groam/ui/lib/utils';
import type React from 'react';

interface PulsingDotProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

const SIZE_CLASSES: Record<NonNullable<PulsingDotProps['size']>, string> = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4'
};

const COLOR_CLASSES: Record<NonNullable<PulsingDotProps['color']>, string> = {
  primary: 'bg-primary',
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500'
};

const PulsingDot: React.FC<PulsingDotProps> = ({ className, size = 'sm', color = 'primary' }) => {
  const sizeClass = SIZE_CLASSES[size];
  const colorClass = COLOR_CLASSES[color];

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <div className={cn('rounded-full animate-pulse', sizeClass, colorClass)} />
      <div
        className={cn('absolute rounded-full animate-ping', sizeClass, colorClass, 'opacity-75')}
      />
    </div>
  );
};

export default PulsingDot;
