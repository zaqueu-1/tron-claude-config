# Agent orchestration

## Tron agents (12)

Invoke via Task/subagent with the agent id below.

| Agent | Use when |
|-------|----------|
| tron-pm | Requirements, breakdown, acceptance criteria, plans |
| tron-cto | Architecture, ADRs, tech choice, refactor strategy |
| tron-researcher | Mapping, docs synthesis, external API research |
| tron-designer | UX/visual direction; a11y via `tron-design` audit/harden |
| tron-frontend | Web UI implementation |
| tron-backend | APIs, services, auth, jobs |
| tron-mobile | React Native / native mobile |
| tron-data-ai | SQL, pipelines, LLM features |
| tron-devops | CI/CD, hooks, releases |
| tron-infra | Cloud, IaC, K8s |
| tron-qa | Review gate, tests, verification |
| tron-security | AppSec, threat modeling |

## Model tier

| Phase | Tier |
|-------|------|
| Planning, research, review, docs, verification | Economical (Composer, Sonnet, Haiku read-only) |
| Production code changes | Robust (Opus-class execution) |

## Auto-delegate

- Complex feature → tron-pm / tron-cto
- After code changes → tron-qa or `code-review` skill
- Sensitive surface → tron-security or `security-review` skill

## Parallel + completion

Parallelize independent audits. **Never** finish while subagents still run — collect and merge results first. Split work only when one context cannot hold it.
