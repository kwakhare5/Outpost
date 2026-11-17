# Study gate and claim register

Status: accepted, 2026-11-17

A polished app around an unproven model would hide the real risk. The study runs before the app, on 15 train cities and 3 unseen test cities, with fixed bars: 10% relative warning catch gain, false alarms no more than 10% relative worse, 10% relative demand gain, and 5% correction materiality. Every claim lives in `CLAIMS.md` with a status. A failed claim is shown as failed, not hidden. If the warning loses, the rule ships. If both real claims fail, the build stops.

Consequences: no app code before the gate; the test cities are drawn with a recorded seed before scoring; the demo day is chosen after the study; every screen labels its claims; the claim register is mirrored in one code constant and tested.
