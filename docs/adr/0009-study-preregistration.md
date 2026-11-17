# Study pre-registration

Status: accepted, 2026-11-17

The study bars and assumptions must be fixed before scoring, or the result can be reinterpreted after the fact. The pre-registration uses all 50,000 series in 15 training cities, 3 test cities drawn once with a recorded seed, one empty hour as the primary target, the top 20 per day as the primary budget, the fixed 10% warning gain, 10% false-alarm guard, 10% demand gain, and 5% materiality bars, the transparent demand estimator, 7 known empty-flag days for Full mode, and the listed replay assumptions. Sensitivity views (2+ hours, top 50, top 100, top-5 and top-50 set changes, 1/2/3-day stock) are reported but do not change the gate. The UCI second dataset license is checked first; M5 or Rossmann is the fallback. Any change after scoring is recorded as a deviation.

Consequences: the split and bars cannot move after results; sensitivity is not a second gate; a failed claim is shown as failed.
