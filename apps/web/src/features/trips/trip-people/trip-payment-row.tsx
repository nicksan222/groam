import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
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
    <List.Row>
      <List.Main>
        <List.Title>
          {name}
          {isYou ? ' (you)' : ''}
        </List.Title>
      </List.Main>
      <List.Actions>
        {settled && (
          <span className="text-xs text-muted-foreground">
            {payment.free ? 'Creator · free' : 'Paid'}
          </span>
        )}
        {!settled && canPay && (
          <Button
            aria-label={isYou ? 'Pay €1 for your trip access' : `Cover €1 for ${name}`}
            disabled={disabled}
            onClick={() => void onPay(payment.userId)}
            pending={pending}
            size="sm"
            variant="outline"
          >
            {isYou ? 'Pay €1' : 'Cover €1'}
          </Button>
        )}
        {!settled && !canPay && (
          <span className="text-xs text-muted-foreground">Awaiting payment</span>
        )}
      </List.Actions>
    </List.Row>
  );
}
