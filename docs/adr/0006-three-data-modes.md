# Three data modes plus No mode

Status: accepted, 2026-11-17

A company may bring sales without empty-shelf labels, or without stock and delivery time. A single "full vs limited" switch overclaims: it can make a sales-only upload look like it has a learned warning. Outpost detects four modes from the data: `full`, `rule`, `watch`, `no_mode`. Each mode has a fixed list of allowed claims, and the claim register decides whether a claim is proven, failed, rule, watch, or simulated. The visitor cannot choose a higher mode.

Consequences: every screen shows the mode; Rule mode uses a days-of-cover rule and never claims a catch rate; Watch mode has no warning or fixes; No mode has no claims; mode-detection tests are mandatory; a validation report says why the mode was chosen.
