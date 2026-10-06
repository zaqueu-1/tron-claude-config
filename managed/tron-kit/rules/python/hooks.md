---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Hooks

> Builds on the shared rules in `../common/hooks.md`.

Hook intensity: `TRON_HOOK_PROFILE` (`minimal` | `standard` | `strict`). Skip ids via `TRON_DISABLED_HOOKS` (comma-separated).

## PostToolUse (when profile allows)

- **black** / **ruff** on edited `.py`
- **mypy** / **pyright** after type-sensitive edits

## Warnings

- Flag new `print()` in application code — use `logging`.
