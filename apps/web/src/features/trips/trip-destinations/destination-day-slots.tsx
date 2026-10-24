import { DayRangePicker } from '@groam/ui/components/day-range-picker';

export function DestinationDaySlots({
  destinationName,
  disabled,
  endDay,
  maximumDay,
  minimumDay,
  onChange,
  startDate,
  startDay,
  takenDays,
  totalDays
}: {
  destinationName: string;
  disabled: boolean;
  endDay: number | undefined;
  maximumDay: number;
  minimumDay: number;
  onChange: (startDay: number | undefined, endDay: number | undefined) => void;
  startDate: null | string;
  startDay: number | undefined;
  takenDays?: ReadonlySet<number>;
  totalDays: number;
}) {
  return (
    <DayRangePicker
      className="col-span-2"
      disabled={disabled}
      endDay={endDay}
      endLabel="Leave"
      label={`${destinationName} day range`}
      maximumDay={maximumDay}
      minimumDay={minimumDay}
      onChange={onChange}
      startDate={startDate}
      startDay={startDay}
      startLabel="Arrive"
      takenDays={takenDays}
      totalDays={totalDays}
    />
  );
}
