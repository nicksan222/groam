/** CSS viewport and physical pixels are deliberately separate. */
export const desktopCapture = {
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 2,
  colorScheme: 'dark',
  format: 'png'
} as const;

export const cinemaPresentation = {
  width: 3840,
  height: 2160,
  fps: 60,
  introSeconds: 0,
  outroSeconds: 0,
  transitionSeconds: 0.65
} as const;

/** The whole browser frame scales as one surface, including its chrome. */
export const browserChromeHeight = 64;

export const designCanvas = { width: 1920, height: 1080 } as const;
