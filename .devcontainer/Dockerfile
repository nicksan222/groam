FROM ghcr.io/astral-sh/uv:0.11.17 AS uv
FROM ghcr.io/casey/just:1.58.0 AS just

# Trixie (glibc 2.41): the Convex local backend binary needs glibc >= 2.39.
FROM mcr.microsoft.com/devcontainers/javascript-node:24-trixie

# Tool pins live only here (devcontainer.json passes no build args). Each ARG
# sits beside the layer that uses it so a bump rebuilds only that layer and
# the ones after it; layers are ordered from least to most frequently bumped.

COPY --from=uv /uv /uvx /usr/local/bin/
COPY --from=just /just /usr/local/bin/

# Tauri 2 Linux prerequisites (https://tauri.app/start/prerequisites/) plus the
# extra packages from tauri-apps/tauri-action's GitHub workflow. libnss3 and
# libnspr4 are the only libraries Playwright's Chromium needs beyond them.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    file \
    libayatana-appindicator3-dev \
    libgtk-3-dev \
    libnspr4 \
    libnss3 \
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

# Python tools are isolated from the Bun workspace under /opt/uv/tools and run
# on trixie's /usr/bin/python3 (3.13). The *_EXCLUDE_NEWER resolver cutoffs
# (RFC 3339, UTC) freeze transitive dependencies across rebuilds; each must not
# predate its pinned release's upload time.

# Graphify: code-only indexing is local and needs neither an API key nor an
# external graph database.
ARG GRAPHIFY_VERSION=0.9.63
ARG GRAPHIFY_EXCLUDE_NEWER=2026-09-18T00:00:00Z
RUN UV_TOOL_DIR=/opt/uv/tools \
    UV_TOOL_BIN_DIR=/usr/local/bin \
    uv tool install \
      --exclude-newer "${GRAPHIFY_EXCLUDE_NEWER}" \
      --python /usr/bin/python3 \
      "graphifyy==${GRAPHIFY_VERSION}" \
  && rm -rf /root/.cache/uv

# Headroom compresses context before it reaches the model: `tooling/claude/claude.sh`
# runs Claude through its proxy and the root `.mcp.json` starts its MCP
# server. Proxy, MCP and code extras only; the ml/voice extras pull in torch.
ARG HEADROOM_VERSION=0.41.0
ARG HEADROOM_EXCLUDE_NEWER=2026-10-15T00:00:00Z
RUN UV_TOOL_DIR=/opt/uv/tools \
    UV_TOOL_BIN_DIR=/usr/local/bin \
    uv tool install \
      --exclude-newer "${HEADROOM_EXCLUDE_NEWER}" \
      --python /usr/bin/python3 \
      "headroom-ai[code,mcp,proxy]==${HEADROOM_VERSION}" \
  && rm -rf /root/.cache/uv

USER node
ENV PATH="/home/node/.local/bin:${PATH}"

# The Vite+ CLI (`vp`) runs every workspace task. Node comes from the base
# image, so skip the installer's Node shims and pin the install location.
ARG VP_VERSION=1.2.0
ENV VP_BIN_DIR=/home/node/.local/share/vite-plus/bin \
    VP_DATA_DIR=/home/node/.local/share/vite-plus \
    VP_CACHE_DIR=/home/node/.cache/vite-plus
RUN curl -fsSL https://vite.plus -o /tmp/install-vp.sh \
  && VP_VERSION="${VP_VERSION}" VP_NODE_MANAGER=no bash /tmp/install-vp.sh \
  && rm /tmp/install-vp.sh \
  && "${VP_BIN_DIR}/vp" --version

# Native Claude Code; credentials are host-mounted and auto-updates disabled.
# The VS Code extension runs its own bundled binary through the
# `claudeCode.claudeProcessWrapper` setting in devcontainer.json.
ARG CLAUDE_VERSION=2.1.287
ENV DISABLE_AUTOUPDATER=1
RUN curl -fsSL https://claude.ai/install.sh -o /tmp/install-claude.sh \
  && bash /tmp/install-claude.sh "${CLAUDE_VERSION}" \
  && rm /tmp/install-claude.sh \
  && claude --version

USER root
RUN ln -sf "${VP_BIN_DIR}/vp" /usr/local/bin/vp \
  && ln -sf "${VP_BIN_DIR}/vpr" /usr/local/bin/vpr \
  && ln -sf "${VP_BIN_DIR}/vpx" /usr/local/bin/vpx
