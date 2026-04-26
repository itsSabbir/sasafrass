# SASDIS Flow Planner

SASDIS Flow Planner is a local-first web app for designing SASDIS-style job flows, planning SAS data architecture, and producing clean DevOps handoff artifacts without using Excel as the source of truth.

The current product direction is documented in [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md). The primary surface is the Flow Plan: a readable planning map for where work runs, what artifacts move through the flow, and what depends on what. SAS job handoff is generated from that map as a secondary view.

The product is built for teams that need to answer three practical questions quickly:

- What jobs need to run?
- Where do they run: `staging`, `JarvisDW`, `analysis`, or another environment?
- In what order, with what inputs, outputs, restart notes, validations, and architecture assumptions?

The app intentionally feels familiar to SASDIS users through a left navigator, environment lanes, draggable planning nodes, dependency connectors, and a right-side properties inspector. It is not a SASDIS clone; it is a faster planning and handoff layer designed for communication, review, and reusable flow documentation.

## Current Status

This is a working single-package Vite, React, and TypeScript app.

Included now:

- Local-first project storage.
- Browser autosave.
- Import/export project JSON.
- Flow Plan canvas.
- Environment lanes.
- SASDIS-style node palette and templates.
- Dependency connectors.
- Undo/redo.
- Node search.
- Command palette.
- Project snapshots.
- SAS Jobs handoff view.
- Data Design view.
- Review view.
- Validation health checks.
- Markdown, CSV, JSON, and SVG exports.
- CI workflow and agent review docs.

Not included yet:

- Shared backend workspace.
- Authentication.
- Realtime collaboration.
- Jira/Confluence integration.
- Scheduler or DevOps system integration.
- SAS code generation.
- Executable data simulation.

Those are intentionally deferred until the local-first workflow proves useful.

## Why This Exists

The existing planning workflow often falls back to Excel. That creates predictable problems:

- Flow order is hard to understand.
- Dependencies are easy to miss.
- Data architecture is detached from job handoff.
- Diagrams are static and painful to revise.
- DevOps handoff lacks a consistent structure.
- Junior and senior developers do not have a fast shared planning surface.

SASDIS Flow Planner replaces the spreadsheet as the planning artifact. The project JSON becomes the source of truth; Markdown, CSV, and SVG are generated from it.

## Product Workflows

### 1. DevOps Handoff

Use Flow Plan to model work steps and dependencies, then open SAS Jobs to generate an ordered job list.

Each runnable node can capture:

- Job name.
- Environment.
- Flow/group.
- Owner.
- Required inputs.
- Produced outputs.
- Dependency rules.
- Run notes.
- Restart notes.
- Validation checks.

Exports include:

- Markdown/Jira-ready runbook.
- CSV job list.
- SVG diagram.
- Canonical JSON project file.
- Design review Markdown.

### 2. Architecture Planning

Use nodes to plan the data flow before implementation.

Each node can capture:

- Source table or file.
- Selected columns.
- Derived columns.
- Filters.
- Join type.
- Join keys.
- Output columns.
- Data quality checks.
- Open questions.
- Assumptions.
- Risks.
- Reviewer comments.

The goal is to let developers review the design before writing production SAS code.

## Quick Start

Install dependencies:

```bash
npm install
```

Start the local app:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173
```

Run the full verification suite:

```bash
npm run ci
```

That runs:

```bash
npm run typecheck
npm test
npm run build
```

## How To Use The App

### Create Or Edit A Flow

1. Open the app.
2. Use the left panel to select a flow.
3. Drag a node type or template onto Flow Plan.
4. Move nodes between environment lanes.
5. Click a node to edit metadata in the right inspector.
6. Use the connector button on a node to draw a dependency to another node.
7. Open SAS Jobs to review execution order.
8. Open Data Design to review architecture metadata.
9. Export the bundle when ready for handoff.

### Typing In Fields

The right-side inspector uses draft fields for text entry.

- You can type normally in every input and text area.
- Single-line inputs save when you press Enter or leave the field.
- Text areas save when you leave the field.
- Text areas also save with Ctrl+Enter or Cmd+Enter.
- List-style fields accept newline-separated values and also tolerate commas on save.

This avoids the bad spreadsheet-like behavior where fields reformat while you are still typing.

### Build A DevOps Handoff

1. Add runnable nodes: SAS Job, Transform, Join, Output, or Checkpoint.
2. Set each node's environment.
3. Add the DevOps job name.
4. Connect dependencies in the order jobs must run.
5. Add inputs, outputs, restart notes, and validations.
6. Open SAS Jobs.
7. Resolve validation warnings.
8. Export the bundle.

### Build An Architecture Plan

1. Add Source, Transform, Join, Output, Validation, and Note nodes.
2. Use source nodes for inbound tables or files.
3. Use transform nodes for derivations, filters, appends, sorts, summaries, and business rules.
4. Use join nodes for lookups, merges, and key matching.
5. Use output nodes for published tables, files, marts, or downstream artifacts.
6. Add selected columns, derived columns, join keys, output columns, and checks.
7. Open Data Design.
8. Export the design review Markdown for peer review.

## Validation Rules

The app currently checks for:

- Missing DevOps job names on runnable nodes.
- Dependency cycles.
- Connectors pointing to deleted nodes.
- Unknown environment assignments.
- Orphaned runnable jobs.
- Multiple executable roots that may imply ambiguous ordering.
- Join nodes without join keys.
- Source nodes without source table/file names.
- Output nodes without output contracts.
- Required inputs that are not produced by upstream nodes.

Validation does not block editing. It gives reviewers and DevOps a clear list of risks before handoff.

## Exports

The project JSON is the canonical artifact.

Generated artifacts:

- `*-runbook.md`: DevOps handoff and execution order.
- `*-jobs.csv`: tabular job list for spreadsheet-compatible review.
- `*-design-review.md`: architecture review notes.
- `*-diagram.svg`: portable flow diagram.
- `*.json`: full project file for re-import.

CSV, Markdown, and SVG should be treated as generated outputs, not the source of truth.

## Architecture

This repository is intentionally not a monorepo. It is one focused frontend package.

```text
src/
  app/          app-level helpers, factories, storage, constants, text adapters
  components/   reusable UI primitives and shell controls
  features/     large product surfaces: canvas, inspector, navigation
  hooks/        project document state and workspace action orchestration
  styles/       focused CSS modules
  views/        SAS Jobs, Data Design, and Review
  data.ts       defaults, templates, sample project, metadata factories
  exporters.ts  JSON, Markdown, CSV, design review, and SVG exports
  graph.ts      ordering, validation, schema comparison, runbook assembly
  types.ts      shared project, flow, node, edge, schema, and runbook types
