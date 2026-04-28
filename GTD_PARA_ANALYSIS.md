# The Pattern vs. GTD & PARA

## GTD: Getting Things Done

GTD has five stages: **Capture → Clarify → Organize → Reflect → Engage**.

| GTD Stage | GTD Concept | The Pattern | Gap |
|---|---|---|---|
| **Capture** | Inbox — everything goes in raw | Brain Dump + Quick Capture (⌘⇧K) + Logrus | Strong. Three capture paths cover typed, global hotkey, and imported files |
| **Clarify** | "What is it? Is it actionable?" | Brain Dump triage — Haiku classifies items as commitment / spark / chronicle / inscription / discard | Partial. AI classifies but you can't push back on a classification mid-triage; no "waiting for" or "someday/maybe" distinction within commitments |
| **Organize** | Next actions, projects, waiting-for, someday, reference | Commitments (next actions), Sparks (someday/maybe), Inscriptions + Shadows (reference + projects), Chronicles (logbook) | Missing: no "waiting for" bucket. No distinction between a next action and a project (multi-step outcome). Commitments are flat; no project container |
| **Reflect** | Weekly review — sweep all lists | No scheduled review loop | **Major gap.** No weekly review prompt, no mechanism to resurface stale commitments, no explicit open loops audit (though `findOpenLoops()` exists and surfaces checkbox TODOs — it's there but not surfaced as a deliberate review ritual) |
| **Engage** | Choose what to work on now | Top 3 (daily priorities) + Focus Mode (Pomodoro + task breakdown) | Good. Context/energy filtering absent, but Top 3 + Focus covers the core execution loop |

### Key GTD gaps

- No **"Waiting For"** list — commitments to *others* are tracked, but items blocked on *someone else* aren't.
- No **project** concept — a commitment is always a single action, not "the next action in a multi-step outcome."
- No **weekly review** ritual or review trigger.
- No **contexts** (`@phone`, `@computer`, `@errands`) for location/mode filtering.

---

## PARA: Projects, Areas, Resources, Archives

PARA organizes all information into four buckets by *actionability*.

| PARA Category | Definition | The Pattern equivalent | Fit |
|---|---|---|---|
| **Projects** | Has a deadline, has an outcome | No direct analog | **Missing.** Shadows are the closest thing but they're flat collections with no outcome or deadline |
| **Areas** | Ongoing responsibility with a standard to maintain | No direct analog | **Missing.** Nothing represents "Health," "Work," "Family" as persistent accountabilities |
| **Resources** | Reference material organized by topic | Inscriptions + Shadows | Partial. Shadows give topic grouping, but no hierarchy (nested collections) and no distinction between "my notes on this" vs. "relevant docs I collected" |
| **Archives** | Inactive items from the other three | No archive state | **Missing.** Completed commitments are soft-deleted; completed Shadows have no archive path; no way to freeze a project when done |

### Key PARA gaps

- The Vault is essentially **one flat namespace** — all inscriptions live at the same level, with Shadows as optional overlapping tags. PARA's hierarchy (Project → Area → Resource → Archive) isn't represented.
- No **project completion flow** — when a project-like Shadow ends, there's no "archive this collection" action.
- No **area** concept — you can't see "everything related to my health responsibility" vs. "everything in the work project."

---

## What The Pattern does that neither GTD nor PARA covers

- **ADHD-specific commitment tracking** — verbal commitments tied to a `person` field is a superpower GTD doesn't have. Most GTD implementations lose the social context.
- **Oberon as review partner** — morning briefings replace the weekly review ritual partially, but they're on-demand rather than scheduled.
- **Sparks** — GTD's "Someday/Maybe" list but lighter-weight and distinct from commitments, which is the right call for ADHD.
- **Brain Dump → AI triage** — the clarify step done *for* you. GTD makes clarify manual; Haiku automates the first-pass sort.
- **Focus Mode with task decomposition** — GTD doesn't help you execute; it just organizes. Focus Mode actually runs the work session.
- **Chronicles as a daily log** — neither GTD nor PARA have a journaling layer. Solid for ADHD retrospection.

---

## What to build next for GTD/PARA alignment

### High value / low complexity

1. **Waiting For bucket** — add `waitingFor?: string` field on `Commitment` (who it's blocked on) and a filtered view.
2. **Archive state on Shadows** — add `archivedAt` to `Shadow` type and filter by default.

### Medium complexity

3. **Project concept** — either promote Shadow to be the project container (add `outcome` + `dueDate` fields) or add a separate Project type. The Commitment → Project link is the hard part.
4. **Weekly review prompt** — Oberon tool that surfaces stale commitments + open Sparks + incomplete Top 3 days. Could be a scheduled Cron or a `/weekly-review` slash command.

### Structural / longer term

5. **Area concept** — gives a home for ongoing responsibilities and prevents every note/commitment from being project-attached. PARA purists would say this is the most important missing layer.
