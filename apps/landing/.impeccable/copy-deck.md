# Groam copy deck

Exact strings for every page of the marketing site. Use them as written.

## Voice rules for anyone editing this deck

- Plain, warm, specific. Short sentences, active voice.
- Talk like a traveler. Say "the plan", "the group", "Saturday". Never "workflow", "seamless", "leverage", "empower", "unlock", "supercharge", "solution", "platform".
- Use concrete trip moments in place of adjectives. "Nobody has booked Friday dinner" beats "stay organized".
- No em-dash asides, no "not X but Y", no colon reveals, no exclamation marks, no eyebrow labels above headings.
- Say "AI agents" or "agents", never "bots". Say "idea", never "proposal" or "PR".
- Facts only. No stats, customer counts, testimonials, logos, awards, uptime, security badges, or integrations other than ChatGPT.
- Never mention open source, GitHub, self-hosting, or licensing.
- Pricing copy never describes a checkout, card processor, refund terms, or invoices. Paid invites are not live yet.
- Example data (Lisbon long weekend, Maya, Jonas, Priya, Sam) is always shown next to an "Example trip" label.

Vocabulary: trip, plan, itinerary, traveler, group, idea, issue, conversation, agent, apply, approve, ask for changes.

---

## Global

### Navigation

| Slot | String |
| --- | --- |
| Primary links | Features · Pricing |
| Secondary action | Sign in |
| Primary action | Start a trip |
| Mobile menu button (aria-label) | Menu |
| Mobile menu headings | Features · Pricing |

### Footer

| Slot | String |
| --- | --- |
| Brand line | Plan together. Go further. |
| Column 1 heading | Features |
| Column 1 links | Live itinerary · Ideas · Issues · Conversations · AI agents |
| Column 2 heading | Product |
| Column 2 links | Pricing · Sign in · Start a trip |
| Column 3 heading | Legal |
| Column 3 links | Privacy · Terms |

### Closing call (shared on every page, page-agnostic)

- Heading: **Your next trip starts with one idea.**
- Button: **Start a trip**
- Fine line: Plan on your own for free. Bring the group in when you're ready.

---

## Home (/)

**Meta title:** Groam · Plan group trips together
**Meta description:** One shared plan for your group trip. Suggest changes, agree on them together, and plan alongside AI agents that know the trip.

### Hero

- Headline: **Get the trip out of the group chat.**
- Sub: Groam gives your group one shared plan. Anyone can suggest a change, everyone sees it, and nothing moves until the group says yes. AI agents plan right beside you.
- Primary button: **Start a trip**
- Secondary button: **See how it works** (anchors to the four-kinds section)
- Fine line: Free to plan on your own. AI runs on your own ChatGPT account.
- Activity card label: Example trip

### Example-trip ribbon (infinite marquee)

Ribbon label (visually hidden, for screen readers): Example trips

All entries are fictional examples.

1. Lisbon long weekend · 2 ideas open
2. Dolomites hut to hut · route approved
3. Kyoto in cherry season · 1 issue left
4. Porto with the cousins · plan agreed
5. Iceland Ring Road · day 6 in review
6. Amalfi birthday trip · dinner idea applied
7. Berlin long weekend · 3 issues closed
8. Marrakech and the Atlas · train idea revised
9. Copenhagen by bike · 5 travelers in
10. Highlands road trip · agent reviewing the route
11. Sicily family summer · ferry issue open
12. Vienna Christmas markets · new idea from Jonas

### Four kinds of entries

- Heading: **Every part of the plan has a place**
- Lede: Changes, loose ends, chat, and AI help all live inside the trip, right next to the plan they touch. Nobody has to dig through a thread to learn what was decided.

| Chip | Body |
| --- | --- |
| Idea | A suggested change to the plan. The group looks it over, asks for tweaks, and applies it once everyone is happy. |
| Issue | Something the trip still needs, like a dinner nobody has booked. It closes by itself when the idea that fixes it is applied. |
| Conversation | Group chat with replies and reactions, kept inside the trip it's about. |
| Agent | AI help that knows the trip and the screen you're on. Specialized agents can work on ideas and issues. |

### One idea, start to finish

