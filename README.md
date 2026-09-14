# Groam

Groam is a collaborative group travel planning app. Run it on your machine, or
host it on Convex Cloud.

It is licensed under the [MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md)
to develop locally.

## Run locally (open source)

Nothing needs a Convex Cloud account. The CLI uses an anonymous local backend.

```bash
just install
just dev
```

While the backend is running, seed demo data in another terminal:

```bash
just seed
```

Then open [http://localhost:5173](http://localhost:5173) and sign in as
`demo@groam.example` / `GroamDemo123!`. That owner already has the “Groam Demo”
workspace. Re-seed anytime (local backend must be running) with `just seed`.

Add an AI key in **Settings → AI** (OpenAI, Anthropic, Google, OpenRouter, or a
local OpenAI-compatible host such as Ollama). The key stays private to the
active group. Convex dashboard environment variables remain an optional
fallback.

`http://127.0.0.1:3211/` returns `503` during `bun run dev` because Vite serves
the app on `:5173`. That is expected.

## Showcase videos

`tooling/showcase` records scripted multi-user app flows and renders them with
Remotion. Edit `tooling/showcase/video.ts` for the complete 3-minute-52-second story:
trip creation, browsing ideas, reviews, approvals, date changes, merges and chat.
The result uses dark 4K desktop views and quick screen transitions.
With the local app running:

```bash
just showcase
```

`just showcase` resets local data and runs the full realistic seed before
recording, clearing old E2E fixtures. Use `just showcase-studio` to review the timeline. Capture, edit and render
are separate commands so video editing does not repeat app actions. See the
[showcase authoring guide](tooling/showcase/README.md) for the working two-user
example, custom scenarios, layouts, sound and validation commands.

## Desktop app

Install Groam from the latest GitHub Release (Linux `.deb`, macOS Apple Silicon
`.dmg`, Windows NSIS `.exe`). The installer starts a local Convex runtime at
`http://127.0.0.1:3211/` and stores data in the OS application-data directory.

After you open the app:

1. Create a group (or sign in if you already have one).
2. Add an AI API key in **Settings → AI**, or point Groam at Ollama
   (`http://127.0.0.1:11434/v1`).
3. Use **Settings → Data** to export or restore the local database.

Installed copies update themselves on launch from the latest GitHub Release.
Linux auto-updates require the `.AppImage`; `.deb` installs update manually.

Develop the desktop app from this repo:

```bash
just desktop
```

On Debian, Ubuntu, or WSL:

```bash
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

The packaged app bundles Bun and a Convex local-backend sidecar so you do not
need those tools on `PATH`. First launch copies the backend into the app data
directory instead of downloading it.

### Maps, place search, and covers

Destination search uses [Photon](https://photon.komoot.io) by default, map
tiles use CARTO, and automatic trip covers use Wikimedia Commons. Those calls
need the public internet. When they are unreachable, Groam shows an offline
empty state and you can still type place names or upload a cover.

To point search or tiles at a host you run yourself, set at build time:

```bash
VITE_PHOTON_URL=http://127.0.0.1:2322
VITE_MAP_TILES_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

Desktop packaging generates the WebView CSP from those origins so a packaged
installer can reach the same hosts as the web build.

Photon is a geocoder in front of OpenStreetMap data. See
[komoot/photon](https://github.com/komoot/photon) to self-host it. OSM tile
usage is subject to the [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/);
prefer your own tile server for heavy use.

---

## Go Live (Convex Cloud)

Nothing needs to run locally for cloud hosting.

## 1. Add the one secret

Sign in at [dashboard.convex.dev](https://dashboard.convex.dev), create a
personal access token in account settings, then add it in GitHub:

**Repository → Settings → Secrets and variables → Actions → New repository secret**

```text
Name:  CONVEX_ACCESS_TOKEN
Value: <your Convex personal access token>
```

## 2. Bootstrap everything

Open **GitHub → Actions → Bootstrap Groam → Run workflow**.

The workflow automatically:

- creates the `groam` Convex project if needed;
- creates permanent `beta` and `prod` Convex environments;
- runs the complete CI suite;
- configures Better Auth secrets;
- deploys the backend and pending migrations to both environments;
- deploys the `web` site to both environments;
- smoke-tests every hosted route; and
- records the live URLs on the GitHub `beta` and `prod` environments.

When **Bootstrap Groam** is green, both environments are online.

## 3. Deploy updates

Use the GitHub Actions page:

- **Deploy Environment** — test and deploy the backend, migrations, and every
  site to either `beta` or `prod`.
- **Deploy Site** — independently deploy only `web` to either
  environment.
- **Run Migrations** — independently resume migrations in either environment.

Every pull request and push to `main` automatically runs **CI**. Every
successful CI run on `main` publishes a GitHub Release with desktop installers
and the signed `latest.json` manifest installed apps poll for updates.

Cloud and desktop can both store a private group key in **Settings → AI**.
Convex dashboard environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
or `GOOGLE_GENERATIVE_AI_API_KEY`) remain an optional fallback. See
[`packages/backend/convex/README.md`](packages/backend/convex/README.md).
