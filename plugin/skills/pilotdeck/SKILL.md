---
name: pilotdeck
description: Execute work through an PilotDeck MCP board. The board's MCP server is `pilotdeck` (tools mcp__pilotdeck__*); `overclock` is the IDE — one letter apart, different systems. Never guess the prefix. Use whenever an PilotDeck server is connected and the user mentions cards, tasks, missions, a card ID, or asks to register, claim, execute, deliver, release, or validate board work.
---

# PilotDeck

Read [PILOTDECK.md](../../PILOTDECK.md) completely before taking any board or
repository action. That file is the package's canonical workflow; do not copy
or replace its rules here.

## Mission telemetry checklist

When this skill is used by a mission orchestrator, the mission's planning cost
is a separate `mission_attempt`. Open it with `mission_attempt_start` when the
mission begins, report a cumulative `mission_report_usage` snapshot after every
dispatch round, and close with a final snapshot (`checkpoint: "final"`) before
the mission ends. Every snapshot carries per-model `segments`, active
`duration_ms`, `turns`, and `estimated`; never send zero as a placeholder for
unknown usage—estimate honestly with `estimated: true`, or leave it unreported.
Card execution and mission orchestration remain separate, and a shared session
must be declared so overlapping usage is marked `suspect` rather than counted
twice. The canonical document has the request shapes and the retry/window
rules; a card-only worker does not open a mission attempt.
