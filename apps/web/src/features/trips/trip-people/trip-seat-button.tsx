import { Button } from '@groam/ui/components/button';

/** Opens checkout for a seat: "Pay €1" for your own, "Cover €1" for someone else's. */
export function TripSeatButton({
  disabled,
  isYou,
  name,
  onPay,
  pending
}: {
  disabled: boolean;
  isYou: boolean;
  name: string;
  onPay: () => void;
  pending: boolean;
}) {
  return (
    <Button
      aria-label={isYou ? 'Pay €1 for your trip access' : `Cover €1 for ${name}`}
      className="shrink-0"
      disabled={disabled}
      onClick={onPay}
      pending={pending}
      size="sm"
      variant="outline"
    >
      {isYou ? 'Pay €1' : 'Cover €1'}
    </Button>
  );
}
