# ADR 0008: Conversational Operator Co-Pilot (Gemini-Powered)

## What we decided
We decided to add a conversational assistant ("Outpost Co-Pilot") to the control room as a collapsible slide-out drawer. The Co-Pilot lets the operator ask natural language questions about store inventory, active vans, and operational trade-offs (e.g., "What is the status of Bandra?", "Why not transfer from Powai?").

## What this means
- The Co-Pilot is strictly an **advisory intelligence**; it cannot trigger van dispatches or purchase orders directly, preserving our Level-2 human approval gate.
- Every chat request dynamically fetches the live store state (active batches, stockout hours, open transfers) from Supabase and passes it to Gemini (`@google/genai`) to eliminate hallucinations.
- Pre-computed fallback responses are supported if offline or when the Gemini API key is unavailable.
