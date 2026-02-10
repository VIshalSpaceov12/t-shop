# Design Review Command

Run a comprehensive design review on the current state of the shop application.

## Usage

Invoke this command after completing a phase to validate everything works before moving on.

## Instructions

1. Load the design review agent from `.claude/agents/design-review-agent.md`
2. Determine which phase was just completed based on the implementation plan in `docs/plans/2026-02-09-bewakoof-clone-implementation.md`
3. Run the appropriate phase-specific checklist from the agent
4. Execute ALL 7 review phases (Visual, Interaction, Responsiveness, Accessibility, Robustness, Console)
5. Report findings using the triage matrix (Blocker / High / Medium / Nitpick)
6. All Blockers and High issues MUST be fixed before the phase is marked complete

## Example

After completing the Foundation Phase (Tasks 1-6):

```
Run /design-review

Agent will:
1. Navigate to http://localhost:3000
2. Test navbar, footer, mobile nav
3. Test login/register forms
4. Test auth redirects
5. Check responsiveness at all breakpoints
6. Check accessibility
7. Check console for errors
8. Report all findings with screenshots
```

## Phase Gate Rule

**NO phase is considered complete until the design review passes with zero Blockers and zero High-priority issues.**
