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
