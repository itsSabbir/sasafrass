# Product Plan

## Product Position

SAS Flow Planner is a local-first companion to SAS applications. It does not need a live database connection to be valuable. Its job is to help engineers, analysts, senior reviewers, and DevOps leads turn rough SAS work into a clear flow plan:

- where each step runs
- what data artifact each step consumes and produces
- what depends on what
- what needs review before handoff
- what DevOps should run, in what order

The canonical artifact remains the project JSON. Markdown, CSV, SVG, and review exports are generated from that plan.

## Primary Use Case

The primary tab is `Flow Plan`.

This is the planning map for jobs, tables, checks, notes, and output artifacts. It should be readable before it is editable. A new user should be able to look at the canvas and understand the flow shape without opening every inspector field.

The map should answer:

- What work exists?
- Which environment or lane does it run in?
- What are the upstream and downstream dependencies?
- What artifact is moving through the flow?
- What is incomplete or risky?

## Secondary Use Case

The `SAS Jobs` tab is generated from the flow.

It is not the main planning surface. It is the DevOps handoff view: ordered executable jobs, dependencies, owners, restart notes, inputs, outputs, and validations.

This keeps job scheduling details useful without letting them dominate the flow-planning experience.

## Data Planning Without Database Access

The app should assume users cannot connect it directly to SAS, Teradata, Oracle, or warehouse systems.

Instead, it should make pasted evidence useful:

- copied SAS column lists
- copied Teradata DDL
- copied SQL select lists
- pasted table contracts from docs, tickets, or emails
- manual notes from analysts and engineers

The `Data Design` tab should parse and normalize those inputs into selected columns, output columns, join keys, derivations, filters, and data quality checks. The app should keep the raw planning process lightweight and avoid pretending it has authoritative database access.

## Roles

### Junior Engineer

Needs a guided place to capture:

- job or step name
- source and output artifact
- required inputs
- selected or output columns
- simple run notes
- open questions

The UI should make the next useful field obvious and avoid requiring deep SASDIS knowledge before a useful plan can exist.

### Senior Engineer

Needs to quickly inspect:

- dependency correctness
- join keys
- derived columns
- missing inputs or outputs
- assumptions, risks, and review comments
- whether the graph matches the intended data architecture

The UI should expose risk and architecture signals without forcing every field onto the canvas.

### DevOps Lead

Needs to know:

- job order
- environment
- dependencies
- restart behavior
- validation checks
- handoff warnings

The `SAS Jobs` and `Review` tabs should be generated, stable, and exportable.

### Analyst

Needs to contribute:

- business columns
- filters
- output expectations
- open questions
- data quality checks

They should not need a database connection or DevOps vocabulary to make the plan better.

## Current Design Direction

1. Make `Flow Plan` the primary surface.
2. Keep the canvas spacious, readable, and artifact-oriented.
3. Make connections easy to create and easy to remove.
4. Propagate obvious metadata when nodes connect:
   - upstream produced output becomes downstream required input
   - disconnecting removes the propagated input when no other upstream still provides it
5. Parse pasted SAS and warehouse-style column text into clean schema fields.
6. Keep SAS job scheduling details in `SAS Jobs`, not as the first mental model.
7. Preserve JSON compatibility and local-first storage.

## Non-Goals

- No live database connection in the initial product.
- No SAS code execution.
- No scheduler integration until the handoff contract is real.
- No backend or shared workspace until local-first planning is proven.
- No Excel as the source of truth.

## Next Product Phases

### Phase 1: Clear Flow Planning

- Spacious canvas lanes.
- Clean node cards with role-based detail modes.
- Explicit connect and disconnect controls.
- Dependency metadata propagation.
- Better import/export round trips.
- Stronger empty states and role-specific guidance.

### Phase 2: Evidence Parsing

- Smarter SAS column parsing.
- Smarter Teradata and SQL DDL parsing.
- Raw paste preview before commit.
- Column classification: key, measure, date, flag, descriptor.
- Paste-to-node actions for source, transform, join, and output nodes.

### Phase 3: Review Intelligence

- Highlight missing handoff details by role.
- Show architecture risks separately from DevOps risks.
- Suggest missing join keys, outputs, validations, and restart notes.
- Add reviewer status per node.
- Add a printable review packet.

### Phase 4: Integrations After Proof

- Optional Jira or Confluence export.
- Optional scheduler handoff mapping.
- Optional backend workspace.
- Optional approved source-system adapters if there is a real access path.

## Acceptance Bar

A useful plan should pass this test:

1. A junior engineer can add steps and connect them without training.
2. A senior engineer can inspect dependencies and data design in under five minutes.
3. A DevOps lead can open `SAS Jobs` and understand the execution order.
4. An analyst can paste columns or notes and see them become structured planning data.
5. Exported JSON can be imported back without losing the graph.
