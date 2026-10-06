---
paths:
  - "**/*.pl"
  - "**/*.pm"
  - "**/*.t"
  - "**/*.psgi"
  - "**/*.cgi"
---
# Perl Hooks

> Builds on the shared rules in `../common/hooks.md`.

`TRON_HOOK_PROFILE` / `TRON_DISABLED_HOOKS`.

## PostToolUse

- **perltidy** on `.pl`/`.pm`
- **perlcritic** on `.pm` (standard/strict)

## Warnings

`print` in library modules — use `say` or structured logging (`Log::Any`).
