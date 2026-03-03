---
description: Unified spec-driven development workflow. Chains socratic-questioning, doc-coauthoring, and code-reviewer skills into a single pipeline with task tracking and archiving.
---

# /spec — Unified Spec-Driven Workflow

A 5-phase pipeline for spec-driven feature development. Combines existing skills with structured task tracking and archiving.

**Usage:**

```
/spec <feature-name>                    → Start from Phase 1 (Propose)
/spec <feature-name> phase:discover     → Jump to Phase 2
/spec <feature-name> phase:draft        → Jump to Phase 3
/spec <feature-name> phase:implement    → Jump to Phase 4
/spec <feature-name> phase:review       → Jump to Phase 5
```

---

## Phase 1: Propose

**Goal:** Scaffold the feature folder and establish the working space.

**Steps:**

1. Create the feature directory at `docs/specs/active/<feature-name>/`
2. Create `spec.md` with this template:

```markdown
# <Feature Name>

> Status: DRAFT | APPROVED | IMPLEMENTED | ARCHIVED
> Created: <date>
> Last Updated: <date>

## Summary

[One paragraph describing what this feature does and why]

## Background & Motivation

[Why are we building this? What problem does it solve?]

## Requirements

### Functional Requirements

- [ ] FR-1: ...
- [ ] FR-2: ...

### Non-Functional Requirements

- [ ] NFR-1: ...

## Technical Design

### Data Model

[Schema changes, new tables/columns]

### API Changes

[New or modified endpoints]

### Frontend Changes

[UI components, state management]

## Edge Cases & Error Handling

[What happens when things go wrong]

## Out of Scope

[What we're explicitly NOT doing]

## Open Questions

[Unresolved decisions — clear these before moving to Phase 4]
```

3. Create `tasks.md` with this template:

```markdown
# <Feature Name> — Implementation Tasks

> Spec: [spec.md](./spec.md)
> Status: NOT STARTED | IN PROGRESS | DONE

## Tasks

### 1. Data Layer

- [ ] 1.1 ...
- [ ] 1.2 ...

### 2. Backend

- [ ] 2.1 ...
- [ ] 2.2 ...

### 3. Frontend

- [ ] 3.1 ...
- [ ] 3.2 ...

### 4. Testing

- [ ] 4.1 ...
- [ ] 4.2 ...
```

4. Announce the feature folder is ready and ask the user if they want to proceed to Discover.

**Exit condition:** Feature folder exists with both template files.

---

## Phase 2: Discover

**Goal:** Use Socratic questioning to excavate requirements, challenge assumptions, and find edge cases BEFORE writing the spec.

**Skill:** `socratic-questioning`

**Steps:**

1. Read any context the user provides (PRDs, screenshots, existing code, chat history)
2. Apply the Socratic method systematically:
   - Start with **Clarification Questions** — ensure shared understanding of the feature
   - Move to **Probing Assumptions** — challenge "obvious" decisions
   - Use **Edge Case Discovery** — ask what happens when things fail
   - Apply **Trade-off Illumination** — surface costs of design choices
   - Use **Probing Implications** — trace second-order effects on existing features
3. Track discoveries as bullet points — these feed directly into the spec
4. When the user reaches clarity (consistent answers, no new insights), summarize findings

**Exit condition:** User explicitly says they're ready to draft, or answers have saturated.

**Transition:** Ask if ready to move to Phase 3 (Draft). Pass the summarized discoveries as context.

---

## Phase 3: Draft

**Goal:** Co-author the spec document through iterative refinement and reader testing.

**Skill:** `doc-coauthoring`

**Steps:**

1. **Context Gathering** (Stage 1 of doc-coauthoring):
   - The discoveries from Phase 2 serve as the initial context dump
   - Ask any remaining clarifying questions
   - Fill in the `spec.md` template sections based on gathered context

2. **Refinement & Structure** (Stage 2 of doc-coauthoring):
   - Work section by section through the spec
   - For each section: clarifying questions → brainstorm options → user curates → draft → iterate
   - Pay special attention to:
     - **Technical Design**: Data model, API, frontend changes
     - **Edge Cases**: Informed by Phase 2 discoveries
     - **Out of Scope**: Explicitly define boundaries
   - Clear all **Open Questions** before marking spec as APPROVED

3. **Reader Testing** (Stage 3 of doc-coauthoring):
   - Test the spec with a fresh context (sub-agent or manual)
   - Verify a reader can understand the feature without additional context
   - Fix any gaps found

4. Update `spec.md` status to `APPROVED`
5. Draft the `tasks.md` implementation checklist based on the approved spec
   - Group tasks by layer: Data → Backend → Frontend → Testing
   - Each task should be small enough to complete in one focused session
   - Number tasks hierarchically (1.1, 1.2, 2.1, etc.)

**Exit condition:** Spec status is APPROVED, tasks.md is populated, all Open Questions resolved.

---

## Phase 4: Implement

**Goal:** Execute the implementation plan task by task, using the spec as ground truth.

**Steps:**

1. Load `spec.md` and `tasks.md` into context
2. Work through tasks in order, for each task:
   - Announce which task you're starting (e.g. "Starting 2.1: Create recurring transaction API endpoint")
   - Implement the task
   - Mark as `[x]` in `tasks.md` when complete
   - If implementation reveals spec gaps or needed changes:
     - Flag it explicitly
     - Update `spec.md` if user approves the change
     - Add new tasks to `tasks.md` if needed
3. Update `tasks.md` status to `IN PROGRESS` when first task starts, `DONE` when all complete

**Important rules:**

- Never deviate from spec without flagging it
- If a task is too large, break it down into sub-tasks before starting
- Commit logical chunks (don't implement everything then commit once)

**Exit condition:** All tasks in `tasks.md` are `[x]`.

---

## Phase 5: Review & Archive

**Goal:** Code review against the spec, then archive the completed feature.

**Skill:** `code-reviewer`

**Steps:**

1. **Code Review** (using `code-reviewer` skill):
   - Compare implementation against `spec.md` — every requirement should be covered
   - Check for plan deviations (justified improvements vs problematic departures)
   - Assess code quality, error handling, type safety
   - Review architecture and separation of concerns
   - Categorize issues as Critical / Important / Suggestion
   - If Critical issues found → fix them (loop back to Phase 4 for specific tasks)

2. **Archive** (when review passes):
   - Update `spec.md` status to `ARCHIVED`
   - Move the entire feature folder:
     ```
     docs/specs/active/<feature-name>/
     → docs/specs/archive/YYYY-MM-DD-<feature-name>/
     ```
   - Announce completion

**Exit condition:** Code review passes with no Critical issues, feature folder archived.

---

## Phase Navigation Rules

- **Forward:** Each phase transition requires user confirmation
- **Backward:** You can go back anytime (e.g., Review finds issues → back to Implement)
- **Skip:** User can jump to any phase with `phase:<name>` — but warn if prerequisites are missing
- **Re-enter:** Can re-enter any phase (e.g., re-run Discover if requirements change mid-implementation)

## Context Loading

When entering any phase mid-workflow (via `phase:<name>` or resuming in a new conversation):

1. Always read `docs/specs/active/<feature-name>/spec.md` first
2. Then read `docs/specs/active/<feature-name>/tasks.md`
3. These two files ARE the source of truth — not chat history
