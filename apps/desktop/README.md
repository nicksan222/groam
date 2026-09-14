# Desktop

Everything specific to the packaged desktop application lives here:

- `scripts/` builds, stages, signs, and releases the Tauri application.
- `runtime/` is shipped with the application and starts its local Convex services.
- `src-tauri/` owns the native shell and bundled resources.

Cross-client process and environment helpers stay in `@groam/devkit`; desktop code imports them
rather than duplicating startup behavior.
