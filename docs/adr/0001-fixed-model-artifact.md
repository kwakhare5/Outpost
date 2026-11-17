# Fixed model artifact trained offline

Status: accepted, 2026-11-17

The app must work on any conforming dataset without tuning, and training on each upload is slow, overfits short histories, and makes the proof circular. The warning model is trained once on 15 cities, tested on 3 cities never seen, and shipped as a JSON artifact with the feature spec, means, standard deviations, coefficients, intercept, and version. The app computes the same identity-free features in TypeScript and applies the artifact. Python never runs in production.

Consequences: changing the model needs a new artifact; a Python/TypeScript feature parity test is mandatory; every uploaded dataset is out-of-sample by construction.
