# A private demo group for every new user

Status: approved on 2026-10-26 with the addition of agent work throughout.

## Intent

New travelers should land in useful example content and explore Groam before
planning their own trip. The user selected a separate private Demo group rather
than adding examples to the first real group they create. The requested delivery
is a verified pull request, without merging or deploying it.

## Approaches

- **Private demo group at account creation (selected):** every new account owns
  its own example data. Real groups start clean, and normal group switching and
  deletion remain available. This adds one group per account.
- **Examples in the first real group:** less initial data, but mixes examples
  with real planning. The user declined this approach.
- **Shared demo group:** cheaper to populate, but edits and membership would be
  shared between unrelated users. This does not satisfy private exploration.

## User experience and scope

Create a group named **Demo group**, owned only by the new user. Do not create
fake accounts, invite anyone, or share sample content across accounts. Add
clearly identified, editable example content using normal product records:

- One compact trip with a destination, a short itinerary, accommodation,
  transport, sample costs, and shared and personal packing items.
- An idea with an actual proposed itinerary change, demonstrating review.
- Planning issues and linked research with explanatory example text.
- An example discussion and poll if the product supports a single participant;
  do not weaken membership rules or add fake travelers to enable them.
- Clearly labeled, precomputed examples of Groam chat, issue-agent work,
  idea-reviewer feedback, and researcher reports, using terminal run history.
  Never seed live queued/running jobs or start models during account creation.

Exact destination, names, counts, and wording are implementation decisions.
Prefer a small coherent trip to the full multi-account local fixture set. All
bookings, prices, and planning notes must read as examples rather than verified
travel information. Dates must not make the example immediately obsolete.

The existing organization activation flow should select the demo group on first
entry. Creating and joining real groups continues through the existing flows.
Joining via an invitation must still lead to the invited group when that flow
explicitly activates it. Existing accounts receive no backfill.

Users may edit or delete the demo group and its contents through the existing
controls. Signing in again must never restore deleted examples or overwrite edits.

## Backend design

Use the existing Better Auth user-creation trigger as the sole automatic entry
point. Put the onboarding implementation in an app-owned backend module; it is
not a public seed API and does not trust a client-supplied user identity.

Create the group, owner membership, and bounded sample records transactionally
where supported by the component trigger. Make repeated initialization harmless
using a durable per-user completion identity, independent of the editable group
name and retained if the demo is deleted. If a seed write fails, do not leave a
partially populated group or record successful initialization. The implementation
must verify actual trigger/transaction behavior before choosing the final wiring.

Reuse sound domain writes and extract shared helpers only when needed. Existing
local-only seed endpoints must remain local-only. Do not import the CLI seeder
into the backend, reset rate-limit buckets, relax product authorization, or
depend on a signed-in session inside the creation trigger. Preserve normal
ownership, trip indexing, and cleanup behavior.

No model calls, paid operations, checkout, real bookings, external lookup, or
email is needed to create the examples. Trying AI capabilities continues to use
the user's normal ChatGPT connection. The sole owner must be able to open and
edit all seeded records without buying a seat.

## Verification and delivery

Exercise actual signup through the shared Better Auth test harness. Verify that
two signups receive different groups and data, each owner can read and edit their
examples, and another account cannot access them. Verify repeat initialization,
sign-in, deletion followed by sign-in, and failure rollback. Cover first-entry
activation and invitation activation using existing focused tests as appropriate.

Update tests that currently assume every new account has no organizations;
preserve explicit coverage of accounts without groups. Check that local seeding
continues to choose its intended groups rather than populating the demo group.
Run backend tests, typechecks, conventions and formatting, and relevant broader
checks supported by the workspace toolchain. Obtain an independent code review,
resolve substantive findings, and open and register the PR with test evidence.

## Non-goals

No onboarding wizard, demo reset button, special read-only sandbox, fake
collaborators, existing-user migration, or production deployment is included.
This PR demonstrates available workflows with sample data; it does not pretend
that AI work has run or that a real group has participated in decisions.
