# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary visitor is the trip organizer: the friend who always ends up planning the group trip. They arrive from a link or a search, usually while the plan is still scattered across a group chat, and decide whether to start a trip in Groam. Invited travelers also land here, but the site is written for the organizer.

## Product Purpose

Groam gives a group one shared trip plan. Anyone can suggest a change as an idea, the group reviews it, and the live plan changes only when someone applies it. AI agents work on the same trip next to the people. The marketing site succeeds when an organizer understands that mechanism and starts a trip.

## Positioning

The plan is a shared record with review before change: ideas are bundled edits that land only when applied, issues close themselves when the idea that fixes them is applied, and AI agents are authors on the same record as people. A group chat or a shared doc cannot truthfully claim that.

## Operating Context

The visitor compares Groam against the group chat, a shared spreadsheet or doc, and other trip planners. The primary action, "Start a trip", opens web app sign-up. Planning alone is free; the group joins later.

## Capabilities and Constraints

- Features: live itinerary, ideas, issues, trip conversations, AI help and specialized agents.
- AI features run on each traveler's own ChatGPT account. No AI fee.
- Pricing: free to plan on your own; €1 per invited traveler per trip, paid by the traveler or covered by a trip organizer (their choice per invite); the trip creator and solo trips are free. No subscription, no AI fee. When payments are enabled, invited travelers join through Stripe Checkout. Existing trips stay free, and payments are skipped when Stripe is not configured.
- Static Astro site in `apps/landing`; links into the web app.
- Vocabulary: trip, plan, itinerary, traveler, group, idea, issue, conversation, agent, apply, approve, ask for changes. Never "proposal", "bots", "platform", "workflow".

## Brand Commitments

- Name "Groam" and the two-pin Groam mark (`packages/brand`) stay. The landing may own a visual world distinct from the app UI (confirmed 2026-10-18); the app keeps its own system.
- Voice: plain, warm, specific, short sentences, concrete trip moments over adjectives. Rules live in `.impeccable/copy-deck.md`.
- Never market open source, GitHub, self-hosting, or licensing: licensing is undecided.

## Evidence on Hand

- Canonical example trip "Lisbon long weekend" with Maya, Jonas, Priya, Sam (`src/content/example-trip.ts`), always labelled "Example trip".
- No testimonials, customer counts, logos, stats, press, or integrations other than ChatGPT. Never fabricate them.
- Legal pages (privacy, terms) are drafts.

## Product Principles

- Show the mechanism at work; never only describe it.
- Keep proposed changes visibly distinct from the agreed plan.
- People and agents are both authors, and the visitor can always tell which is which.
- Illustrative data is always labelled as an example.

## Accessibility & Inclusion

Every self-running loop has a pause control, stops off screen, and rests on a finished, truthful still under reduced motion and without script.
