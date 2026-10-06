---
paths:
  - "**/*.fs"
  - "**/*.fsx"
  - "**/*.fsproj"
  - "**/*.sln"
  - "**/*.slnx"
  - "**/Directory.Build.props"
  - "**/Directory.Build.targets"
---
# F# Hooks

> Builds on the shared rules in `../common/hooks.md`.

`TRON_HOOK_PROFILE` / `TRON_DISABLED_HOOKS`.

## PostToolUse

- **fantomas**
- **dotnet build**
- **dotnet test --no-build** on behavior edits (standard/strict)

## Stop

Strict: final build; warn on `appsettings*.json` changes.
