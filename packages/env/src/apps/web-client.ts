import { cleanEnv, str, url } from 'envalid';
import { clientEnvString } from '#src/lib/client-env';
import { env as authEnv } from './auth-client';

const DEFAULT_MAP_TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const validated = cleanEnv(
  {
    VITE_MAP_TILES_URL: clientEnvString(import.meta.env.VITE_MAP_TILES_URL),
    VITE_PHOTON_URL: clientEnvString(import.meta.env.VITE_PHOTON_URL),
    VITE_SITE_URL: clientEnvString(import.meta.env.VITE_SITE_URL)
  },
  {
    VITE_MAP_TILES_URL: str({
      default: DEFAULT_MAP_TILES_URL,
      desc: 'Raster tile URL template. Defaults to the public OpenStreetMap tiles (no API key). Point at a self-hosted or keyed provider for heavy use.'
    }),
    VITE_PHOTON_URL: url({
      default: 'https://photon.komoot.io',
      desc: 'Photon geocoder origin. Point at a self-hosted Photon for offline place search.'
    }),
    VITE_SITE_URL: url({
      default: 'http://localhost:5173',
      desc: 'Public web application URL'
    })
  }
);

export const env = {
  ...authEnv,
  mapTilesUrl: validated.VITE_MAP_TILES_URL,
  photonUrl: validated.VITE_PHOTON_URL,
  siteUrl: validated.VITE_SITE_URL
} as const;
