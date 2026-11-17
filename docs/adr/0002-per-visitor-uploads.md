# Per-visitor uploads behind a signed cookie

Status: accepted, 2026-11-17

The demo is public and has no accounts, but an upload must not overwrite the shared demo or leak between visitors. A signed HttpOnly cookie holds a random visitor id; datasets, decisions, and assistant runs are scoped to it. The demo dataset is shared and reset-able; "Remove my data" deletes the visitor's rows.

Consequences: clearing cookies loses access to an upload; uploads expire after 7 days; write routes need an origin check and rate limits; no login is added.
