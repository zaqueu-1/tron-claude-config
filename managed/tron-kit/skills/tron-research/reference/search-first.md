# Search-first (before you code)

## Trigger

New feature, dependency, integration, or utility — especially when "add X" might already exist in ecosystem or repo.

## Preflight (honest coverage)

| Channel | Check | If missing |
|---------|-------|------------|
| Repo | `rg`, **tron-graph** `search_code` / `search_graph` | State graph/repo partial view |
| Package manager | project lockfile / `npm`, `pip`, etc. | Web + **tron-docs** only |
| GitHub | `gh auth status` | Public search or skip GH code search |
| MCP / skills | configured servers, `~/.claude/skills` | Note gap |
| Library APIs | **tron-docs** `query-docs` | No version-accurate API claims |

## Decision matrix

| Signal | Action |
|--------|--------|
| Strong match, maintained, acceptable license | **Adopt** |
| Partial fit | **Extend** — thin wrapper |
| Several weak pieces | **Compose** |
| Nothing fit | **Build** — informed by alternatives seen |

Score candidates: functionality, maintenance, docs, license, transitive weight (avoid mega-deps for one helper).

## Quick inline pass

0. In-repo? graph + ripgrep.
1. Registry search (language-appropriate).
2. MCP server already configured?
3. House or project skill?
4. GitHub code search for maintained OSS.

## Full pass

Launch **tron-researcher** (or general research subagent) with need description, stack constraints, and required comparison table (pros/cons/recommendation).

Pair with **iterative-retrieval** when evaluating multiple candidates deeply.

## Category shortcuts (examples)

Lint/format/test tooling per stack; HTTP (`httpx`, `ky`); validation (`zod`, `pydantic`); markdown (`remark` ecosystem); images (`sharp`).

## Anti-patterns

Jumping to implementation; ignoring MCP; claiming "nothing found" when a channel was down; heavy wrapper that hides upstream API; dependency bloat.

Integration: **tron-pm** planning should include search results before architecture lock-in.
