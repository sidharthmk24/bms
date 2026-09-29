# EXHIBITION_PLAN.md — Live Exhibition Module

The exhibition module is being rebuilt. It stops being a record-keeping exercise that gets reconciled after the event, and becomes a **live operating surface** used at the venue while the event is running.

This document is the spec. `CLAUDE.md` still holds the project-wide rules; nothing in here overrides them.

---

## 1. What Changes and Why

**Today:** books are dispatched, the event happens somewhere off-system, and someone reconciles quantities afterwards. Sold copies are counted manually at close. Nobody knows how the event is going until it's over.

**After this change:** staff at the venue bill customers through the system itself. Every sale is attributed to the exhibition automatically, stock decrements live, the dashboard updates in real time, each day is closed and cash-reconciled, stock can be topped up mid-event, and the final report shows true profit rather than just money collected.

The five things driving the rebuild:

| Requirement | What it means |
|---|---|
| Per-exhibition dashboard | One live view per event: sales, stock, credit copies, performance |
| Restricted access | Only assigned staff, their branch manager, and chain admins |
| Automatic sale logging | Billing happens *in* the exhibition; nothing is logged by hand afterwards |
| End-of-day close | Each day is sealed and cash-reconciled, not one blur at the end |
| Mid-event stock top-up | A title selling fast on day 1 can be replenished for day 2 |
| Credit copies | Marked at point of sale, with a recipient and a reason |

---

## 2. Access Model — assignment, not shared logins

**Do not create login credentials per exhibition.** Shared accounts destroy accountability (a voided bill traces to "the exhibition", not a person) and linger after the event ends.

Instead: staff keep their personal logins and are **assigned** to an exhibition. An assigned user can enter **Exhibition Mode** — a stripped-down UI scoped to that one event.

**`exhibition_assignments`** — `exhibitionId`, `userId`, `role` (`LEAD` | `STAFF`), `assignedAt`, `assignedById`.

- `LEAD` — can close the day, approve credit copies, raise stock top-up requests
- `STAFF` — can bill and log enquiries only

**Who can access a given exhibition:**
- Users assigned to it
- The branch manager of its `sourceBranchId`
- `SUPER_ADMIN`, `ADMIN`
- `FINANCE` (read-only)
- `CENTRAL_INVENTORY_MANAGER` (read-only, plus stock request review)

Implement one helper — `canAccessExhibition(user, exhibitionId)` — and call it from **every** exhibition endpoint. Never infer access from role alone.

**Exhibition Mode:** entering it sets `activeExhibitionId` on the session. While active, a persistent, non-dismissible banner names the exhibition, and every bill created carries that `exhibitionId` automatically. This is what makes sale logging automatic — there is no separate step to "record" a sale against the event.

---

## 3. Stock Sourcing — decide this before building

An exhibition can draw stock from the warehouse, from a branch, or from a mix. That mix has to be tracked per book, because it determines where returns go at close.

**`exhibition_stock_sources`** — `exhibitionStockId`, `sourceType` (`WAREHOUSE` | `BRANCH`), `sourceBranchId` (nullable), `quantityTaken`, `quantityReturned`.

**Return rule (fixed):** at close, returns go back **proportionally to source**. If 10 copies came from Branch A and 5 from the warehouse, and 9 come back, 6 return to Branch A and 3 to the warehouse. Rounding favours the larger source. The close screen shows the computed split and the operator may override per line, with the override recorded.

---

## 4. Lifecycle

```
DRAFT → REQUESTED → APPROVED → DISPATCHED → ONGOING → CLOSED
                 ↘ REJECTED                      ↘ CANCELLED
```

| Status | Meaning | Stock |
|---|---|---|
| `DRAFT` | Being planned | Untouched |
| `REQUESTED` | Submitted for approval | Untouched |
| `APPROVED` | Approved, not yet sent | Reserved, not deducted |
| `DISPATCHED` | Physically sent to venue | **Deducted**, `EXHIBITION_OUT` written |
| `ONGOING` | Live, selling | Decrements per sale |
| `CLOSED` | Reconciled and finished | Returns written back |
| `REJECTED` / `CANCELLED` | Terminated | Any reserved/deducted stock restored |

**Stock is deducted at dispatch, not at approval.** Approval is a decision; dispatch is a physical event. Deducting earlier makes branch stock lie about what's on the shelf.

**Auto status transitions** (evaluated on every list/fetch):
- `ONGOING` + end date passed → flagged `OVERDUE` (a flag, not a status — it must still be closeable)
- `APPROVED` + start date passed without dispatch → flagged `STALE`