- Heading: **Nothing changes until the group says yes**
- Lede: Follow one change on the example trip. Maya wants Saturday in Sintra instead of Belém.

Steps:

1. **Propose.** Maya bundles three edits into one idea. The live plan stays exactly as it was.
2. **Review.** The itinerary agent checks what the change affects. Sam asks for an earlier train, Maya revises, and the group approves.
3. **Apply.** Maya applies the idea. Saturday moves to Sintra for everyone at once.

Example card strings:

- Title: Swap Belém for Sintra
- Byline: Idea by Maya · Lisbon long weekend
- Status chip: Applied
- Agent note: **Itinerary agent** This replaces the only free Saturday morning. Fado at 21:00 still fits after the train back.
- Votes: Jonas approved · Priya approved · Sam approved once the train moved to 09:30
- Footer: Example trip · Applied Tue 13:05

### Pricing teaser

- Heading: **Plan for free. Pay €1 per friend, once.**
- Body: Planning on your own costs nothing. Each traveler you bring into a trip is €1, one time, and then they're covered on every future trip. No subscription, and no AI fee.
- Link: **See how pricing works**

### Closing

Use the shared closing call.

---

## Features hub (/features)

**Meta title:** Features · Groam
**Meta description:** A live itinerary, ideas the group approves, issues that close themselves, trip chat, and AI agents that know the trip. All in one place.

- Headline: **Everything a group trip needs, in one place**
- Lede: One live plan, a way to suggest changes without breaking it, loose ends that close themselves, chat that stays with the trip, and AI that knows what you're looking at.

Cards (title, blurb, link label "Read more"):

| Feature | Blurb |
| --- | --- |
| Live itinerary | Places, dates, activities, notes, and a cover photo in one plan the whole group sees. |
| Ideas | Suggest a change, let the group weigh in, and apply it only when everyone agrees. |
| Issues | Write down what the trip still needs. It closes itself once the fix is applied. |
| Conversations | Chat, replies, and reactions that stay with the trip they're about. |
| AI agents | Ask about the trip or the screen you're on, and get the itinerary reviewed. |

Closing line above the shared closing call: Each one works on its own. Together they take a trip from a vague idea to a plan everyone signed off on.

---

## Feature: Live itinerary (/features/itinerary)

**Meta title:** Live itinerary · Groam
**Meta description:** (uses lede)

- Menu summary (≤12 words): One shared plan with every place, date, and activity.
- Headline: **The plan everyone is looking at**
- Lede: Destinations, dates, day-by-day activities, notes, and a trip cover in one itinerary. When it changes, it changes for the whole group.

Body sections:

1. **One copy of the plan.** There is no "latest version" to hunt for. Every traveler opens the same itinerary and sees the same Saturday.
2. **Day by day, with the details.** Add destinations, dates, and activities, then leave notes where they matter. The train time sits next to the train.
3. **A cover that makes it feel real.** Give the trip a cover image so it looks like somewhere you're going.
4. **Changes arrive through ideas.** Edits to a shared plan go through the group first, so the itinerary stays something everyone agreed to.

Animation caption: Saturday on the example trip, as every traveler sees it.

Back-and-forth demo:

- Toggle labels: **Before** / **After**
- Before: Saturday · 10:00 Belém walking tour
- After: Saturday · 09:30 Train to Sintra · 11:00 Pena Palace
- Caption under demo: Same trip, same screen, for all four travelers.

---

## Feature: Ideas (/features/ideas)

**Meta title:** Ideas · Groam
**Meta description:** (uses lede)

- Menu summary: Suggest a change. The group says yes before it lands.
- Headline: **Suggest anything. Change nothing until everyone agrees.**
- Lede: Bundle your edits into an idea. The group looks it over and approves or asks for changes. The live plan stays put until someone applies it.

Body sections:

1. **Bundle the whole change.** Swapping a day trip touches the train, the morning, and lunch. Put all of it in one idea so the group judges it as a whole.
2. **See exactly what moves.** Travelers inspect each added and removed item before saying yes. No surprises on the morning of.
3. **Ask, revise, try again.** Anyone can request changes. The author revises the same idea, and the conversation about it stays attached.
4. **Apply when it's agreed.** Applying the idea updates the itinerary for everyone in one step. Until then, the plan people rely on doesn't budge.

