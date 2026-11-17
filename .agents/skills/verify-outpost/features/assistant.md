# Verify assistant

## What it is

The assistant answers from six read-only tools, shows its sources, and refuses what it cannot prove.

## Steps

1. Ask a fact question about the selected shelf.
2. Check every number against the tool result.
3. Ask a question the mode cannot support.
4. Ask a paraphrase of a known question.
5. Turn off the provider key and ask again.
6. Run the 40-question check.

## Expected

- The answer uses plain words.
- Every number matches a tool result.
- `Where this came from` lists the tools and values.
- An unsupported question is refused in plain words.
- An unseen wording is handled correctly.
- Offline answers show the `Offline answer` badge.
- The check passes 18/20 facts, 10/10 refusals, 9/10 paraphrases.
- Speed and cost are stored.
- No raw rows are sent to the provider.

## Fail signs

- An invented number.
- An answer with no sources.
- A refusal that still gives an unsupported number.
- A raw row in the provider request.
- A check score written before the run.
- A provider committed without approval.

## Evidence

- The question and answer.
- The tool values.
- The 40-question check output.
- The provider request payload, with no raw rows.
