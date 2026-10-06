---
paths:
  - "**/*.swift"
  - "**/Package.swift"
---
# Swift Hooks

> Builds on the shared rules in `../common/hooks.md`.

`TRON_HOOK_PROFILE` / `TRON_DISABLED_HOOKS`.

## PostToolUse

- **SwiftFormat**
- **SwiftLint**
- **swift build** on package edits (standard/strict)

## Warnings

Flag `print()` — prefer `os.Logger` or structured logging.
