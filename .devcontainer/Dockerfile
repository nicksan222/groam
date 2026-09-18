FROM ghcr.io/astral-sh/uv:0.11.17 AS uv
FROM ghcr.io/casey/just:1.58.0 AS just

FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

ARG PI_VERSION=0.83.0
ARG GRAPHIFY_VERSION=0.9.63
ARG GRAPHIFY_EXCLUDE_NEWER=2026-09-18

COPY --from=uv /uv /uvx /usr/local/bin/
COPY --from=just /just /usr/local/bin/

# Tauri 2 Linux prerequisites (https://tauri.app/start/prerequisites/) plus the
# extra packages from tauri-apps/tauri-action's GitHub workflow.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    file \
    libayatana-appindicator3-dev \
    libgtk-3-dev \
    librsvg2-dev \
    libssl-dev \
    libwebkit2gtk-4.1-dev \
    libxdo-dev \
    patchelf \
    python3 \
    ripgrep \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Pi runs inside the container boundary while its user-level configuration and
# credentials are supplied by explicit Dev Container mounts.
RUN npm install --global --ignore-scripts \
    "@earendil-works/pi-coding-agent@${PI_VERSION}" \
  && npm cache clean --force

# Graphify stays isolated from the Bun workspace. Code-only indexing is local
# and needs neither an API key nor an external graph database. The resolver
# cutoff prevents transitive dependencies from drifting in future rebuilds.
RUN UV_TOOL_DIR=/opt/uv/tools \
    UV_TOOL_BIN_DIR=/usr/local/bin \
    uv tool install \
      --exclude-newer "${GRAPHIFY_EXCLUDE_NEWER}" \
      --python /usr/bin/python3 \
      "graphifyy==${GRAPHIFY_VERSION}" \
  && rm -rf /root/.cache/uv
