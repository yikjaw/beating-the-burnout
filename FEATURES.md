# Feature list — Beating the Burnout

Every feature in the app, organized by screen/area. Written for judging: what it does, why it exists, and how it's implemented under the hood.

---

## 1. Authentication

- Email + password sign-up and sign-in
- Password confirmation field on sign-up with show/hide toggle
- Friendly, human-readable error messages for every auth failure (wrong password, existing account, weak password, etc.) instead of raw Supabase error text
- "Forgot password" flow: request reset email → reset password screen, full round trip
- Protected routes: signed-out users are redirected to `/login`; signed-in users can't see auth screens
- Session persists across reloads (Supabase Auth session storage)

## 2. Onboarding

- One-time screen: set a realistic weekly capacity (hours) for each of the five load areas
- Runs exactly once — after completion, it's never shown again unless the account genuinely has no capacity data (fixed a real race-condition bug where it could re-trigger incorrectly; see Engineering notes)
- Capacity can be changed any time afterward from **Settings**, with no need to redo onboarding

## 3. Home / Capacity dashboard

- One overall load percentage, computed from real booked hours vs. weekly capacity, adjusted by a "felt load" multiplier from recent check-ins (stress/energy/sleep)
- Deliberately **uncapped past 100%** — a student at 140% load needs to see 140%, not a bar that maxes out and hides the severity
- Five per-category rings (mental, time, physical, social, errands) so the student can see *which* area is the problem, not just an aggregate number
- "Running hot on: X, Y" flag line when specific categories are overloaded
- A single priority-ordered suggestion card, showing at most one at a time so the home screen never feels like a wall of notifications:
  1. **Recovery nudge** (something is actually wrong — sleep, heart rate, activity, overload, or stress streak)
  2. **Exam revision suggestion** (an unmet weekly revision target with free time available)
  3. **Free-time activity suggestion** (a nice-to-have, only shown when nothing more urgent applies)
- Primary action button that adapts to state: **"See what to move"** (links to the Balancer) when overloaded, **"Add something"** when there's room
- **"This week" list** — every open commitment due within 7 days, overdue, or with no deadline at all (explicitly excludes things due next month — a real bug that was found and fixed)
  - Each row has a 44px-tall tap target with a visual completion checkbox — tap to mark done without leaving the list
  - Tapping the row itself opens the full edit screen
  - A "+N more later — see Schedule" link surfaces anything excluded from the 7-day window

## 4. Commitments — full CRUD

- **Add**: title, category, effort hours (slider), due date, priority (High/Medium/Low), flexible toggle (can this be moved if things get tight?)
- **Edit**: every field above, pre-filled, reachable by tapping any commitment anywhere in the app (Home list, day timetable blocks)
- **Complete / reopen**: one tap to mark done from the Home list; a labelled toggle button on the edit screen to mark done or reopen a completed item
- **Delete**: inline two-step confirmation (no native browser `confirm()` dialogs, which are jarring and inaccessible) — tap Delete, then confirm "Yes, delete" or cancel
- **Bulk add**: used by AI timetable import and exam revision suggestions to create many commitments at once without a round trip per item

## 5. The Balancer

- The core differentiator of the app: when the week is overloaded, this isn't a suggestion box, it's a real algorithm
- Picks the lowest-priority, furthest-deadline, explicitly-flexible commitments first and proposes deferring them one week
- Shows the exact before/after in plain language: *"Move 'Read chapter 6' and 'Grocery run' to next week — that takes you from 118% to 91%."*
- **Accept**: defers the chosen commitments and logs the suggestion as accepted (for future tuning/analytics)
- **Reject** ("Not this one"): logs the suggestion as rejected without changing anything — the algorithm's proposals are recorded either way
- Graceful empty state when nothing needs to move ("You're at 62%. Either you're within capacity, or everything on your plate is fixed and can't move.")

## 6. Schedule (calendar view)

- Month calendar showing which days have commitments
- Per-day timetable rendered as a real hour-by-hour grid (6am–11pm window), with each commitment shown as a positioned, colored block sized to its duration
- Tap any block on the timetable to jump straight to editing that commitment
- Calm empty state ("Nothing scheduled — enjoy the space") instead of a blank grid

## 7. AI-powered timetable import

- Upload or photograph a class schedule (works with a phone camera via `capture="environment"`)
- Sends the image to a Supabase Edge Function, which calls **Google Gemini** (vision model) with a structured-output schema to extract every class: title, day of week, start time, end time
- **Review-before-save**: every detected class is editable (title, day, start/end time) and removable before anything is written to the database — the AI never writes directly
- **Recurrence control per class**: "Repeats weekly" vs. "Just this once" (e.g. for a one-off guest lecture caught in the same photo as a recurring class)
- **Term date range**: user specifies "from / until" dates, and the app expands each recurring class into one commitment per weekly occurrence across the whole term automatically — no manual re-entry every week

## 8. Wearable sync (Google Health)

- OAuth 2.0 connection flow with CSRF-safe one-time state tokens (validated server-side before any token exchange)
- Reads real **sleep** (minutes, efficiency) and **resting heart rate** data once connected
- Manual "Sync wearable data" action, shows the latest reading with date, resting HR, sleep duration/efficiency
- "Simulate poor sleep" / "Simulate high heart rate" buttons for demoing the recovery-nudge behavior without an actual wearable — clearly labelled as simulated data

