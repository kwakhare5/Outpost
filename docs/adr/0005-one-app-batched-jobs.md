# One app, Postgres, and client-polled batch steps

Status: accepted, 2026-11-17

The app must stay simple to build and deploy, and serverless requests cannot run long proof checks. One Next.js app and one Postgres; the Python study is offline only. Uploads are capped and computed in the request; the assistant check is a proof run processed in small steps by the client. No queue or worker.

Consequences: dataset size is capped; long checks need polling; deployment is one app plus a database; the study's outputs must be committed or seeded.
