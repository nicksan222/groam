# Desktop

Everything specific to the packaged desktop application lives here:

- `scripts/` builds, stages, signs, and releases the Tauri application.
- `runtime/` is shipped with the application and starts its local Convex services.
- `src-tauri/` owns the native shell and bundled resources.

Cross-client process and environment helpers stay in `@groam/devkit`; desktop code imports them
rather than duplicating startup behavior.

## Releases

The `Release` GitHub Actions workflow runs every Monday at 06:17 UTC and can also be started
manually from `main` by entering `release` as confirmation. Every release runs the full quality,
browser, and cross-platform desktop build before publishing signed installers, updater artifacts,
and generated release notes to GitHub Releases.
