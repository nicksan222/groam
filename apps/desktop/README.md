# Desktop

Everything specific to the packaged desktop application lives here:

- `scripts/` builds, stages, signs, and releases the Tauri application.
- `runtime/` is shipped with the application and starts its local Convex services.
- `src-tauri/` owns the native shell and bundled resources.

Cross-client process and environment helpers stay in `@groam/devkit`; desktop code imports them
rather than duplicating startup behavior.

## ChatGPT connection

After signing in to Groam, open **Settings → AI → Continue with ChatGPT** to
connect a personal eligible account. Eligible AI usage counts against that user's
ChatGPT plan. Groam does not use developer API keys or shared workspace
credentials as a fallback.

Authorization opens the browser and returns to the local Convex HTTP server at
`http://127.0.0.1:3211/auth/chatgpt/callback`. Keep the desktop runtime running
through sign-in. Use the same settings page to reconnect or disconnect. Connecting
ChatGPT is separate from signing in to Groam. Shared remote backends require an
OpenAI-approved hosted plan-usage integration; a client ID alone is insufficient.

## Releases

The `Release` GitHub Actions workflow runs every Monday at 06:17 UTC and can also be started
manually from `main` by entering `release` as confirmation. Every release runs the full quality,
browser, and cross-platform desktop build before publishing signed installers, updater artifacts,
and generated release notes to GitHub Releases.
