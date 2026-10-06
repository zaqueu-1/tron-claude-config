# Prompt optimizer (advisory)

Analyze a draft user prompt and return a **better prompt to paste** — plus diagnosis. **Do not execute** the underlying task, write production code, or mutate the repo unless the user starts a normal task request.

## Triggers

- “Optimize / improve / rewrite my prompt”
- User pastes a vague instruction and asks how to ask the agent better
- **Not** for “optimize this code/performance” — that is implementation work
- **Not** when user says “just do it” — tell them to send a standard task message instead

## Pipeline

### 0 — Context

- Read project `CLAUDE.md` when present
- Infer stack from manifests (`package.json`, `pyproject.toml`, `go.mod`, etc.)
- If greenfield, mark stack unknown in output

### 1 — Intent

| Intent | Signals |
|--------|---------|
| Feature | build, add, implement |
| Bug | fix, broken, error |
| Refactor | restructure, clean up |
| Research | how, explore, investigate |
| Test | coverage, verify |
| Review | audit, PR review |
| Docs | document, README |
| Infra | deploy, CI, database |
| Design | architecture, data model |

### 2 — Scope

| Scope | Heuristic | Orchestration |
|-------|-----------|---------------|
| Trivial | one file | direct task |
| Low | one module | single skill |
| Medium | multi-file, one domain | skill chain + **tron-quality** verify |
| High | cross-domain | plan first (**tron-research** / **tron-pm**) |
| Epic | multi-session | phased plan, **/session-handoff** between sessions |

### 3 — Kit mapping (tron names)

| Intent | Skills / agents |
|--------|-----------------|
| Feature | **tron-quality**, stack skill (**tron-web**, **tron-react**, **tron-python**, …), **tron-qa** review |
| Bug | **tron-quality**, stack skill |
| Refactor | **tron-quality**, **code-review** |
| Research | **tron-research**, **tron-graph**, **tron-docs** |
| Test | **tron-quality** |
| Review | **code-review**, **security-review**, **tron-qa**, **tron-security** |
| Infra | **tron-delivery**, **tron-infra**, **tron-devops** |
| ML / LLM | **tron-ml**, **tron-data-ai** |

Add stack skill from detection table (e.g. Python → **tron-python**, Postgres → **tron-databases**).

### 4 — Missing context scan

Flag gaps: acceptance criteria, scope boundaries, error handling, security, tests, performance, a11y (**tron-design** `audit`/`harden` for UI), migrations. If **3+** critical gaps, ask up to **3** clarifying questions before emitting the optimized prompt.

### 5 — Model recommendation (house rule)

| Scope | Agent model tier |
|-------|-------------------|
| Trivial–medium planning, research, prompt writing | Economical |
| Production code implementation | Robust |
| Epic architecture | Robust for plan; economical for doc-only phases unless deep reasoning required |

Split HIGH/EPIC work into sequential prompts (research → plan → implement phases → integration review).

## Output format (match user language)

### 1. Diagnosis

Strengths; issues table (problem / impact / fix); clarification list (or auto-detected facts).

### 2. Recommended kit

| Type | Name | Purpose |

### 3. Optimized prompt — full

Single fenced block, self-contained: context, stack, acceptance criteria, verification, explicit “do not” scope, skill/agent hints.

### 4. Optimized prompt — quick

One-liner patterns per intent (e.g. feature: plan → TDD → code-review → verify).

### 5. Rationale table

| Enhancement | Why |

Footer: user may request edits or switch to a normal execution request.

## Example (English, abbreviated)

**In:** “Add profile PATCH API with validation”

**Out (full prompt sketch):** stack-detected Go + chi; PATCH `/api/users/:id`; authz self-only; table-driven tests; follow existing handlers; **tron-services** + **tron-go**; acceptance = 200/400/401 paths; do not change schema; run tests + build before review.

## Related

- **tron-research** — discovery before large prompts
- **tron-ml** `cost-aware-llm-pipeline` — token spend when prompts embed huge context
- **/session-handoff** — multi-session epic work
