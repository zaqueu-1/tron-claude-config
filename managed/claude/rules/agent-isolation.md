# Agent Isolation Contract

## Fundamental principle

Every agent in this codebase operates as an **isolated, self-sufficient worker**. Isolation means one thing specifically: you do not inherit the parent conversation's history or assumptions. It does NOT mean you work blind.

Your job when given a task:
1. Read what you need. Query the codebase. Explore freely.
2. Execute the task with full access to all tools.
3. Return a focused result. No trailing questions. No scope creep.

## Codebase access — always on, always full

Agents MUST explore the codebase actively before acting. Use the full tool stack:

**First**: query the code graph via `tron-graph` MCP tools:
- `search_graph` — find functions, classes, routes by name or pattern
- `trace_path` — follow call chains and data flows across files
- `get_code_snippet` — fetch exact source for a symbol
- `get_architecture` — understand project structure and module boundaries
- `search_code` — graph-augmented text search

**Then**: read raw files only when editing or when the graph doesn't have the answer.

`tron-graph` is registered by postinstall in `~/.claude/.mcp.json` (and Cursor's `mcp.json`).

**It is NOT guaranteed to be present — verify before relying on it.** Installs can fail
(Windows/WSL, offline, blocked remote installers). If `~/.claude/.mcp.json` is missing or the
graph tools are unavailable, **read raw files directly and say so in your report**, rather than
treating the graph as a prerequisite you failed to meet. The query order is a preference, not a gate.

To install or repair (fetches a remote engine and installs globally — an operator decision, not an agent one):

```bash
node node_modules/@tron/claude-config/scripts/lib/ensure-tron-graph.js
```

Business rules, domain logic, and architectural decisions live in the codebase. Your task context tells you WHAT to do; the codebase tells you HOW it fits. Always query before acting.

## What isolation actually means

| Isolated (yes) | Not isolated (wrong read) |
|----------------|--------------------------|
| Parent conversation history | Project files and documentation |
| What sibling agents discovered | MCP tools and codebase graph |
| Assumptions not in your prompt | Business rules in the code |
| Other agents' in-progress work | Architecture docs in `docs/` |

The orchestrator passes you a task. You query the codebase yourself to understand context, constraints, and conventions. This is correct — do not wait for the orchestrator to spoon-feed you file contents.

## Rule stack (applies to all agents, always)

| Priority | Source | Scope |
|----------|--------|-------|
| 1 — highest | tron-kit rules (`.claude/rules/tron/`) | Coding standards: naming, testing, security, git |
| 2 | Engineering principles (`engineering-principles.md`) | Behavioral: how to think and act |
| 3 | Harness enforcement (`harness-enforcement.md`) | Workflow: commit gates, review gates |
| 4 | Terse mode (`terse.md`) | Communication: terse replies (always on) |

**Terse mode:** reply terse by default. Code/commits/PR bodies stay normal. See `~/.claude/rules/terse.md`.

**Frontend skills:** mandatory on any UI task. **Source of truth for DESIGN** = the tron design stack: (1) `tron-design` (always first), then as the task needs (2) `tron-motion`, (3) `tron-native`, (4) `tron-imagery`; then (5) tron-design-fallback (subordinate; only after the stack sets direction, only for charts, forms, web navigation and stack guidelines). **On conflict between tron-design-fallback and the stack, ALWAYS prefer the stack.** Announce: `Using tron-design for [purpose]`, naming companions actually loaded. See `AGENTS.md` § Frontend skills.

## Engineering principles — mandatory for all write/edit/refactor tasks

Query the codebase first, then follow `~/.claude/rules/engineering-principles.md`: clarify before building, smallest thing that works, change only what the task needs, define done and prove it.

## Permitted operations — no approval prompt needed

The following are pre-approved. Proceed without asking:

- Reading any file in the project
- Writing and editing files within the project
- All `tron-graph` MCP tool calls
- All read-only git operations (`git status`, `git log`, `git diff`, `git show`, `git branch`)
- Running project scripts (`npm run *`, `bun run *`, `npx *`, `vitest`, `tsc`)
- File exploration (`ls`, `find`, `grep`, `cat`, `head`, `tail`)
- Node.js execution for project scripts

## Self-verification gate — run before declaring done

Before reporting completion on any write/edit/refactor:
- [ ] Tests pass (run them yourself, don't ask the user)
- [ ] Type-check passes
- [ ] Every todo.md item checked off (if todo.md was used)
- [ ] No dead imports/unused vars introduced by my changes
- [ ] Every changed line traces to the task

## Preserve error evidence

Never clean up failed attempts before understanding them. Error output is information. Repeated edits to the same file without a passing verify step = loop → stop, re-read, re-hypothesize.

## Not permitted without explicit user instruction

- `git commit` — must go through `/commit-changes` skill (bypass token required)
- `git push` — must go through `/make-pr` skill (bypass token required)
- `gh pr create` — must go through `/make-pr` skill (bypass token required)
- Destructive filesystem operations (`rm -rf`, `git reset --hard`, etc.)
- Modifying files outside the project root
