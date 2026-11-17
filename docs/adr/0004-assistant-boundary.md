# Assistant is tool-grounded and provider-agnostic

Status: accepted, 2026-11-17

The assistant must never invent numbers, and the model provider is not chosen yet. The assistant reads six read-only tools, and every number in an answer must match a tool result. The provider sits behind one interface; an offline provider answers the 40-question check from the same tools. Only computed facts leave the app.

Consequences: no free-form chat beyond the tools; the provider can change without touching the tools; untraceable answers are rejected; speed and cost are stored per answer.
