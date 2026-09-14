# Security

## Supported versions

Groam has not published a stable release yet. Security fixes are applied to the
`main` branch; older commits and unofficial builds are not supported.

| Version         | Supported                                  |
| --------------- | ------------------------------------------ |
| `main`          | Yes                                        |
| Tagged releases | No tagged releases are currently available |

## Reporting a vulnerability

Report suspected vulnerabilities with GitHub's
[private vulnerability reporting](https://github.com/nicksan222/groam/security/advisories/new).
This channel shares the report only with repository maintainers. Do not open a
public issue, discussion, or pull request for an unfixed vulnerability.

Include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept if you have one
- Affected versions or commit SHAs if you know them
- Any known mitigations and your preferred disclosure timeline

Do not include unnecessary personal data, production credentials, or data from
systems you do not own or have permission to test.

## What to expect

Maintainers aim to acknowledge a report within three business days and provide
an initial assessment or status update within seven business days. These are
targets rather than guarantees and may vary with impact and complexity. We will
keep the reporter informed when there is meaningful progress and may ask for
additional reproduction details.

## Coordinated disclosure

Please allow maintainers a reasonable opportunity to investigate and prepare a
fix before publishing details. We will coordinate a disclosure date with the
reporter when practical. Once a fix or mitigation is available, maintainers may
publish a GitHub Security Advisory that credits the reporter if they wish to be
identified.

Testing must stay within accounts and systems you own or are authorized to use.
Do not degrade service availability, access other users' data, or use social
engineering. Good-faith reports that follow this policy are welcomed.

## Local and desktop notes

- Group AI keys in **Settings → AI** are stored in the local Convex database
  and are never returned to the browser after save. Treat the Groam data
  directory as sensitive.
- Desktop data lives under the OS application-data directory (`groam-data`).
  Use **Settings → Data** to export or restore it.
- The packaged desktop app talks only to the local Convex runtime on
  `127.0.0.1`. Optional features (place search, map tiles, stock covers, and
  cloud LLM providers) call the public internet when you use them.
