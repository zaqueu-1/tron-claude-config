---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
---
# Rust Hooks

> Builds on the shared rules in `../common/hooks.md`.

`TRON_HOOK_PROFILE` / `TRON_DISABLED_HOOKS` gate automation.

## PostToolUse

- **cargo fmt**
- **cargo clippy**
- **cargo check** (strict: after non-trivial edits)
