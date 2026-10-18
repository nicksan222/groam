'use client';

import { useEffect, useId } from 'react';
import { useShellStore } from '#src/components/shell/context';
import type { ActionProps } from '#src/components/shell/types';

const ActionComponent: React.FC<ActionProps> = ({
  text,
  icon,
  variant,
  onClick,
  href,
  className,
  position,
  isDisabled,
  disabledTooltip,
  forceMobile,
  'data-testid': dataTestId
}) => {
  const addAction = useShellStore((s) => s.addAction);
  const removeAction = useShellStore((s) => s.removeAction);
  const localId = useId();

  useEffect(() => {
    addAction(localId, {
      text,
      icon,
      variant,
      onClick,
      href,
      className,
      position,
      isDisabled,
      disabledTooltip,
      forceMobile,
      'data-testid': dataTestId
    });
  }, [
    addAction,
    localId,
    text,
    icon,
    variant,
    onClick,
    href,
    className,
    position,
    isDisabled,
    disabledTooltip,
    forceMobile,
    dataTestId
  ]);

  useEffect(() => {
    return () => removeAction(localId);
  }, [removeAction, localId]);

  return null;
};

ActionComponent.displayName = 'Action';

export default ActionComponent;
