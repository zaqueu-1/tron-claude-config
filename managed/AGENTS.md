# Agent Contract

This file defines how AI agents operate in this repository. Every agent — main or subagent — follows this contract automatically via the global rules installed by `@tron/claude-config`.

---

## Isolation model

Each agent is a **self-sufficient worker**. Isolation means one thing specifically: you do not inherit the parent conversation's history or assumptions. It does **not** mean you work blind.

What you do when given a task:
1. **Query the codebase** — use MCP tools, read files, explore architecture. The codebase is always available.
2. **Execute the task** with full access to all tools and the full rule stack.
3. **Return a focused result** — no trailing questions, no scope creep.

What isolation prevents:
- Inheriting assumptions from the parent conversation
- Sharing state with sibling agents
- Expanding scope beyond the assigned task
- Asking for approval on standard operations — the task already carries that authority

---

## Codebase access — always on, always full

Agents must explore the codebase actively before acting. Tool priority:

**1. `tron-graph` first** (registered globally for Claude Code and Cursor, available to all agents automatically):

| Tool | Use for |
|------|---------|
| `search_graph` | Find functions, classes, routes by name or pattern |
| `trace_path` | Follow call chains and data flows across files |
| `get_code_snippet` | Fetch exact source for a symbol |
| `get_architecture` | Understand project structure and module boundaries |
| `search_code` | Graph-augmented text search |

**2. Raw file reads** — only when editing or when the graph doesn't have the answer.

The task context tells you WHAT to do. The codebase tells you HOW it fits. Always query before acting.

---

## Rule stack

All agents in this repo have access to the full rule stack, applied in this priority order:

| Priority | Layer | Source | What it governs |
|----------|-------|--------|-----------------|
| 1 | **tron-kit rules** | `.claude/rules/tron/` | Coding standards: naming, testing, security, git workflow |
| 2 | **Engineering principles** | `~/.claude/rules/engineering-principles.md` | Behavior: simplicity, surgical changes, goal-driven execution |
| 3 | **Harness enforcement** | `~/.claude/rules/harness-enforcement.md` | Workflow: commit gates, review gates, approval flow |
| 4 | **Terse mode** | `~/.claude/rules/terse.md` | Communication: terse replies (always on) |
| — | **Agent roster** | `~/.claude/rules/agent-roster.md` | Subagents: only the 12 `tron-*` agents; pillars: security → architecture → model governance → quality → token economy → speed |

When rule layers conflict: higher priority wins.
When skill layers conflict: engineering principles > tron-kit.
**Communication:** terse mode is mandatory for chat replies; code / commits / PR bodies stay normal prose.

---

## Terse mode — always on

Every agent replies terse by default: cut filler, keep technical accuracy, quote code and commands exactly. Levels: `terse lite|full|ultra`; pause with `stop terse` / `normal mode`. Normal prose for security warnings, irreversible actions, or user confusion — then resume.

Full contract: `~/.claude/rules/terse.md`.

---

## Frontend skills — mandatory for UI tasks

On ANY frontend/UI task (pages, components, styling, layout, redesign, landing, dashboard):

**Source of truth for DESIGN** = the tron design stack (`~/.agents/skills/<name>/SKILL.md`, symlinked into `~/.claude/skills/` and `~/.cursor/skills/`):

1. **`tron-design`** — always first: direction, modes, critique/audit, refine commands, live iteration, and the hook-enforced detector. Style modules (`reference/styles/`) for landing/portfolio/marketing/redesign; dashboards follow its Operate mode.
2. **`tron-motion`** — animation, transitions, gestures, toasts, interaction feel (web + Expo).
3. **`tron-native`** — native iOS/Android/desktop feel, Apple-quality design, Swift/SwiftUI.
4. **`tron-imagery`** — image-model comps, image-to-code, brand kits, only when the brief calls for imagery.

Then:

5. **`tron-design-fallback`** (subordinate) — `~/.claude/skills/tron-design-fallback/SKILL.md`. Consult **only after the stack sets direction**, and only for the four areas it does not cover: charts/data visualization, form UX patterns, web navigation patterns, and stack implementation guidelines (Vue, Nuxt, React, Next.js, React Native, shadcn/ui, Tailwind). Never sets visual direction. Includes a short pre-delivery add-on.

**On conflict between tron-design-fallback and the tron design stack, ALWAYS prefer the stack.**

Announce: `Using tron-design for [purpose]` — name each companion actually loaded (`+ tron-motion`, `+ tron-native`, `+ tron-imagery`, `+ tron-design-fallback`).

**The tron design stack is mandatory for UI work.** tron-design-fallback is consulted on demand for its four areas, never before the stack establishes design direction.

**When these skills apply:**
- Creating new pages, components, or views
- Restyling or redesigning existing UI
- Implementing landing pages, dashboards, forms, or navigation
- Color, typography, spacing, layout, or animation decisions
- Responsive design, accessibility, or UX improvements
- Any task where the output is visible to a user

**When these skills do NOT apply:**
- Pure backend logic, API design, database migrations
- Infrastructure, DevOps, CI/CD configuration
- Non-visual scripts, tooling, or build configuration

---

## Engineering principles

Applied automatically to every write/edit/refactor task — clarify before building, smallest thing that works, change only what the task needs, define done and prove it. Full contract: `~/.claude/rules/engineering-principles.md`.

---

## Permitted operations

The following are pre-approved — agents proceed without asking:

| Category | Operations |
|----------|-----------|
| File access | Read, Write, Edit any project file |
| Git (read-only) | `git status`, `git log`, `git diff`, `git show`, `git branch`, `git stash list` |
| Build / test | `npm run *`, `bun run *`, `npx *`, `vitest`, `tsc`, `vue-tsc` |
| Exploration | `ls`, `find`, `grep`, `cat`, `head`, `tail`, `wc` |
| Node scripts | `node *` for project tooling |

## Not permitted without explicit user instruction

| Operation | Why |
|-----------|-----|
| `git commit` | Must use `/commit-changes` skill (runs code review + security review first) |
| `git push` / `gh pr create` | Must use `/make-pr` skill |
| Destructive FS ops (`rm -rf`, etc.) | Irreversible — confirm with user |
| Files outside project root | Out of scope |

---

## Commit and PR flow

```
agent wants to commit
  → creates .claude/.commit-authorized
  → runs /commit-changes skill
    → /code-review
    → /security-review
    → git commit (hook reads token, permits, deletes token)

agent wants to open PR
  → writes .claude/.pr-body-draft.md (PT-BR template — see .claude/PR-TEMPLATE.md)
  → validates: node .claude/hooks/lib/validate-pr-body.cjs .claude/.pr-body-draft.md
  → creates .claude/.pr-authorized
  → runs /make-pr skill
    → gh pr create --body-file .claude/.pr-body-draft.md (hook validates command + body; blocks --body inline and ## Summary)
```

Direct `git commit` or `gh pr create` without the token is blocked by the git hooks.
