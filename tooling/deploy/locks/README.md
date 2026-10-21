# Void locks

One directory per environment (`production/`, `beta/`), each holding `web.void.lock.json` and
`landing.void.lock.json`. Create them with the first `void deploy --platform cloudflare` in
`apps/web` and `apps/landing` (with `GROAM_ENVIRONMENT` set), then move each generated
`void.lock.json` here and commit it. Right after that first web deploy, run
`void secret put AUTH_EMAIL_RELAY_SECRET` in `apps/web` with the value set in Convex. Releases
refuse to run without the locks.
