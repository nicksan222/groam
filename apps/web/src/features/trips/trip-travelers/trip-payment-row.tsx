import { Button } from '@groam/ui/components/button';
import type { useTripPayments } from '@/features/trips/hooks/use-trip-payments';

export function TripPaymentRow({
  canPay,
  disabled,
  isYou,
  name,
  onPay,
  payment,
  pending
}: {
  canPay: boolean;
  disabled: boolean;
  isYou: boolean;
  name: string;
  onPay: (userId: string) => Promise<void>;
  payment: ReturnType<typeof useTripPayments>['travelers'][number];
  pending: boolean;
}) {
  const settled = payment.free || payment.paid;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <span className="min-w-0 break-words text-sm">
        {name}
        {isYou ? ' (you)' : ''}
      </span>
      {settled && (
        <span className="text-xs text-muted-foreground">
          {payment.free ? 'Creator · free' : 'Paid'}
        </span>
      )}
      {!settled && canPay && (
        <Button
          aria-label={isYou ? 'Pay €1 for your trip access' : `Pay €1 for ${name}`}
          disabled={disabled}
          onClick={() => void onPay(payment.userId)}
          size="sm"
          variant="outline"
        >
          {pending ? 'Opening checkout…' : 'Pay €1'}
        </Button>
      )}
      {!settled && !canPay && (
        <span className="text-xs text-muted-foreground">Awaiting payment</span>
      )}
    </li>
  );
}
