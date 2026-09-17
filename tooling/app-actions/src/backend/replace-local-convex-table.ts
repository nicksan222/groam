import { localConvexAdminJson, localConvexAdminQuery } from './local-convex-admin';
import type { ResetTarget } from './local-reset-targets';
import type { LocalConvexCredentials } from './read-local-convex-credentials';

const IMPORT_TIMEOUT_MS = 15_000;
const EMPTY_JSON_ARRAY = '[]\n';

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Local Convex import did not return a ${label}`);
  }
  return value;
}

function importState(snapshot: unknown): Record<string, unknown> {
  if (typeof snapshot !== 'object' || snapshot === null || !('state' in snapshot)) {
    throw new Error('Local Convex import status was invalid');
  }
  const state = snapshot.state;
  if (typeof state !== 'object' || state === null || !('state' in state)) {
    throw new Error('Local Convex import status was invalid');
  }
  return state;
}

async function confirmPendingImport(credentials: LocalConvexCredentials, importId: string) {
  await localConvexAdminJson(credentials, '/api/perform_import', {
    body: JSON.stringify({ importId }),
    method: 'POST'
  });
}

async function waitForImport(credentials: LocalConvexCredentials, importId: string): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < IMPORT_TIMEOUT_MS) {
    const snapshot = await localConvexAdminQuery(
      credentials,
      '_system/cli/queryImport',
      undefined,
      { importId }
    );
    const state = importState(snapshot);
    const status = state.state;
    if (status === 'completed') return;
    if (status === 'failed') {
      const message =
        'error_message' in state && typeof state.error_message === 'string'
          ? state.error_message
          : 'import failed';
      throw new Error(message);
    }
    if (status === 'waiting_for_confirmation') await confirmPendingImport(credentials, importId);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Timed out resetting import ${importId}`);
}

export async function replaceLocalConvexTable(
  credentials: LocalConvexCredentials,
  target: ResetTarget
): Promise<void> {
  const started = await localConvexAdminJson(credentials, '/api/import/start_upload', {
    method: 'POST'
  });
  if (typeof started !== 'object' || started === null) {
    throw new Error('Local Convex import upload did not start');
  }
  const uploadToken = requiredString(
    'uploadToken' in started ? started.uploadToken : undefined,
    'upload token'
  );
  const partToken = await localConvexAdminJson(
    credentials,
    `/api/import/upload_part?uploadToken=${encodeURIComponent(uploadToken)}&partNumber=1`,
    { body: EMPTY_JSON_ARRAY, method: 'POST' },
    'application/octet-stream'
  );
  const finished = await localConvexAdminJson(credentials, '/api/import/finish_upload', {
    body: JSON.stringify({
      import: {
        componentPath: target.component,
        format: 'jsonArray',
        mode: 'replace',
        tableName: target.table
      },
      partTokens: [partToken],
      uploadToken
    }),
    method: 'POST'
  });
  if (typeof finished !== 'object' || finished === null) {
    throw new Error(`Unable to reset ${target.component}/${target.table}`);
  }
  await waitForImport(
    credentials,
    requiredString('importId' in finished ? finished.importId : undefined, 'import id')
  );
}
