# Architecture

## Product Model

SASDIS Flow Planner is a local-first browser app. The project JSON is the canonical artifact; Markdown, CSV, and SVG are generated handoff outputs.

The UI supports two connected workflows:

- DevOps handoff: ordered jobs, environments, dependencies, restart notes, and validation checks.
- Architecture planning: sources, selected columns, derived columns, joins, outputs, quality checks, assumptions, risks, and questions.

## Module Map

- `src/types.ts`: shared domain contracts for projects, flows, nodes, edges, schemas, runbooks, and validation issues.
- `src/data.ts`: defaults, sample project, node labels, templates, and empty metadata factories.
- `src/graph.ts`: dependency graph traversal, cycle detection, validation, schema comparison, and runbook assembly.
- `src/exporters.ts`: generated artifacts for DevOps handoff and design review.
- `src/hooks/usePlannerWorkspace.ts`: state orchestration, undo/redo, autosave, import/export actions, canvas gestures, and command actions.
- `src/features/canvas/CanvasWorkspace.tsx`: lane canvas, nodes, connectors, zoom/pan controls, and minimap.
- `src/features/inspector/Inspector.tsx`: project, flow, environment, DevOps, architecture, and review metadata editing.
- `src/features/navigation/LeftPanel.tsx`: flow list, node palette, templates, node search, and snapshots.
- `src/views`: SAS Jobs, Data Design, and Review.

## Data Flow

1. Browser local storage loads a project on app start.
2. User actions commit a new immutable project object.
3. Commits update history, snapshots, and local storage.
4. Graph validation and runbook construction are derived from the active project and flow.
5. Exporters transform the active flow into human-readable and portable artifacts.

## Boundaries

No backend, authentication, shared workspace, or scheduler integration exists yet. Those should be added only after the local-first workflow is proven.
