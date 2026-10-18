import { v } from 'convex/values';
import type { QueryCtx } from '#convex-generated/server';

export type TripTargetAttachments = {
  label: string;
  maxPerTarget: number;
  maxPerTrip: number;
};

export type TripTargetCostEvent =
  | 'activity_transfer_updated'
  | 'boundary_transfer_updated'
  | 'destination_transfer_updated'
  | 'itinerary_activity_updated'
  | 'stay_updated';

export type TripTargetDefinition<Type extends string, Table extends string> = {
  attachments?: TripTargetAttachments;
  collaborative?: boolean;
  contextCatalogTake?: number;
  contextLabelField?: 'name' | 'title';
  contextTag?: boolean;
  costBearing?: boolean;
  costUpdatedEvent?: TripTargetCostEvent;
  notFoundMessage: string;
  table: Table;
  taggedNotFoundMessage?: string;
  type: Type;
};

/**
 * One addressable trip resource. Add a subclass, construct it in `kinds/index.ts`,
 * and `TripTargetKind.subscribe` it. Callers use `TripTargets`, not this map.
 */
export class TripTargetKind<Type extends string = string, Table extends string = string> {
  private static readonly registered = new Map<string, TripTargetKind>();

  readonly attachments: TripTargetAttachments | null;
  readonly collaborative: boolean;
  readonly contextCatalogTake: number | null;
  readonly contextLabelField: 'name' | 'title';
  readonly contextTag: boolean;
  readonly costBearing: boolean;
  readonly costUpdatedEvent: TripTargetCostEvent | null;
  readonly notFoundMessage: string;
  readonly table: Table;
  readonly tagValidator;
  readonly taggedNotFoundMessage: string;
  readonly targetValidator;
  readonly type: Type;

  constructor(definition: TripTargetDefinition<Type, Table>) {
    this.attachments = definition.attachments ?? null;
    this.collaborative = definition.collaborative ?? this.attachments !== null;
    this.contextCatalogTake = definition.contextCatalogTake ?? null;
    this.contextLabelField = definition.contextLabelField ?? 'name';
    this.contextTag = definition.contextTag ?? false;
    this.costBearing = definition.costBearing ?? false;
    this.costUpdatedEvent = definition.costUpdatedEvent ?? null;
    this.notFoundMessage = definition.notFoundMessage;
    this.table = definition.table;
    this.tagValidator = v.object({
      id: v.id(definition.table),
      kind: v.literal(definition.type)
    });
    this.taggedNotFoundMessage = definition.taggedNotFoundMessage ?? definition.notFoundMessage;
    this.targetValidator = v.object({
      id: v.id(definition.table),
      type: v.literal(definition.type)
    });
    this.type = definition.type;
  }

  static subscribe<T extends TripTargetKind>(kind: T): T {
    if (TripTargetKind.registered.has(kind.type)) {
      throw new Error(`Trip target '${kind.type}' is already registered`);
    }
    TripTargetKind.registered.set(kind.type, kind);
    return kind;
  }

  static of(type: string): TripTargetKind | undefined {
    return TripTargetKind.registered.get(type);
  }

  static all(): TripTargetKind[] {
    return [...TripTargetKind.registered.values()];
  }

  static attachable(): Array<TripTargetKind & { attachments: TripTargetAttachments }> {
    return TripTargetKind.all().filter(TripTargetKind.isAttachable);
  }

  static contextTagged(): TripTargetKind[] {
    return TripTargetKind.all().filter((kind) => kind.contextTag);
  }

  get attachable(): boolean {
    return this.attachments !== null;
  }

  get key(): Type {
    return this.type;
  }

  contextLabel(document: { name?: string; title?: string }): string {
    const label = this.contextLabelField === 'title' ? document.title : document.name;
    return label ?? this.type;
  }

  catalogDescription(tripName: string, extras?: { destinationName?: string }): string {
    return extras?.destinationName ? `${tripName} · ${extras.destinationName}` : tripName;
  }

  async contextDetails(_ctx: QueryCtx, _document: object, label: string): Promise<unknown> {
    return { label };
  }

  static isAttachable(
    kind: TripTargetKind
  ): kind is TripTargetKind & { attachments: TripTargetAttachments } {
    return kind.attachments !== null;
  }

  static isCostBearing(
    kind: TripTargetKind
  ): kind is TripTargetKind & { costUpdatedEvent: TripTargetCostEvent } {
    return kind.costBearing && kind.costUpdatedEvent !== null;
  }
}