### Pre-flight checklist (blocks dispatch)
Dispatch is refused unless all pass:
- Every line has sufficient stock at its named source
- At least one `LEAD` is assigned
- Start date is not in the past
- End date is after start date

---

## 5. Billing Inside an Exhibition

Reuses the existing billing flow with three differences:

1. `bills.exhibitionId` is set from the session, never chosen by the user.
2. Stock decrements from **`exhibition_stock`**, not `branch_inventory` — the books are physically at the venue. Same atomic conditional update, same `INSUFFICIENT_STOCK` behaviour.
3. Bill numbers use an exhibition prefix: `EXH01-20260804-0007`.

Voiding works identically: stock returns to `exhibition_stock`, `SALE_VOID` movement, bill marked `VOIDED` and never deleted.

**Credit copies** are a flag on the bill line (`isCreditCopy`), marked at the point of sale:
- Stock decrements normally
- `lineTotal` is zero — **excluded from revenue**
- Requires `recipient` and `reason` (`REVIEW` | `AUTHOR` | `COMPLIMENTARY` | `DAMAGED_REPLACEMENT`)
- Above a configurable threshold (default 3 copies per bill), requires `LEAD` approval
- Writes an `EXHIBITION_CREDIT` movement

**`credit_copies`** — `billItemId`, `exhibitionId`, `bookId`, `quantity`, `recipient`, `reason`, `approvedById` (nullable).

---

## 6. Mid-Event Stock Top-Up

A title selling out on day 1 must be replenishable for day 2. This mirrors the existing restock flow, keyed to an exhibition instead of a branch.

**`exhibition_stock_requests`** — `exhibitionId`, `requestedById`, `sourceType`, `sourceBranchId` (nullable), `status` (`PENDING` | `APPROVED` | `PARTIALLY_APPROVED` | `REJECTED` | `DISPATCHED` | `RECEIVED`), `reviewedById`, `reviewNote`.
**`exhibition_stock_request_items`** — `bookId`, `quantityRequested`, `quantityApproved`, `quantityReceived`.

Reviewed by the Central Inventory Manager (warehouse source) or the branch manager (branch source). On receipt at the venue:
- `exhibition_stock.quantityTopUp` increases
- An `EXHIBITION_TOP_UP` movement is written
- A new `exhibition_stock_sources` row records where the top-up came from

**Consequence:** `quantityTaken` is no longer a fixed number set at dispatch. The reconciliation identity becomes:

```
quantityTaken + quantityTopUp = quantitySold + quantityCredit
                              + quantityReturned + quantityDamaged + quantityLost
```

### Sell-through alerting
Compute per title: `sold ÷ (taken + topUp)` and a rate over the last 4 hours. Surface on the dashboard:
- ≥70% sold → "running low"
- Projected to hit zero before the end date → "request top-up", with a suggested quantity

This turns restocking from reactive to predictive, which is the actual operational value.

---

## 7. End-of-Day Close

Each day of a multi-day event is sealed rather than left open until the end.

**`exhibition_day_closes`** — `exhibitionId`, `closeDate`, `openingStock`, `quantitySold`, `quantityCredit`, `cashTotal`, `upiTotal`, `countedCash`, `variance`, `note`, `closedById`, `closedAt`.

Performed by a `LEAD`. The system presents system totals; the operator enters counted cash; variance is computed and must be explained with a note if non-zero. Once closed, that day's bills cannot be voided without `ADMIN` approval.

---

## 8. Per-Exhibition Dashboard

Live, scoped to one exhibition, updating over the existing SSE channel.

**Today**
- Revenue, bill count, items sold, credit copies issued
- Cash vs UPI split
- Hourly sales curve

**Event to date**
- Total revenue, total items sold, average bill value
- Stock: taken + topped up, sold, remaining
- Sell-through percentage overall and per title
- Top 10 titles by units and by revenue
- Titles flagged low or projected to run out
- Open stock requests and their status
- Day-close history with variances
- Enquiries logged at the venue

**Financials** (visible to `LEAD`, branch manager, admins, finance)
- Revenue, COGS, gross profit
- Exhibition expenses logged so far
- Net profit to date

---

## 9. True Profit

Revenue alone is not ROI. An event can collect ₹80,000 and make nothing once book cost and stall costs are counted.

