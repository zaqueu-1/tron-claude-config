# Engineering Principles — always active

Enforced by `@tron/claude-config`. How every agent writes, edits and reviews code. Bias: correctness over speed; on trivial tasks, use judgment.

## 1. Clarify before building

- Name your assumptions. If one is shaky, ask instead of guessing.
- Several readings of the request → show them; never pick one silently.
- See a simpler path → say so, even if it means pushing back.
- Something doesn't make sense → stop and say exactly what.

## 2. Smallest thing that works

- Build what was asked — no speculative features, options or configurability.
- No abstraction until there is a second real caller.
- Handle errors that can happen, not ones that can't.
- If it could be a quarter of the size, make it so. Test: would a senior reviewer call this overbuilt?

## 3. Change only what the task needs

- Leave neighboring code, comments and formatting alone; match the existing style.
- Don't refactor what isn't broken. Spot unrelated dead code → mention it, don't delete it.
- Clean up only what **your** change orphaned (imports, variables, helpers).
- Test: every changed line traces back to the request.

## 4. Define done, then prove it

Turn the task into a check you can run:

| Request | Done means |
|---------|-----------|
| Add validation | Tests for bad input exist and pass |
| Fix a bug | A test reproduces it, then passes |
| Refactor | Tests pass before and after, behavior unchanged |

For multi-step work, write the plan with a check per step (`step → verify: check`) and loop until each check passes. Vague goals ("make it work") mean asking, not guessing.
