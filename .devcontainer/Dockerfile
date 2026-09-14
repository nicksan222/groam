FROM mcr.microsoft.com/devcontainers/javascript-node:24-bookworm

ARG PI_VERSION=0.83.0

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
    wget \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

# Pi runs inside the container boundary while its user-level configuration and
# credentials are supplied by explicit Dev Container mounts.
RUN npm install --global --ignore-scripts \
    "@earendil-works/pi-coding-agent@${PI_VERSION}" \
  && npm cache clean --force