## 9. Recovery nudges — closes the loop, doesn't just report

- A single pure function evaluates, in priority order, whether the student needs a nudge:
  1. **Poor sleep** (against the student's own recent baseline, not a fixed clinical threshold)
  2. **Elevated resting heart rate** (same — relative to their own recent readings)
  3. **Low activity**
  4. **Schedule overload** (load percentage itself)
  5. **Stress streak** (multiple consecutive high-stress check-ins)
- Each reason produces a specific, actionable nudge with real copy — never generic "you seem stressed"
- Accepting a nudge **writes a real protected commitment/calendar block** reserving recovery time — this was an explicit design requirement ("make it work, not just analytic"), not a passive chart

## 10. Free-time recommender

- Set a sleep schedule (bedtime/wake time) and a list of activities you enjoy (tagged by category) once, in Settings
- A pure function computes genuinely free slots in the day by subtracting all scheduled commitments from the waking hours
- Suggests an activity to fill a free slot — usually from the student's own stated preferences, but every third day deliberately suggests something *outside* their usual list, to nudge variety without ever nagging

## 11. Exam revision planning

- Add an exam: title, date/time, duration, and a weekly revision-hours target
- The app tracks how many revision hours are already booked toward that target this week and, if it's unmet, suggests a revision session sized to fit the largest available free slot (capped at whatever's actually remaining)
- Suggestions are surfaced on Home in the same priority chain as recovery nudges, and accepting one adds a real "Revise: {Exam title}" commitment into the schedule

## 12. Check-ins

- Three taps: energy (1–5), stress (1–5), slept well (yes/no)
- Feeds a "felt load" multiplier on top of raw booked-hours load — two students with an identical schedule can have different displayed load if one is visibly more stressed/tired
- Every check-in also captures a **load snapshot** (the exact load percentage and per-category breakdown at that moment) for accurate historical trends

## 13. Trends

- Real historical stress and load percentage plotted together on the same timeline (Recharts dual-axis line chart) so the correlation between the two is visually obvious
- Uses real stored load snapshots where available; check-ins that predate the snapshot feature fall back to a clearly-documented approximation rather than silently faking history

## 14. Google Calendar export

- Push every open commitment with a due date onto the student's real Google Calendar
- Safe to re-run at any time — commitments already synced are updated (PATCH) rather than duplicated (POST), tracked via a stored `google_event_id` per commitment
- One tap from Settings, with a result message showing how many events were synced

## 15. Settings

- **Weekly capacity editor** — the same sliders as onboarding, editable any time
- **Sleep & activities** — bedtime/wake time and a free-form, categorized list of preferred activities, used by the free-time recommender
- **Google account** — connect/disconnect, manual wearable sync, calendar export, all in one place with clear plain-language copy about what data is read and what it's used for
- **Demo data** — one tap loads a realistic overloaded week (commitments, capacities, a rising-stress check-in history) so every feature has something to show immediately, without hand-entering test data
- **Sign out**
- **Campus support link** — a quiet, always-visible link to real campus support services, because a workload app that notices you're struggling should point you toward help, not just manage your calendar

## 16. Accessibility (WCAG AA)

- Contrast audited with the actual sRGB-to-linear-luminance formula (not eyeballed) — one real violation was found (an alert/flag text color reaching only ~3.2:1 against a 4.5:1 requirement) and fixed with a dedicated higher-contrast token, applied everywhere that color is used as text
- Every input has a real associated `<label>` or `aria-label`
- 44×44px minimum tap targets on every interactive element, including compact list-row checkboxes
- Radio-button groups (priority, energy/stress scales, recurrence choice) use proper `role="radiogroup"`/`role="radio"` semantics
- No native `confirm()`/`alert()` dialogs anywhere — all confirmations are inline, screen-reader-friendly UI
- Calm, low-contrast neutral palette with a single accent color; no red alarm states anywhere in the UI, even at >100% load

## 17. Data model & security

- 12 Postgres tables, every one with row-level security enabled from the first migration — a user can only ever read or write their own rows, enforced at the database layer
- Verified against Supabase's own security advisor after every schema change (zero relevant lint warnings)
- Three Edge Functions isolate every third-party secret (Gemini API key, Google OAuth client secret) from the client bundle entirely

## 18. Engineering quality (things a judge can verify directly)

- **74 automated tests, 100% passing**, covering the entire scoring/balancer/recovery/free-time/exam-revision engine as pure, framework-free functions
- **Zero TypeScript errors** (`tsc -b --noEmit` clean)
- **Real bugs found and fixed via root-cause investigation, not patched around:**
  - An onboarding race condition where the data loader ran before auth resolved, causing already-onboarded accounts to be redirected back to onboarding — found by querying the database directly to rule out a persistence bug, then fixed at the actual race in `AppDataContext`
  - A missing RLS `SELECT` policy that silently broke a Fitbit/Google OAuth connection attempt (insert-then-select round trip failing because only the insert half had a policy)
  - A "This week" list bug that showed commitments due next month
- Deployed to production on Cloudflare Workers, with real Supabase Postgres/Auth/Edge Functions behind it — nothing in the live demo is mocked
