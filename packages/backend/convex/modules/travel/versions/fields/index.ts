import { type GenericValidator, type Infer, v } from 'convex/values';

export type VersionDiffValueFormat =
  | 'date'
  | 'destination'
  | 'duration'
  | 'money'
  | 'schedule'
  | 'text'
  | 'travelMode';

export type VersionDiffFieldStrategy =
  | { display: 'hidden' }
  | { display: 'media' }
  | { display: 'value'; format: VersionDiffValueFormat };
export type VersionDiffFieldTag = VersionDiffFieldStrategy & { label: string };

export type VersionedField<Validator extends GenericValidator, Diff = VersionDiffFieldTag> = {
  diff: Diff;
  validator: Validator;
};
export type VersionedFieldMap = Record<string, VersionedField<GenericValidator>>;
type ValidatorMap<Fields extends VersionedFieldMap> = {
  [Field in keyof Fields]: Fields[Field]['validator'];
};
type PresentationMap<Fields extends VersionedFieldMap> = {
  [Field in keyof Fields]: Fields[Field]['diff'];
};
type NonEmptyLabel<Label extends string> = Label extends '' ? never : Label;

function field<
  Validator extends GenericValidator,
  Label extends string,
  Diff extends VersionDiffFieldStrategy
>(
  validator: Validator,
  label: NonEmptyLabel<Label>,
  diff: Diff
): VersionedField<Validator, Diff & { label: Label }> {
  return { diff: { ...diff, label }, validator };
}

function valueField<const Format extends VersionDiffValueFormat>(format: Format) {
  return <Validator extends GenericValidator, Label extends string>(
    validator: Validator,
    label: NonEmptyLabel<Label>
  ) => field(validator, label, { display: 'value', format });
}

/**
 * Choose one strategy for every versioned field. The strategy controls both visibility and visual
 * formatting, while the required label is the only traveler-facing field name.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionDiff {
  static date = valueField('date');
  static destination = valueField('destination');
  static duration = valueField('duration');
  static hidden = <Validator extends GenericValidator, Label extends string>(
    validator: Validator,
    label: NonEmptyLabel<Label>
  ) => field(validator, label, { display: 'hidden' as const });
  static media = <Validator extends GenericValidator, Label extends string>(
    validator: Validator,
    label: NonEmptyLabel<Label>
  ) => field(validator, label, { display: 'media' as const });
  static money = valueField('money');
  static schedule = valueField('schedule');
  static text = valueField('text');
  static travelMode = valueField('travelMode');
}

/**
 * Defines a versioned model once. Its validator types snapshots and its presentation map powers
 * proposal diffs. Adding a field without a label, visibility, and format cannot typecheck.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class VersionedModel {
  static define<const Fields extends VersionedFieldMap>(fields: Fields) {
    const validators = Object.fromEntries(
      Object.entries(fields).map(([key, definition]) => [key, definition.validator])
    ) as ValidatorMap<Fields>;
    const presentation = Object.fromEntries(
      Object.entries(fields).map(([key, definition]) => [key, definition.diff])
    ) as PresentationMap<Fields>;
    return { fields: validators, presentation, validator: v.object(validators) };
  }

  /** Serializes only values accepted by the model that also owns the diff presentation rules. */
  static serialize<Validator extends GenericValidator>(
    model: { validator: Validator },
    value: Infer<Validator>
  ): string {
    void model;
    return `${JSON.stringify(value, null, 2)}\n`;
  }
}
