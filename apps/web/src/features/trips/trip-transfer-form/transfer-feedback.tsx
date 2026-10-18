import { FormFeedback } from '@groam/ui/components/form-feedback';
import type { TransferForm } from './transfer-form-types';

export function TransferFeedback({ status }: { status: TransferForm['status'] }) {
  if (!status) return null;
  return (
    <FormFeedback
      error={status.kind === 'error' ? status.message : null}
      message={status.kind === 'warning' ? status.message : null}
    />
  );
}
