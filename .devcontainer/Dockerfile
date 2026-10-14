FROM ghcr.io/astral-sh/uv:0.11.17 AS uv
FROM ghcr.io/casey/just:1.58.0 AS just

# Trixie (glibc 2.41): the Convex local backend binary needs glibc >= 2.39.
FROM mcr.microsoft.com/devcontainers/javascript-node:24-trixie

ARG CLAUDE_VERSION=2.1.287
ARG HERDR_VERSION=0.9.3
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

# Checksum-pinned Herdr builds for both container architectures.
RUN set -eu; \
    case "$(uname -m)" in \
      x86_64) arch=x86_64; checksum=18a8dc65f1c2fa485884344356dea1cfd911c6f06cf46fa78e193f4087f4dba7 ;; \
      aarch64) arch=aarch64; checksum=4de7aa3e25678812e92960de64f7c2aaa1bca1f0f80a3c5e559837e231e1f5c0 ;; \
      *) echo "Unsupported Herdr architecture" >&2; exit 1 ;; \
    esac; \
    curl -fsSL -o /tmp/herdr \
      "https://github.com/herdrdev/herdr/releases/download/v${HERDR_VERSION}/herdr-linux-${arch}"; \
    printf '%s  /tmp/herdr\n' "$checksum" | sha256sum --check; \
    install -m 755 /tmp/herdr /usr/local/bin/herdr; \
    rm /tmp/herdr

# Native Claude; credentials are host-mounted and auto-updates disabled.
USER node
ENV PATH="/home/node/.local/bin:${PATH}"
ENV DISABLE_AUTOUPDATER=1
RUN curl -fsSL https://claude.ai/install.sh -o /tmp/install-claude.sh \
  && bash /tmp/install-claude.sh "${CLAUDE_VERSION}" \
  && rm /tmp/install-claude.sh \
  && claude --version

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
USER root
RUN ln -sf "${VP_BIN_DIR}/vp" /usr/local/bin/vp \
  && ln -sf "${VP_BIN_DIR}/vpr" /usr/local/bin/vpr \
  && ln -sf "${VP_BIN_DIR}/vpx" /usr/local/bin/vpx

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
