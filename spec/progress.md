# Ski Trip Planner — Build Progress

_Last updated: 2026-05-07_

---

## Completed Phases

### Phase 1–3 (prior sessions)
Core app scaffolding, auth, trip creation, interest form, dashboard.

### Phase 4 — Attendee Management
- Attendee confirmation + magic link onboarding
- Waitlist cascade (auto-promote on withdraw or remove)
- CSV export of confirmed attendees
- Organizer management (add/remove co-organizers)
- Attendance confirmation form (full/partial trip, deposit checkbox)
- Trip info page

### Phase 5 — Expenses & Trip Updates
- Add expense dialog (description, amount, date, category, notes)
- Three split types: equal among all, equal among some, custom amounts
- Member picker side panel (subset/custom) with search and click-to-add
- "Mark my share as already paid" checkbox — auto-settles payer's split on creation
  - If payer not in split: amber prompt to add themselves
  - EQUAL_SUBSET: Yes adds + auto-submits; No submits without
  - CUSTOM: Yes adds to picker (enter amount); No submits without
- Custom split validation: missing/zero amounts, total mismatch (±$0.01)
- Self-check runs before amount validation
- Individual split checkboxes — `$X remaining` updates as splits are checked
- "Settled Up" button (organizer/payer only) when all splits checked → moves to Settled tab
- Active / Settled tabs on expenses page (`?view=settled`)
- Settlement summary (greedy debt-simplification algorithm) on active tab
- Trip updates with email blast

---

## Bug Fixes Applied

| Bug | Fix |
|-----|-----|
| Neon DB cold-start errors | Retry logic in `prisma.ts` ($extends, up to 3× with 500ms backoff) |
| Party size field not pre-filling | Controlled state (`useState` + `value`) instead of `defaultValue` |
| Duplicate email on interest form edit | Always check `emailConflict` regardless of `editToken` |
| Removed attendee showing as "Not Interested" | Check `tripMember.status === "REMOVED"` first in badge logic |
| `removeMember` missing waitlist auto-promote | Added same cascade logic as `withdrawMember` |
| Zod v4 `invalid_type_error` not supported | Removed option; use `.min()` messages only |
| `pick<T>` with `as const` arrays | Changed signature to `readonly T[]` |
| Delete expense blocks "Add Expense" click | Replaced `window.confirm` with inline confirm; fixed dialog overlay `pointer-events` |
| Dialog overlay blocking clicks after router refresh | `pointer-events-none` default on backdrop + popup; `data-open:pointer-events-auto` to re-enable |

---

## Needs Testing

### Delete Expense Bug
- Clicking "Add Expense" button unresponsive after deleting an expense
- Two fixes applied (inline confirm + dialog pointer-events) but **unverified** — awaiting Playwright MCP browser access

### Phase 5 Expense Features
- [ ] Add expense split equally among all — your split auto-marked paid
- [ ] Add expense split among some you're included in — your split auto-marked paid
- [ ] Add expense, exclude yourself, checkbox checked → prompt → "Yes, add me" (subset auto-submits, custom stays open for amount entry)
- [ ] Add expense, exclude yourself, checkbox checked → prompt → "No, continue without me"
- [ ] Custom split: submit with missing amount → error shown, clears on fix
- [ ] Custom split: amounts don't match total → mismatch error shown
- [ ] Check splits individually → `$X remaining` updates correctly
- [ ] Check all splits → "Settled Up" button appears for organizer/payer
- [ ] Click "Settled Up" → expense moves to Settled tab
- [ ] Settled tab shows expense; Active tab no longer does
- [ ] Settlement summary only reflects active expenses

---

## Remaining Phases

### Phase 6 — Transportation & Transfer Groups
- Transfer group creation (who's traveling together)
- Flight/drive info per group
- Arrival/departure coordination view

### Phase 7 — Housing, Past Trips, Admin, Polish
- Room assignments / housing groups
- Past trips view (COMPLETED status)
- Admin tooling
- General UI polish pass

---

## MCP Browser Testing Setup
- Playwright MCP configured at workspace root `.mcp.json`
- `enableAllProjectMcpServers: true` set in `~/.claude/settings.json`
- Requires Claude Code restart to activate
- Once active: can navigate, click, inspect DOM, and read console to debug UI issues directly
