# Agent Handoff Guide

## Project Shape

This is a single-package Vite React app, not a monorepo. Keep it that way unless the product gains a real backend or shared package boundary.

Primary folders:

- `src/app`: small app-level helpers, storage, constants, and UI-independent formatting.
- `src/components`: reusable shell and primitive UI components.
- `src/features`: larger product surfaces such as canvas, inspector, and navigation.
- `src/hooks`: state orchestration and user actions.
- `src/views`: full-page workspace views.
- `src/graph.ts`: graph ordering, dependency validation, and runbook construction.
- `src/exporters.ts`: JSON, Markdown, CSV, design review, and SVG export generation.

## Review Priorities

1. Protect project JSON compatibility. The JSON export is the canonical source of truth.
2. Treat graph ordering and cycle detection as high-risk behavior.
3. Validate DevOps handoff output after any metadata or export change.
4. Keep UI files focused. Do not re-merge components into `App.tsx`.
5. Avoid backend assumptions. The current product is intentionally local-first.

## Required Checks

Run these before handing work back:

```bash
npm run typecheck
npm test
npm run build
```

For UI changes, also smoke test:

```bash
npm run dev
```

Then open `http://127.0.0.1:5173`.

## Acceptance Smoke Test

Create or modify a flow, add a node, connect dependencies, edit DevOps metadata, open Run Plan, open Design Review, export the bundle, import the JSON back, and confirm the graph still renders.
