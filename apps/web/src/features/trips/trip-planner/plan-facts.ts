import { FileText, MapPin, Wallet } from '@groam/icons';
import { formatTripLineCost } from '@/features/trips/trip-forms/trip-cost';
import type { PlanFactSource, PlanFactSpec } from '@/types/trip-planner';

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** The address, cost and files of one plan as facts, in that order; none when it has none. */
export function planFacts(
  source: PlanFactSource,
  address: string | null,
  currency: string
): PlanFactSpec[] {
  return [
    ...(address ? [{ key: 'address', icon: MapPin, label: address, href: mapsUrl(address) }] : []),
    ...(source.costAmount !== null
      ? [
          {
            key: 'cost',
            icon: Wallet,
            label: formatTripLineCost(source.costAmount, currency, source.costSplit)
          }
        ]
      : []),
    ...source.attachments.map((attachment) => ({
      key: attachment.id,
      icon: FileText,
      label: attachment.name,
      href: attachment.url ?? undefined
    }))
  ];
}
