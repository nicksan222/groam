import { cleanEnv, str, url } from 'envalid';
import { APP_SHELLS, resolveAppShell } from '#src/lib/app-shell';
import { clientEnvString } from '#src/lib/client-env';
import { env as authEnv } from './auth-client';

const shell = resolveAppShell(clientEnvString(import.meta.env.VITE_GROAM_SHELL));

const DEFAULT_MAP_TILES_URL = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';

const validated = cleanEnv(
  {
    BASE_URL: import.meta.env.BASE_URL,
    MODE: import.meta.env.MODE,
    VITE_GROAM_SHELL: shell,
    VITE_MAP_TILES_URL: clientEnvString(import.meta.env.VITE_MAP_TILES_URL),
    VITE_PHOTON_URL: clientEnvString(import.meta.env.VITE_PHOTON_URL),
    VITE_SITE_URL: clientEnvString(import.meta.env.VITE_SITE_URL)
  },
  {
    BASE_URL: str({ default: '/' }),
    MODE: str({ default: 'development' }),
    VITE_GROAM_SHELL: str({ choices: [...APP_SHELLS], default: 'web' }),
    VITE_MAP_TILES_URL: str({
      default: DEFAULT_MAP_TILES_URL,
      desc: 'Raster tile URL template. Use OSM or a self-hosted tile server when CARTO is unreachable.'
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
  baseUrl: validated.BASE_URL,
  isDesktop: validated.VITE_GROAM_SHELL === 'desktop',
  isWeb: validated.VITE_GROAM_SHELL === 'web',
  mapTilesUrl: validated.VITE_MAP_TILES_URL,
  mode: validated.MODE,
  photonUrl: validated.VITE_PHOTON_URL,
  shell: validated.VITE_GROAM_SHELL,
  siteUrl: validated.VITE_SITE_URL
} as const;
