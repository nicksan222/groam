FROM ghcr.io/casey/just:1.58.0 AS just

# Trixie (glibc 2.41): the Convex local backend binary needs glibc >= 2.39.
FROM mcr.microsoft.com/devcontainers/javascript-node:24-trixie

# Tool pins live only here (devcontainer.json passes no build args). Each ARG
# sits beside the layer that uses it so a bump rebuilds only that layer and
# the ones after it; layers are ordered from least to most frequently bumped.

COPY --from=just /just /usr/local/bin/

# Native build tools plus the shared libraries Playwright's Chromium needs for
# Vite+ browser-mode tests and journeys.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    file \
    libasound2t64 \
    libatk-bridge2.0-0t64 \
    libatk1.0-0t64 \
    libatspi2.0-0t64 \
    libcairo2 \
    libcups2t64 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0t64 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    python3 \
    ripgrep \
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

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
