# Deployment

Owns the production release from build through publishing and public route checks. Backend HTTP
routing stays with the backend; release orchestration lives here.

Use the root `build:production`, `deploy:production`, and `smoke:production` scripts. Publishing is
restricted to the trusted main-branch GitHub Actions workflow. Both frontend builds run without a
deploy key, and a release manifest binds their contents to the tested commit and destination.

See [deployment setup and operation](../../docs/deployment.md) for the owner setup and release flow.
