import { bool, cleanEnv, str, url } from 'envalid';

const validated = cleanEnv(process.env, {
  CI: bool({ default: false }),
  CONVEX_AGENT_MODE: str({ default: 'anonymous' }),
  VITE_MAP_TILES_URL: url({
    default: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
  }),
  VITE_PHOTON_URL: url({ default: 'https://photon.komoot.io' })
});

export const env = {
  convexAgentMode: validated.CONVEX_AGENT_MODE,
  isCI: validated.CI,
  mapTilesUrl: validated.VITE_MAP_TILES_URL,
  photonUrl: validated.VITE_PHOTON_URL
} as const;