**Two changes:**
1. `expenses.exhibitionId` — nullable. Stall fees, transport, travel, staff overtime, printing all attach to the event rather than being lost inside a branch's general costs.
2. `bill_items.unitCost` — the book's cost price captured **at sale time**, exactly as `unitPrice` already is. Without this, COGS can't be computed historically.

```
Gross Profit = Revenue − COGS
Net Profit   = Gross Profit − Exhibition Expenses
```

Credit copies contribute **zero revenue but full COGS** — they are a real cost and must appear as one.

---

## 10. Close & Reconcile

Closing requires the identity in §6 to balance exactly. The endpoint rejects anything that doesn't.

| Outcome | Action |
|---|---|
| Sold | Already billed during the event — nothing to reconcile |
| Credit | Already recorded at sale — nothing to reconcile |
| Returned | Stock restored per the source split in §3, `EXHIBITION_RETURN` written |
| Damaged | `ADJUSTMENT` movement, reason `DAMAGED` |
| Lost | `ADJUSTMENT` movement, reason `LOST` |

Preconditions: every day has a day-close record, no open stock requests, no unapproved credit copies. Then status → `CLOSED` and the final report is generated.

Because selling happened in-system, **sold and credit quantities are already known at close.** The operator only counts what physically came back — which is the whole point of the rebuild.

---

## 11. Connectivity (build the cheap version only)

Venues often have poor signal. Full offline support means a PWA with a service worker, a local queue, and conflict resolution for offline oversell — weeks of work, and it breaks the atomic stock guarantee. **Not in scope.**

Build only:
- A visible online/offline indicator
- The in-progress bill held in local state, so a dropout mid-transaction doesn't lose the cart
- Automatic retry with backoff on failed requests before showing an error
- Generous timeouts

Keep barcode lookup and bill creation cleanly separated so a queue can be layered on later without a rewrite. Operationally, the client should bring a mobile hotspot.

---

## 12. Schema Summary

**New tables**
`exhibition_assignments`, `exhibition_stock_sources`, `exhibition_stock_requests`, `exhibition_stock_request_items`, `exhibition_day_closes`, `credit_copies`

**Modified**
- `exhibition_stock` — add `quantityTopUp`, `quantityCredit`
- `bills` — `exhibitionId` now actively used
- `bill_items` — add `isCreditCopy`, `unitCost`
- `expenses` — add nullable `exhibitionId`
- `exhibitions` — add `isOverdue`, `isStale` flags

**New movement types**
`EXHIBITION_TOP_UP`, `EXHIBITION_CREDIT`

**New settings**
`exhibition_credit_copy_approval_threshold` (default 3), `exhibition_low_stock_percent` (default 70)

---

## 13. Build Order

| Phase | Scope |
|---|---|
| 1 | Schema + migrations + `canAccessExhibition` helper |
| 2 | Assignments: assign/remove staff, LEAD vs STAFF |
| 3 | Lifecycle rework: sourcing splits, pre-flight checks, dispatch deducting stock |
| 4 | Exhibition Mode: session context, banner, scoped navigation |
| 5 | Exhibition billing: scoped stock decrement, exhibition bill numbers, void |
| 6 | Credit copies: flag, recipient, reason, approval threshold |
| 7 | Stock top-up requests: request → review → dispatch → receive |
| 8 | End-of-day close with cash reconciliation |
| 9 | Dashboard: live metrics, sell-through, alerts, SSE wiring |
| 10 | Profit: `unitCost` capture, `expenses.exhibitionId`, P&L calculation |
| 11 | Close & reconcile with proportional returns |
| 12 | History report and cross-exhibition comparison |
| 13 | Connectivity mitigations (§11) |

WhatsApp invoice delivery is **out of scope** for this rebuild and will be added afterwards. Design the receipt payload so a delivery channel can be attached later.

---

## 14. Definition of Done

1. An assigned user can enter Exhibition Mode and complete a bill; it appears on the dashboard within seconds, with no manual logging.
2. An unassigned user with no qualifying role is refused access with a 403.
3. Selling the last copy at the venue returns 409 and leaves stock unchanged.
4. A credit copy decrements stock, adds zero revenue, and still counts toward COGS.
5. A stock top-up increases available stock and writes `EXHIBITION_TOP_UP`.
6. A day close records cash variance and seals that day's bills.
7. Closing with unbalanced quantities is rejected; balanced closing returns stock proportionally to source.
8. The final report shows Revenue, COGS, expenses, and Net Profit — and the net figure can be negative.
9. Stock ledger invariant holds: movements for the exhibition sum to zero once closed.