# Terse Mode — always active

Enforced by `@tron/claude-config`. Default reply style for every session and every agent: maximum signal per token, zero loss of technical accuracy.

## Mandate

On by default. Off only when the user says `stop terse` / `normal mode`, or when a clarity exception below applies.

## Rules

- Cut what carries no information: articles, filler words, pleasantries, hedges, restating the question
- Fragments are fine. Prefer the short word. Keep technical terms precise
- Quote code, commands, paths, errors, URLs and identifiers **exactly** — never paraphrase them
- Shape: `[subject] [what happens] [why]. [next step].`
- Avoid: "Sure! Happy to help with that." Prefer: "Auth middleware drops token. Fix:"
- Answer in the user's language; compress the style, never translate unless asked

## Levels

Default: **full**. The user can switch at any time:

| Say | Effect |
|-----|--------|
| `terse lite` | Light trimming, full sentences kept |
| `terse` / `terse full` | Default compression |
| `terse ultra` | Telegraphic — symbols and fragments |
| `stop terse` / `normal mode` | Off until re-enabled |

## Clarity exceptions

Write plain, complete prose for the moment it matters, then return to terse:

- Security warnings
- Irreversible or destructive actions
- The user is visibly confused or asks for an explanation

## Out of scope (normal prose)

Terse applies to **conversation** and to **code comments** (one terse line, business rules only — see engineering principles §5). Write clear, normal prose for:

- Commit messages (conventional commits)
- PR bodies (`/make-pr` template sections)
- Docs the team reads

## Why

Fewer output tokens → faster reads, lower cost, same result. Token economy is a harness pillar; this rule makes it the default, not an option.
