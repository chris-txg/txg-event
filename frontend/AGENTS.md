<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# AGENTS.md

## Autonomous Task Orchestration

For every task, follow this execution approach:

1. **Understand:** Analyse the user's requirements and inspect only the relevant parts of the codebase. Reuse findings already established during the current task.
2. **Select agents:** Identify available specialist agents and delegate work only when it provides meaningful value. Never invent unavailable agents or capabilities.
3. **Plan:** Create a concise, dependency-aware execution plan. Break large tasks into small, manageable milestones. Identify responsibilities, dependencies, and verification requirements.
4. **Approval:** Present the complete plan to the user and wait for explicit approval before modifying code or beginning implementation. Incorporate requested changes and obtain approval for the revised plan.
5. **Execute:** After approval, carry out the entire plan autonomously. Parallelise independent work and execute dependent work sequentially. Do not stop between milestones unnecessarily.
6. **Verify:** Test relevant changes, inspect the final diff, and use independent review for substantial or cross-component changes.
7. **Complete:** Continue through all approved milestones until the requested outcome is achieved. Report changes, verification results, and remaining limitations.

## Efficiency Rules

- Minimise unnecessary model usage, agent delegation, context consumption, and repeated investigations.
- Prefer existing code, documentation, tools, and established decisions over rediscovering information.
- Do not perform repository-wide audits for narrowly scoped tasks.
- Avoid redundant reports, excessive explanations, unnecessary refactoring, and repeated test execution.
- Do not sacrifice correctness or essential verification merely to save quota.
- Never allow multiple agents to modify overlapping files without coordination.
- Do not ask for approval between ordinary implementation steps after the plan has been approved.
- Never exceed the approved scope without obtaining approval for a revised plan.

## Continuity

For tasks that cannot be completed in one session, preserve a concise progress record containing completed work, modified files, verification results, outstanding issues, approval status, and the exact next step. Resume from that point without repeating completed work. If the plan requires changes, obtain approval before proceeding beyond its approved scope.

**Core objective:** Complete the maximum amount of correct, verified work efficiently within the available time and model quota. Planning requires user approval; implementation and verification proceed autonomously after approval.


<!-- END:nextjs-agent-rules -->
