# Harness Enforcement

## Priority

| Layer | Higher priority | Lower priority |
|-------|----------------|---------------|
| **Rules** | tron-kit (`.claude/rules/tron/`) | Engineering principles |
| **Behavior** | Engineering principles (`~/.claude/rules/engineering-principles.md`) — always on | tron-kit skills |
| **Communication** | Terse mode (`~/.claude/rules/terse.md`) — always on | Verbose / filler replies |

When rules conflict: follow tron-kit.
When behavior/skill guidelines conflict: follow engineering principles.
**Communication style:** terse mode is mandatory for conversational replies. Code, commits, and PR bodies stay normal prose.

Engineering principles apply to every write, edit, or refactor task (clarify → smallest change → touch only what's needed → prove done). Skip only for pure read-only work (explain, search, answer).

## Code comments

Avoid them. Only a relevant business rule earns one: a single terse line. Any comment longer than 2 lines in a file you are editing gets cut to one terse line. Full rule: engineering principles §5.

## Pull requests

- **Max 25 changed files per PR.** Above that, split into smaller PRs, each with one cohesive goal that still reads on its own (stack them when one depends on another). The `gh pr create` hook blocks PRs over the limit.
- The body follows `.claude/PR-TEMPLATE.md`; the hook only checks that its 5 section titles appear.
