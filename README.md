<p align="center">
  <img src="docs/assets/harness-banner.svg" alt="@tron/claude-config — Enforcement harness for Claude Code" width="100%"/>
</p>

<p align="center">
  <strong>Stop hoping the AI follows the process. Make the process impossible to skip.</strong>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.11.0-0F766E?style=for-the-badge"/>
  <img alt="node" src="https://img.shields.io/badge/node-%3E%3D18-38BDF8?style=for-the-badge&logo=node.js&logoColor=white"/>
  <img alt="pm" src="https://img.shields.io/badge/npm%20%7C%20pnpm%20%7C%20bun-ready-A78BFA?style=for-the-badge"/>
  <img alt="license" src="https://img.shields.io/badge/private-Tron-1E293B?style=for-the-badge"/>
</p>

---

# @tron/claude-config

Drop one dependency into any repo. On `npm install`, Claude Code gets **hooks, git gates, scoped coding rules, and the official skills** (`/commit-changes`, `/code-review`, `/security-review`, `/make-pr`) — enforced by the filesystem, not by memory.

> **Hooks over vibes.** Reviews before commits. Complete PRs before merge. Rules matched to the project stack. Silent daily self-update.

---

## Why you should install this

| Without the harness | With the harness |
|---------------------|------------------|
| Anyone (or any model) can `git commit` raw | Only `/commit-changes` after **security + code review** |
| PRs that say “fix stuff” | Template with **5 mandatory sections** (PT-BR) |
| Rules copied by hand (or forgotten) | **tron-kit rules scoped** to Vue / React / TS / … automatically |
| “Did you update the package?” | **Auto-update** once per day, silent |
| Different process per repo | **One kit** across the company |
| Verbose AI replies | **Terse mode** always on — same substance, fewer tokens |

<p align="center">
  <img src="docs/assets/flow-commit.svg" alt="Commit flow: rules enforcement → security-review → code-review → git commit → push" width="100%"/>
</p>

---

## 60-second install

### 1. Add the dependency

```json
{
  "devDependencies": {
    "@tron/claude-config": "git+https://github.com/zaqueu-1/tron-claude-config.git"
  }
}
```

### 2. Install

```bash
npm install   # or: bun install / pnpm install
```

That’s it. `postinstall` wires the repo and (on developer machines) installs the global skills.

> Works with **npm, bun, and pnpm** — detected from your lockfile.

The harness lives under `.claude/` and `.git/hooks/`. It does **not** overwrite your `CLAUDE.md`, repo-local `.claude/commands/`, or `.claude/settings.local.json`.

---

## What you get

### In every consumer repo

```
your-project/
├── .claude/
│   ├── settings.json           ← Claude Code hooks
│   ├── rules/tron/             ← tron-kit rules (common + stack-matched folders)
│   ├── .tron-scope.json        ← last detected scope (audit trail)
│   └── hooks/
│       ├── bypass-check.sh     ← token + PR template gate
│       └── bootstrap-check.sh  ← tool check + daily auto-update
├── .git/hooks/
│   ├── pre-commit              ← blocks raw commits
│   └── pre-push                ← blocks raw push to main/master
├── AGENTS.md                   ← agent contract for this repo
└── scripts/setup-claude-harness.sh
```

### On the developer machine (install-if-missing)

| Command | Role |
|---------|------|
| `/commit-changes` | Official commit path — reviews → token → commit → push |
| `/code-review` | Quality / correctness gate (**required** before commit) |
| `/security-review` | Security checklist gate (**required** before commit) |
| `/make-pr` | Official PR path — PT-BR template + token |

Also installed:

