# Harness hooks

Phases: PreToolUse (validate), PostToolUse (format/lint/typecheck), Stop (build/audit).

Controls: `TRON_HOOK_PROFILE` (`minimal`|`standard`|`strict`); `TRON_DISABLED_HOOKS` (comma-separated ids).

No blanket permission bypass. Use scoped allowed-tools when automating.