```

Core design principles:

- Keep JSON compatibility stable.
- Keep graph and export logic UI-independent.
- Keep `App.tsx` thin.
- Keep local-first behavior simple and reliable.
- Keep DevOps handoff readable by humans first.
- Avoid backend assumptions until the workflow is validated.

## Important Files For Review

- [Agent handoff guide](AGENTS.md)
- [Architecture notes](docs/ARCHITECTURE.md)
- [Review guide](docs/REVIEW_GUIDE.md)
- [Agent review manifest](docs/agent-review.yml)
- [CI workflow](.github/workflows/ci.yml)
- [PR checklist](.github/pull_request_template.md)

## Scripts

```bash
npm install
```

Install dependencies.

```bash
npm run dev
```

Start the local dev server at `http://127.0.0.1:5173`.

```bash
npm run typecheck
```

Run TypeScript validation.

```bash
npm test
```

Run unit tests.

```bash
npm run build
```

Create a production build in `dist/`.

```bash
npm run ci
```

Run typecheck, tests, and production build.

```bash
npm run preview
```

Preview the production build locally.

## Manual Smoke Test

Use this after UI changes:

1. Start the app with `npm run dev`.
2. Open `http://127.0.0.1:5173`.
3. Click an existing node.
4. Type into Job name, Owner, Run notes, Selected columns, Join keys, and Notes.
5. Leave each field and confirm the text remains.
6. Drag a node from one environment lane to another.
7. Add a new SAS Job node.
8. Connect it to another node.
9. Open SAS Jobs and confirm job order updates.
10. Open Data Design and confirm metadata appears.
11. Export the bundle.
12. Import the JSON file and confirm Flow Plan returns.

## Automated Test Coverage

Current tests cover:

- Dependency ordering.
- Cycle detection.
- Missing job-name validation.
- JSON round trip parsing.
- Markdown and CSV export generation.
- Design review export generation.
- Text field adapter parsing.
- Canvas environment geometry.
- Flow/node factory behavior.

Run:

```bash
npm run ci
```

## Quality Bar

For this to remain useful as a high-end internal tool, changes should preserve:

- Fast editing.
- Reliable typing.
- Clear graph visuals.
- Stable JSON export/import.
- Human-readable DevOps handoff.
- Strong validation warnings.
- Small, reviewable files.
- No hidden backend dependency.
- No return to Excel as source of truth.

## Roadmap

Recommended next phases:

1. Add browser-level smoke tests for typing, drag/drop, exports, and import round trips.
2. Add printable PDF export.
3. Add Excel import helpers for legacy migration.
4. Add reusable organization templates.
5. Add comment/review status per node.
6. Add project version history UI.
7. Add optional shared workspace backend after local-first usage is proven.
8. Add Jira/Confluence and DevOps scheduler integrations after exact system contracts are known.

## Troubleshooting

If the app does not load:

```bash
npm install
npm run dev
```

If the browser has stale data:

- Export any project you want to keep.
- Clear local storage for `127.0.0.1:5173`.
- Reload the app.

If tests fail with a Windows sandbox spawn error, rerun the same command outside the sandbox. The app itself can still typecheck/build; the issue is Vite/Vitest needing to spawn a helper process on Windows.

## License And Internal Use

This project is currently private and intended as an internal planning tool prototype. Confirm organization policy before distributing screenshots, data, exports, or project files outside the approved team.
