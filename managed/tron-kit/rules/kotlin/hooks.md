---
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "**/build.gradle.kts"
---
# Kotlin Hooks

> Builds on the shared rules in `../common/hooks.md`.

`TRON_HOOK_PROFILE` / `TRON_DISABLED_HOOKS` control which hooks run.

## PostToolUse

- **ktfmt** or **ktlint** on `.kt` / `.kts`
- **detekt** when configured
- **`./gradlew build`** on compile-risky edits (strict profile)
