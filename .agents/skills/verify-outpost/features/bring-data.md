# Verify Bring data

## What it is

The upload page loads one dataset, validates it, detects the mode, and shows the active claims.

## Steps

1. Open `Bring data`.
2. Drop the fixture CSV.
3. Map the required columns.
4. Declare the unit, day boundary, and currency.
5. Load.
6. Read the validation report and the mode.
7. Open `/app?dataset=<id>`.
8. Click `Remove my data`.

## Expected

- The mapping works without code.
- The validation report lists rows, stores, products, date range, empty marks, unknown days, missing optional fields, mode, and active claims.
- A bad file is rejected with the exact reason and leaves zero rows.
- A good file loads all or nothing.
- The uploaded dataset is private to the visitor.
- The demo is unchanged.
- Remove deletes the dataset and its children in one transaction.
- The upload expires after 7 days.

## Fail signs

- A partial dataset after a failure.
- A mode the data does not support.
- A missing optional field that fails the load.
- A second visitor seeing the upload.
- The demo changing after an upload.
- A raw stack trace.

## Evidence

- Validation report.
- Dataset id and row count.
- Two-cookie isolation output.
- Remove output.