- Always-on rules under `~/.claude/rules/`: **engineering principles** (clarify → smallest change → touch only what's needed → prove done) and **terse mode** (fewer output tokens, same substance; code, commits and PRs stay normal prose)
- **12 tron agents** (enforced) — see [Agents](#agents--12-enforced)
- **Workflow engine** (`standard` profile) — the single plan loop for Claude Code and Cursor (discuss → plan → execute → verify)
- **tron-kit** Claude Code plugin (`tron-kit@tron`, always synced) — lean technical library: 71 stack skills, 3 commands (`build-fix`, `test-coverage`, `refactor-clean`), 5 quality hooks and language rules, vendored as a frozen snapshot under `managed/tron-kit/` and installed at user scope via `claude plugin`. Replaces the former upstream plugin, which postinstall uninstalls automatically
- **tron design stack** — `tron-design`, `tron-motion`, `tron-native`, `tron-imagery` (primary DESIGN authority) + **tron-design-fallback** (subordinate: charts, forms, web navigation, stack guidelines) — mandatory on any UI task; see [Frontend design skills](#frontend-design-skills--max-design-authority) and `AGENTS.md`
- **session-handoff** skill (always synced) — session notes in a central Obsidian vault, saved and resumed; see [Workflow skills](#workflow-skills)
- **issue-board** skill (always synced) — open issues of any GitHub Project (v2) as terminal tables; see [Workflow skills](#workflow-skills)
- **tron-graph** MCP: structural code graph for graph-first navigation, registered as `tron-graph` for Claude Code and Cursor on macOS, Linux and Windows (platform installer + `Unblock-File`, retries, npm fallback)
- **tron-docs** MCP: live library/API documentation, registered as `tron-docs` for Claude Code and Cursor (an existing docs entry is migrated with its key)
- **doc** skill (always synced) — `/doc` finds the repo's Obsidian documentation vault (any folder with `.obsidian/`), reads the latest session note or the current conversation, flags notes whose `file:line` references broke or point to changed code, and applies only the doc changes the user approves (never commits). No vault: warns and offers a minimal one. Works in any project

Existing customized commands are **never overwritten**.

### Agents — 12, enforced

One roster for Claude Code and Cursor, replacing the 105 agents the bundled toolchains used to install. Orchestration follows six pillars in strict order: **security → architecture → model governance**, then **quality → token economy → speed**.

| Agent | Area | Agent | Area |
|---|---|---|---|
| `tron-designer` | UX/UI & design | `tron-qa` | QA & code review |
| `tron-frontend` | Web frontend | `tron-security` | AppSec & compliance |
| `tron-backend` | Backend (default implementer) | `tron-pm` | Product & planning |
| `tron-mobile` | Native & cross-platform | `tron-cto` | Architecture & tech strategy |
| `tron-data-ai` | Data, LLM/ML, evals | `tron-researcher` | Research & docs |
| `tron-devops` | CI/CD & delivery | `tron-infra` | Cloud, IaC, networking |

- **Files:** `managed/agents/tron/*.md` → `~/.claude/agents/` and `~/.cursor/agents/`; the orchestration protocol is one rule, `~/.claude/rules/agent-roster.md` (+ `~/.cursor/rules/agent-roster.mdc`).
- **Enforcement:** `~/.claude/tron/agent-roster-guard.js` runs on every subagent spawn (Claude `PreToolUse` Task/Agent; Cursor `preToolUse` + `subagentStart`). The 12 agents and harness built-ins pass; known legacy names (`planner`, `code-reviewer`, …) are **rewritten** to their tron owner with the original contract attached as a role brief, so the workflow and design engines keep working; anything else is blocked. On session start it moves any agent file another tool drops into the agent folders (e.g. after an engine update) to `~/.claude/tron/agent-roles/`.
- **Mapping:** `managed/agents/roster.json` (allowlist, built-ins, legacy → owner, domain routing for generic executors).

### Workflow skills

Two personal-workflow skills ship with the harness. Both are always synced from the package (code files only) and keep each person's settings in a local `config.json` that is never overwritten. Their trigger phrases are PT-BR.

#### `/session-handoff`

Turns the current session into an actionable note for an agent that **did not see the conversation**, and resumes from the latest note. It replaces the legacy `/save-session`, `/salvar` and `/retomar`.

- **When:** "handoff", "resume a sessão", "salva a sessão no obsidian", "retoma a última sessão", "continua de onde parou", or right before `/compact` or `/clear`.
- **Save mode (default):** collects the real state of every repo touched (`git worktree list`, `git status`, `git log`, open PRs via `gh`, cited issues/PRs, `.claude/todo.md`) — collected state beats conversation memory. Writes `<vault>/<repo>/YYYY-MM-DD HHmm — <topic>.md` with a "Comece por aqui" first action, literal user decisions, a pending checklist with `verificar:` per item, risks and promotion candidates. Then rewrites `<vault>/_ULTIMA-SESSAO.md` and prepends a row to `<vault>/_Sessões — Índice.md`.
- **Resume mode:** reads the latest note for the current repo (or `_ULTIMA-SESSAO.md`), reads the docs it lists, re-validates git/gh state, reports what changed in up to 5 lines and runs "Comece por aqui". Authorizations from the previous session do **not** carry over — commit, push, PR and prod writes are asked again.
- **Setup (once):** the vault path lives in `sessionsVault` in `~/.claude/skills/session-handoff/config.json`. On first use the skill asks for it, creates the folder with an empty `.obsidian/` and saves the answer. One folder per repo inside the vault (`avulsas/` outside a repo).
- **Never:** writes session notes inside a code repository; stores secrets (API keys, tokens, passwords, connection strings are replaced with `<redacted>` plus where the secret lives); edits project docs on its own (learnings go to "Candidatos a promoção").

#### `/issue-board`

Shows the open issues you have to do in any GitHub Project (v2) as terminal tables, grouped by type, priority, difficulty, status, repo or a board field. The agent classifies only what the board leaves empty.

- **When:** "minhas issues", "o que tenho pra fazer", "mostra o board", "rankeia as issues", "separa as issues por dificuldade/tipo".
- **Flow:** everything runs through `node ~/.claude/skills/issue-board/board.mjs` (Node 18+ and `gh`, no dependencies):

  ```bash
  S=~/.claude/skills/issue-board
  node $S/board.mjs fetch          # read the board (default: issues assigned to you)
  node $S/board.mjs pending        # valid types + issues still unclassified (JSON)
  node $S/board.mjs classify <file.json>   # apply the agent's classification (file outside the repo)
  python $S/render.py              # rich tables; falls back to the Node render without rich
  node $S/board.mjs render         # same content, plain; --json for another renderer
  ```

  Scope and filters for `pending`/`render`: `--all`, `--user login`, `--por tipo|prioridade|dificuldade|campo|status|repo`, and `--prioridade`, `--dificuldade`, `--tipo`, `--campo`, `--repo`, `--status` (comma-separated, partial, case- and accent-insensitive). `--owner x --project-number n` looks at another board without touching the config.
- **Classification:** each issue gets a type (from the configured `types`, or the built-in neutral list), priority `P0`–`P3`, difficulty `1`–`3` and an optional short note. Results are cached per board under `data/<owner>-<number>/` and reused.
- **Setup (once):** `gh auth login -s read:project` (or `gh auth refresh -s read:project`). On first run the skill lists your boards and writes `owner` and `projectNumber` into `~/.claude/skills/issue-board/config.json`; field names (`status`, `priority`, `size`, `group`), `priorityMap`/`sizeMap` and custom `types` are optional there. For colored tables, `pip install rich`.
- **Never:** edits board fields (unless you ask); overrides the board — when `Priority` or `Size` is filled on the board, that value wins and agent suggestions appear only on empty fields, marked `~`; works around missing auth; versions `config.json`.

### Frontend design skills — MAX DESIGN authority

On any frontend/UI task the harness enforces a two-level design stack:

1. **tron design stack** — the **maximum source of truth for design**. `tron-design` always loads first: modes (persuade, operate, read, experience), direction, critique/audit, refine commands (`polish`, `harden`, `typeset`, `layout`, …), live browser iteration, style modules for landing/portfolio/redesign work, and a hook-enforced design detector. `tron-motion` covers animation and interaction feel (web + Expo), `tron-native` covers native platform craft and Swift/SwiftUI, and `tron-imagery` covers image-model comps, image-to-code and brand kits.
2. **tron-design-fallback** — **subordinate**, consulted only after the stack sets direction and only for the four areas it does not cover: **charts and data visualization** (chart selection table + a11y rules), **form UX patterns**, **web navigation patterns**, and **stack implementation guidelines** (high-severity rules for Vue, Nuxt, React, Next.js, React Native, shadcn/ui, HTML + Tailwind), plus a short pre-delivery add-on. It never sets visual direction.

**On any conflict, the tron design stack always wins over tron-design-fallback.** Agents announce `Using tron-design for [purpose]`, naming each companion skill actually loaded. Full contract: [AGENTS.md](managed/AGENTS.md).

The former secondary layer, **ui-ux-pro-max** and **frontend-design**, was removed: its direction-setting generator and style/color/font data competed with the stack. The only genuinely missing pieces were extracted into tron-design-fallback. For the same reason, tron-kit excludes the upstream design, motion and accessibility skills that overlap the stack.

Where they land on the developer machine:

- The four stack skills live under `managed/skills/tron-{design,motion,native,imagery}/`, are synced fresh to `~/.agents/skills/` on every install, then symlinked into `~/.claude/skills/`, `~/.cursor/skills/` and `~/.github/skills/`. They replace 27 former skills; postinstall removes the retired names.
- `tron-design` runs its bundled design engine only through `scripts/tron-design`, which turns off telemetry and self-update (engine updates go through the maintainer upstream tracker), and keeps agent-facing output in tron terms. The `darwin-arm64` engine binary ships in-tree; other platforms fetch the pinned binary on first run. Design subagent contracts are folded into `tron-designer`.
- Edit-discipline hooks are merged into the consumer repo's `.cursor/hooks.json` and `.github/hooks/tron-design.json` (existing hooks are kept; the legacy hook path is migrated).
- **tron-design-fallback** is vendored under `managed/skills/tron-design-fallback/` and always synced (overwritten) to `~/.claude/skills/` and `~/.cursor/skills/`.
- Postinstall removes leftover `ui-ux-pro-max` / `frontend-design` skill folders from `~/.claude/skills/`, `~/.cursor/skills/`, `~/.agents/skills/` and `~/.github/skills/`, and disables the official `frontend-design@claude-plugins-official` Claude Code plugin.
- The `frontend-skills.mdc` rule (always synced to `~/.cursor/rules/`) encodes this authority order for every UI task.

---

## How enforcement works

### Commit path

1. `/security-review` on the staged/branch diff → **BLOCK** on CRITICAL/HIGH  
2. `/code-review` on the same diff → **BLOCK** on CRITICAL/HIGH  
3. Create `.claude/.commit-authorized`  
4. `git commit` — hooks allow once, then delete the token  

Raw `git commit` in the terminal? **Blocked** by `pre-commit`.

### PR path

1. `/make-pr` writes `.claude/.pr-body-draft.md` from `.claude/PR-TEMPLATE.md` (5 PT-BR sections)
2. Runs `node .claude/hooks/lib/validate-pr-body.cjs .claude/.pr-body-draft.md`
3. Creates `.claude/.pr-authorized`
4. `gh pr create --body-file .claude/.pr-body-draft.md` — hook validates token, **command**, and headers (blocks inline `--body` and English `## Summary`)

Required sections: **Resumo**, **Principais mudanças**, **Arquitetura & implementação**, **Antes → Agora**, **Roteiro de teste**.  
English headers (`Summary`, `Test plan`, …) are **rejected**. If a section doesn’t apply, keep the header and use `_N/A — não aplicável a esta mudança_`.

### Scoped tron-kit rules

On install and on harness setup/update, the package:

1. Detects stack from `package.json` + project markers  
2. Reads rule folders from the bundled `managed/tron-kit/rules/` snapshot (no network)  
3. Syncs **only** matching folders into `.claude/rules/tron/`  
4. Removes managed folders that no longer match (and legacy rule folders from before tron-kit, if present)  

Always: `common`. Conditionally: `typescript`, `vue`, `nuxt`, `react`, `react-native`, `web`, `csharp`, `python`, `golang`, and other tron-kit languages when detected.

### Session bootstrap

Every Claude prompt runs `bootstrap-check.sh`:

- Re-runs `ensure-tron-graph.js` if `tron-graph` is missing (same Win + Unix path as postinstall)
- Warns if the workflow engine is missing  
- Once per 24h, compares package SHA to remote and self-updates  

Manual repair: `npm run ensure:tron-graph` (or `node node_modules/@tron/claude-config/scripts/lib/ensure-tron-graph.js`).

---

## Quality layers

| Layer | Where | Wins on |
|-------|--------|---------|
| **tron-kit rules** | `.claude/rules/tron/` | Coding standards |
| **Engineering principles** | `~/.claude/rules/engineering-principles.md` | Behavior: simplicity, surgical edits |
| **Harness skills** | `~/.claude/commands/*` | Commit / PR workflow |

tron-kit > engineering principles on standards. Engineering principles > tron-kit on how to approach the work.

---

## Emergency bypass

```bash
git commit --no-verify -m "emergency only"
git push --no-verify

# Tear down gates in one repo:
rm .git/hooks/pre-commit .git/hooks/pre-push
```

---

## Keep it fresh

Push to `main` in this repo. Consumers pick up changes on the next daily check — or immediately on `npm install`.

```bash
npm version patch|minor|major
git push origin main --follow-tags
```

Full maintainer playbook: **[MAINTAINER.md](MAINTAINER.md)** · Day-to-day reference: **[HARNESS-GUIDE.md](HARNESS-GUIDE.md)**

---

## Uninstall

```bash
rm .git/hooks/pre-commit .git/hooks/pre-push
npm uninstall @tron/claude-config
# optional: rm .claude/hooks/bypass-check.sh .claude/hooks/bootstrap-check.sh
```

---

## Package map

```
tron-claude-config/
├── package.json                 # v1.11.0 · postinstall entry
├── scripts/
│   ├── postinstall.js           # install orchestrator
│   ├── sync-tron-rules.js       # manual tron-kit rules re-sync CLI
│   └── lib/
│       ├── detect-project-scope.js
│       ├── install-tron-rules.js
│       ├── install-tron-kit.js  # user-scope plugin install + legacy cleanup
│       ├── ensure-tron-graph.js # code graph MCP (Win + macOS/Linux)
│       └── ensure-tron-docs.js  # docs MCP registration
├── managed/
│   ├── AGENTS.md
│   ├── setup-claude-harness.sh
│   ├── tron-kit/                # frozen tron-kit plugin snapshot (skills, commands, hooks, rules)
│   ├── agents/                  # 12 tron agents, roster.json, roster guard hook
│   ├── claude/                  # settings, hooks, rules (terse, engineering principles, roster)
│   ├── cursor/rules/            # frontend-skills.mdc (design authority)
│   ├── git-hooks/               # pre-commit, pre-push
│   ├── hooks/                   # cursor + github tron-design hook templates
│   └── skills/                  # commit-changes, code-review, security-review,
│                                # make-pr, session-handoff, doc,
│                                # issue-board, tron-design, tron-motion,
│                                # tron-native, tron-imagery, tron-design-fallback
├── upstream/                    # maintainer-only, not published (see MAINTAINER.md)
├── docs/assets/                 # README visuals
├── HARNESS-GUIDE.md
├── MAINTAINER.md
└── README.md
```

---

<p align="center">
  <em>One install. Company-wide process. Reviews you can’t skip.</em>
</p>