Animation caption: Maya's Sintra idea on the example trip, from proposed to applied.

Back-and-forth demo:

- Step labels: **Proposed** / **Changes requested** / **Applied**
- Proposed: Train to Sintra at 10:30. The live plan still shows Belém.
- Changes requested: Sam asks for an earlier train. Maya moves it to 09:30.
- Applied: Saturday is Sintra for everyone.

---

## Feature: Issues (/features/issues)

**Meta title:** Issues · Groam
**Meta description:** (uses lede)

- Menu summary: Loose ends that close themselves once they're fixed.
- Headline: **Loose ends that close themselves**
- Lede: Turn "someone should book dinner" into an issue the whole group can see. Link the idea that fixes it, and the issue closes when that idea is applied.

Body sections:

1. **Write it down where the group can see it.** "Nobody has booked Friday dinner" stops being a message that scrolls away. It becomes an issue on the trip.
2. **Fix it with an idea.** Propose the fix as an idea and link it to the issue. The group reviews the fix like any other change.
3. **Closed when the fix lands.** Apply the linked idea and the issue closes on its own. Nobody has to remember to tick it off.
4. **Let an agent take a first pass.** A specialized issue agent can work on an issue with you, and its fix goes to the group for review like anyone else's.

Animation caption: Friday dinner on the example trip, from loose end to closed.

Back-and-forth demo:

- Step labels: **Open** / **Fix proposed** / **Closed**
- Open: Book Friday dinner for 4.
- Fix proposed: Idea linked. Table for 4 in Alfama, Friday 20:30.
- Closed: The idea was applied, so the issue closed itself.

---

## Feature: Conversations (/features/conversations)

**Meta title:** Conversations · Groam
**Meta description:** (uses lede)

- Menu summary: Group chat that lives inside the trip it's about.
- Headline: **Talk it over right next to the plan**
- Lede: Every trip has its own conversations, with replies and reactions. The talk sits beside the plan it's about, so nobody scrolls back weeks to find a decision.

Body sections:

1. **Chat that belongs to the trip.** Conversations live inside the trip, away from the family chat, the work chat, and everything else.
2. **Reply to the exact message.** Answer a question directly so the thread still makes sense a week later.
3. **React and move on.** A quick reaction says "fine by me" without another message for everyone to read.
4. **Talk here, decide in ideas.** When the chat lands on a change, turn it into an idea and the group can approve it properly.

Animation caption: The example trip's chat the evening before Sintra.

Back-and-forth demo:

- Step labels: **Message** / **Reply** / **Reaction**
- Message: Jonas · Who wants the 09:30 train?
- Reply: Priya · Me. I'll meet you at Rossio.
- Reaction: Sam reacted with a thumbs-up

---

## Feature: AI agents (/features/ai)

**Meta title:** AI agents · Groam
**Meta description:** (uses lede)

- Menu summary: AI that knows the trip and the screen you're on.
- Headline: **AI that knows which trip you mean**
- Lede: Ask about the trip and whatever is on your screen. Get the itinerary reviewed, and let specialized agents help with ideas and issues.

Body sections:

1. **Ask about what you're looking at.** The assistant knows the trip and the screen in view. Ask "does Saturday still work?" without explaining which Saturday.
2. **A second pair of eyes on the plan.** Ask for an itinerary review and get notes on timing and gaps before the group commits.
3. **Agents that work on ideas and issues.** Specialized agents can draft ideas and work through issues. Their changes go to the group for review, like everyone else's.
4. **Runs on your own ChatGPT account.** Connect your ChatGPT account in Settings → AI. Groam doesn't charge anything extra for AI.

Animation caption: The itinerary agent reviewing Saturday on the example trip.

Back-and-forth demo:

- Step labels: **You ask** / **Agent answers**
- You ask: Does the Sintra idea clash with anything?
- Agent answers: It replaces the only free Saturday morning. Fado at 21:00 still fits after the train back.

---

## Pricing (/pricing)

