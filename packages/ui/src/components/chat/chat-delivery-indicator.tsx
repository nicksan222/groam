'use client';

import { CheckCheckIcon, CheckIcon, CircleAlertIcon, ClockIcon } from '@groam/icons';
import { cn } from '@groam/ui/lib/utils';
import type { ReactElement } from 'react';

export type ChatDeliveryIndicatorProps = {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  label: string;
};

export function ChatDeliveryIndicator({ status, label }: ChatDeliveryIndicatorProps): ReactElement {
  const Icon = {
    sending: ClockIcon,
    sent: CheckIcon,
    delivered: CheckCheckIcon,
    read: CheckCheckIcon,
    failed: CircleAlertIcon
  }[status];

  return (
    <span role="img" aria-label={label} title={label} data-slot="chat-delivery-indicator">
      <Icon
        aria-hidden="true"
        className={cn(
          'size-3',
          status === 'read' && 'text-primary',
          status === 'failed' && 'text-destructive'
        )}
      />
    </span>
  );
}
