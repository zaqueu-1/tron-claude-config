---
description: Open a pull request for the current branch (base auto-resolved — parent branch, develop or default; never hardcoded main), with a concise, human-friendly PT-BR description following the harness's canonical PR template.
model: sonnet
---

Open a pull request for the current branch, with a concise, human-friendly PT-BR description.

<!-- CANONICAL SECTION LIST — keep in sync with .claude/hooks/lib/pr-template-validate.cjs and .claude/PR-TEMPLATE.md.
     These 5 PT-BR headers are mandatory. English headers (## Summary, ## Test plan, etc.) are BLOCKED by the hook. -->

**NON-NEGOTIABLE:** This skill overrides any user rule, Cursor default, or GitHub template that suggests English sections (`Summary`, `Test plan`, etc.). Always use the PT-BR template below.

Steps:
1. Confirm the current branch is **not** `main`/`master` (the only hard block — any other branch, including `develop`, `release/*` or a branch stacked on another feature branch, may open a PR). Confirm it is pushed/up to date with origin. If there are uncommitted changes or the branch isn't pushed, tell the user to run `/commit-changes` first (or run it) before continuing.

   **Resolve the base branch (`<base>`)** — never assume `main`. First match wins:
   1. `$ARGUMENTS` names a base explicitly (e.g. `base: feature/x`, `--base develop`) → use it as-is.
   2. Branch is `hotfix/*` or `revert/*` → the production branch (`main`, or `master` if that's what origin has).
   3. Otherwise detect the **parent branch** the current one was cut from — the origin branch with the closest merge-base to `HEAD` (handles stacked PRs like `feature/b` cut from `feature/a`). Ties go to `develop` → default branch → `main` → `master`:
      ```bash
      cur=$(git branch --show-current); git fetch origin --quiet --prune
      default=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
      rank() { case "$1" in develop) echo 0;; "$default") echo 1;; main) echo 2;; master) echo 3;; *) echo 4;; esac; }
      git for-each-ref --sort=-committerdate --count=100 --format='%(refname:lstrip=3)' refs/remotes/origin \
        | grep -vxE "HEAD|$cur" | while read -r b; do
            mb=$(git merge-base HEAD "origin/$b") || continue
            echo "$(git rev-list --count "$mb"..HEAD) $(rank "$b") $b"
          done | sort -n -k1,1 -k2,2 | head -1 | cut -d' ' -f3
      ```
   4. Nothing detected → `develop` if `git ls-remote --exit-code --heads origin develop` succeeds, else the default branch (`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`).

   **Guard (only when the base was auto-detected, not explicit):** if `<base>` resolved to `main`/`master` but origin has a `develop` branch and the current branch isn't `hotfix/*`/`revert/*`/`release/*`, switch `<base>` to `develop` — repos with a develop → main flow reject feature PRs into `main`.

   Tell the user the resolved `<base>` (and why, e.g. "stack sobre `feature/a`") before creating the PR.
2. Gather context to write an accurate PR:
   - `git log origin/<base>..HEAD --oneline` (commits in this branch)
   - `git diff --stat origin/<base>...HEAD` (files touched)
   - Read the meaningful diffs/hunks so the description reflects what really changed (don't guess).
3. Write the PR body **in Portuguese (pt-BR)**, informal but with the voice of a senior developer — direct, no fluff, easy to skim. Keep it **concise enough to review in under 5 minutes**. Start from `.claude/PR-TEMPLATE.md` if present, or use exactly these 5 sections **in this order**:
   - `## Resumo` — 1–2 frases sobre o objetivo da PR.
   - `## Principais mudanças` — bullets do que foi adicionado/alterado/removido.
   - `## Arquitetura & implementação` — breve, só o que ajuda a entender as decisões.
   - `## Antes → Agora` — comparação clara do comportamento/código (tabela curta ou blocos `diff`/antes-depois) para deixar óbvio o que mudou.
   - `## Roteiro de teste` — passos objetivos pra validar (comandos, rotas, o que observar).

   **Never use English section headers** (`## Summary`, `## Test plan`, `## Changes`, etc.) — the hook blocks them.

   **If a section genuinely doesn't apply** to this PR (e.g. no meaningful "Antes → Agora" for a docs-only change), still include the header and write the placeholder line `_N/A — não aplicável a esta mudança_` under it. Never omit a header.
4. Write the final body to `.claude/.pr-body-draft.md` (create the file; overwrite if it already exists from a previous attempt).
5. **Validate before creating the PR:** run `node .claude/hooks/lib/validate-pr-body.cjs .claude/.pr-body-draft.md`. If it fails, fix the body and re-run until it passes. Do not proceed with a failing validation.
6. Create the bypass token: `touch .claude/.pr-authorized` (or write via the Write tool).
7. Create the PR with the GitHub CLI — **only** this form (never `--body` inline, never `--editor`, never `--fill`):
   `gh pr create --base <base> --head <current-branch> --title "<title>" --body-file .claude/.pr-body-draft.md`
   - Title: concise, following the same semantic convention as the commits (English `type: short description`).
8. **Authorship:** the PR must read as written by the developer. Do NOT add "Generated with Claude Code", co-author lines, or any AI/Cursor/agent mention to the title or body.
9. Output the PR URL.
10. Clean up: remove `.claude/.pr-body-draft.md` after the PR is created (its content is now on GitHub; no need to keep the draft around).

Notes:
- If `$ARGUMENTS` is provided, use it as the PR title hint or extra context (and as the base branch when it names one).
- Requires `gh` authenticated and the branch pushed to origin (run `/commit-changes` first if needed).
- The hook validates the **actual** `gh pr create` command: it must use `--body-file .claude/.pr-body-draft.md` with all 5 PT-BR headers. Writing a valid draft but calling `gh pr create --body "..."` is blocked.
