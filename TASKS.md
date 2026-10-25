# TASKS.md — Active Implementation Checklist
#
# PURPOSE: Tracks the ordered sequence of small, verifiable tasks.
# The AI works through one task at a time and runs verification before checking it off.
#
# RULES FOR THE AI:
# 1. Do NOT work on multiple tasks at once.
# 2. Pick the top unchecked task `[ ]`.
# 3. Write the code, run `.\verify.ps1`.
# 4. Only mark `[x]` when the verification script passes with exit code 0.
# 5. Log the verified result in `JOURNAL.md`.

---

## Current Sprint / Milestone
**Goal:** Initialize clean project structure and scaffold backend/frontend foundations for Outpost V1.

---

## Phase 1: Groundwork & Stack Selection
- [x] **Task 1.1:** Isolate repository in `D:\Outpost V1`, seed PRD and core project memory docs.
  - _Verification:_ `git status` shows clean tracking with root PRD and memory docs.
- [ ] **Task 1.2:** Align on stack with user and scaffold repository structure.
  - _Verification:_ Package managers install cleanly, `.\verify.ps1` runs.

---

## Phase 2: Core Domain & Data Models
- [ ] **Task 2.1:** Define Dark Store, SKU, Batch (FEFO/FIFO), and Inventory schema.
  - _Verification:_ Automated tests verifying batch deduction with zero expired leaks.
- [ ] **Task 2.2:** Build Urgency Detection engine (stockout forecasting and expiry detection).
  - _Verification:_ Unit test proving milk stockout detection 5 hours ahead.
- [ ] **Task 2.3:** Implement Decision Engine (Transfer, Reorder, Markdown) with donor safety check.
  - _Verification:_ Test proving Bandra transfer recommendation without causing Bandra deficit.

---

## Phase 3: Level-2 Autonomy & In-Flight Transit
- [ ] **Task 3.1:** Build Approval Gate API (Approve/Reject persisting recommendation state).
  - _Verification:_ Test proving state transitions require approval.
- [ ] **Task 3.2:** Build In-Flight state machine with Doorstep Count Confirmation.
  - _Verification:_ Conservation of mass test: source deducted, zero in-transit destination credit, counted arrival credited with discrepancy waste logged.

---

## Phase 4: Frontend Control Room UI
- [ ] **Task 4.1:** Morning Briefing & Urgency Queue screen.
- [ ] **Task 4.2:** In-Flight Tracking & Doorstep Count screen.
- [ ] **Task 4.3:** Realized Outcomes & Rupee Ledger screen.