**Meta title:** Pricing · Groam
**Meta description:** Planning on your own is free. Each traveler you bring into a trip is €1, once, and then covered on every future trip. No subscription.

- Headline: **Free to plan. €1 per friend, once.**
- Lede: Plan on your own for free. Each traveler you bring into a trip costs €1, one time. After that, they're covered on every future trip. There's no subscription.

### How it works

Plan heading: **One price, paid once per person**

- **Planning on your own is free.** Create trips, build the itinerary, and use every feature. The person organizing never pays for themselves.
- **€1 for each traveler you bring in.** Invite someone to a trip and they cost €1, one time.
- **Covered for good.** Once a traveler is covered, they're covered on every future trip. You never pay for the same person twice.
- **No subscription. No AI fee.** Nothing renews. AI features run on each traveler's own ChatGPT account.

### Worked example

Heading: **Four friends to Lisbon costs €3**

Maya plans a long weekend in Lisbon and invites Jonas, Priya, and Sam. Maya is the organizer, so she plans free. Jonas, Priya, and Sam are €1 each. That's 4 people on the trip for €3, paid once.

The next spring, Maya plans Porto with Jonas and a new friend, Lena. Jonas is already covered. Lena is €1. That trip costs €1.

### What's included

Heading: **Everything, for everyone on the trip**

- A live itinerary with destinations, dates, activities, notes, and a trip cover
- Ideas the group can inspect, approve, revise, and apply
- Issues that close when their fix is applied
- Trip conversations with replies and reactions
- AI help and specialized agents, using your own ChatGPT account
- Every future trip for every traveler who's covered

### Calculator

- Heading: **Work out your trip**
- Input 1 label: **Travelers you're inviting**
- Input 1 hint: Don't count yourself. Organizers plan free.
- Input 2 label: **Already covered from an earlier trip**
- Input 2 hint: People you've brought before cost nothing.
- Result (n new travelers, n ≥ 2): **€{n}, paid once.** {n} new travelers at €1 each.
- Result (n = 1): **€1, paid once.** 1 new traveler.
- Result (n = 0): **€0.** Everyone on this trip is already covered, or you're planning on your own.
- Result footnote: Paid invites are coming soon. Nobody is charged today.

### FAQ

Heading: **Questions people ask**

**Is there a subscription?**
No. Nothing renews monthly or yearly. You pay €1 once for each traveler you bring in, and that's it.

**Do I pay again for the same person on the next trip?**
No. Once a traveler is covered, they're covered on every future trip.

**Does the organizer count as a traveler?**
No. Planning on your own is free, so the person who starts the trip never pays for themselves. A trip for four, counting you, costs €3.

**What about AI costs?**
Groam doesn't charge for AI. AI features run on the ChatGPT account each traveler connects in Settings → AI.

**Who pays?**
The person who brings a traveler into the trip. If you invite three friends, the €3 is yours.

**What if someone never joins?**
> DECISION NEEDED before launch. Recommended answer, if confirmed: "You only pay for travelers who actually join the trip. An invite nobody accepts costs nothing."
> Until confirmed, use: "Paid invites aren't live yet, so an unanswered invite costs nothing today."

**When do I pay?**
Not yet. Paid invites are coming soon, and nobody is charged for inviting travelers today. Plan and invite your group as usual.

**Is anything held back for paying travelers?**
No. Every traveler gets every feature. The €1 covers a person for good.

---

## 404

**Meta title:** Page not found · Groam
**Meta description:** This page doesn't exist. Head back to Groam.

- Heading: **Nothing planned at this address**
- Lede: The link may be old or mistyped. The rest of the trip is right where you left it.
- Button: **Back to home**
- Secondary link: **See features**

## Privacy (/privacy)

**Meta title:** Privacy · Groam
**Meta description:** What Groam collects when you plan a trip, why, and the choices you have.

- Heading: **Privacy**
- Lede: What Groam collects when you plan a trip with us, why we need it, and the choices you have.

## Terms (/terms)

**Meta title:** Terms · Groam
**Meta description:** The agreement between you and Groam when you use it to plan trips.

- Heading: **Terms**
- Lede: The agreement between you and Groam when you use it to plan trips with your group.
