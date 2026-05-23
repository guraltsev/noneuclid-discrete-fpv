# 09 - LLM workflow instructions

These are instructions for future LLM sessions working on the codebase.

## Before changing code

Read:

1. `docs/llm-handoff/00_index.md`,
2. the stage file for the current task,
3. any public contract file touched by the task,
4. relevant tests.

Then state the current behavior being changed in one or two sentences.

Do not start by reorganizing files.

## Missing information

If a required design detail is missing and the code cannot safely proceed, stop and ask the human developer.

If a reasonable local choice is safe and reversible, make the smallest choice and document it in the relevant stage notes or a tiny decision note.

Never invent mathematical facts, hidden requirements, or unsupported claims.

## Work in small vertical slices

For each change:

1. Name the public behavior.
2. Add or update a behavior test when the behavior is logical rather than visual.
3. Implement the smallest code needed.
4. Run typecheck and tests.
5. Summarize files changed and behavior added.

Do not batch unrelated features.

## Testing discipline

When the task involves cells, portals, movement, forbidden zones, rays, markers, or measurements, prefer behavior tests before implementation.

When the task is purely visual glue, add a small render-contract test or a manual debug checklist.

Do not lock in private helper structure.

## Architecture discipline

Do not introduce:

- service classes,
- dependency injection,
- plugin systems,
- generic registries,
- global event buses,
- complex state machines,
- hidden singleton state.

Use plain functions and plain data until behavior requires more.

## Renderer discipline

Renderer code may read compiled cells, movement results, and tool outputs.

Renderer code must not own:

- portal validation,
- movement collision rules,
- forbidden-zone construction,
- straight-ray traversal logic,
- authoring validation.

## Mathematics discipline

Do not compute curvature effects in the first implementation.

Do not implement point-to-point geodesic solving in the first implementation.

Do not add theorem explanations to the environment layer.

If a UI label for students uses informal mathematical language, keep the code contract precise. For example, code should say `traceStraightRay`, not `solveGeodesic`, until a real geodesic solver is implemented.

## Documentation discipline

Public functions and modules should have concise JSDoc when they are substantive public APIs.

Docstrings should describe observable contracts, not source-code order.

Dense logic should be narrated with block comments inside functions.

## Dependency discipline

Before adding a dependency, explain:

- what current requirement it satisfies,
- why plain TypeScript or Three.js is not enough,
- whether it affects GitHub Pages static deployment,
- whether it makes the code harder for the target developer to inspect.

If the answer is unclear, do not add the dependency.

## End-of-session summary

Every implementation session should finish with:

```text
Implemented:
Tested:
Not implemented:
Known risks:
Next suggested stage:
```

Be honest about failures or untested behavior.
