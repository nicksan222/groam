import { TripTargetKind } from '#convex/modules/travel/targets/kind';

export class AttachmentTarget extends TripTargetKind<'attachment', 'attachments'> {
  constructor() {
    super({
      collaborative: true,
      notFoundMessage: 'Trip target not found',
      table: 'attachments',
      type: 'attachment'
    });
  }
}
