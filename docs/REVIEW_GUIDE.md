# Review Guide

## What To Inspect First

Start with `src/graph.ts` and `src/exporters.ts` for behavior changes. These files affect DevOps handoff correctness more than visual polish.

Then inspect:

- `src/types.ts` for project-file compatibility.
- `src/data.ts` for default templates and sample project behavior.
- `src/hooks/usePlannerWorkspace.ts` for state transitions and side effects.
- `src/features/canvas/CanvasWorkspace.tsx` for canvas interaction regressions.
- `src/features/inspector/Inspector.tsx` for metadata editing regressions.

## High-Risk Regressions

- Dependency cycles not detected.
- Source/note nodes accidentally appearing as runnable jobs.
- Run order changing unexpectedly.
- Import/export JSON losing metadata.
- Missing job names not flagged before handoff.
- Join nodes not surfacing missing join keys.
- Canvas drag moving nodes to the wrong environment lane.

## Manual Smoke Script

1. Start the app with `npm run dev`.
2. Open `http://127.0.0.1:5173`.
3. Add a SAS Job node from the left palette.
4. Drag it between `staging`, `JarvisDW`, and `analysis`.
5. Connect it to an existing downstream node.
6. Edit job name, owner, inputs, outputs, validations, selected columns, derived columns, and join keys.
7. Open SAS Jobs and confirm the job order updates.
8. Open Data Design and confirm metadata appears.
9. Export bundle.
10. Import the JSON file and confirm Flow Plan returns.

## Automated Checks

```bash
npm run ci
```
