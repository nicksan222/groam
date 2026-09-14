import { Migrations } from '@convex-dev/migrations';
import { v } from 'convex/values';
import { components, internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import schema from './schema';

export const migrations = new Migrations(components.migrations, {
  internalMutation,
  schema
});

export const dropTripVersionControl = migrations.define({
  batchSize: 25,
  migrateOne: async (ctx, trip) => {
    const document = trip as typeof trip & { versionControl?: boolean };
    if (!('versionControl' in document)) return;
    const { _creationTime: _created, _id, versionControl: _dropped, ...fields } = document;
    await ctx.db.replace(_id, fields);
  },
  table: 'trips'
});

export const runDropTripVersionControl = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await migrations.runOne(ctx, internal.migrations.dropTripVersionControl);
    return null;
  }
});

export const runAll = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await migrations.runSerially(ctx, [internal.migrations.dropTripVersionControl]);
    return null;
  }
});
