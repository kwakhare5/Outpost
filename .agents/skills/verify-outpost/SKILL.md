---
name: verify-outpost
description: Verify an Outpost feature end to end on the demo or a fixture. Use when checking a change to Today, shelf detail, decisions, Proof, Bring data, modes, or the assistant.
---

# Verify Outpost

## Status

Scaffold. The app does not exist yet. The commands below are added in Phase 2 of `TASKS.md`. Do not claim a feature is verified before its command runs.

## Rules

- Use the real demo or the named fixture. No mocking of project code, the database, an API, or an MCP tool.
- Drive only the affected feature file.
- Check the user-visible outcome and the saved record.
- Paste the output. Do not summarize a run you did not do.
- Report `Verified`, `Not checked`, and every skipped test by name and reason.
- Never write a proof number before the run.

## Commands (after the skeleton exists)

```powershell
npm run dev
npm run build
npm test
npm run db:migrate
npm run seed:demo
npm run verify:parity
```

## Feature map

| Feature | File | What to drive |
|---|---|---|
| Today | `features/today.md` | Ranked warnings, bands, reasons, mode banner |
| Shelf detail | `features/shelf-detail.md` | Chart, empty marks, reasons, three fixes |
| Decision | `features/decision.md` | Approve, reject, repeat click, saved record |
| Proof | `features/proof.md` | Three scores, replay, losses, labels |
| Bring data | `features/bring-data.md` | Upload, mapping, validation, mode, remove |
| Modes | `features/modes.md` | Full, Rule, Watch, No mode |
| Assistant | `features/assistant.md` | Fact, refusal, paraphrase, sources |

## Evidence format

```
Feature: <name>
Command: <exact command>
Result: PASS/FAIL
Output: <pasted lines>
Saved record: <table and id or screenshot path>
Skipped: <test name and reason, or none>
```
