# Security

## Reporting a vulnerability

Please report security issues privately through GitHub Security Advisories on
this repository. Do not open a public issue for an unfixed vulnerability.

Include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept if you have one
- Affected versions or commit SHAs if you know them

We will acknowledge the report and work on a fix before any public disclosure.

## Local and desktop notes

- Group AI keys in **Settings → AI** are stored in the local Convex database
  and are never returned to the browser after save. Treat the Groam data
  directory as sensitive.
- Desktop data lives under the OS application-data directory (`groam-data`).
  Use **Settings → Data** to export or restore it.
- The packaged desktop app talks only to the local Convex runtime on
  `127.0.0.1`. Optional features (place search, map tiles, stock covers, and
  cloud LLM providers) call the public internet when you use them.
