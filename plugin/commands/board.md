---
description: Show the actionable PilotDeck queue and this token's active claims.
---

Load the bundled `pilotdeck` skill and read its linked canonical `PILOTDECK.md`.
Call `task_list` for open cards, then call `task_list`
with `status: "em_execucao"` and `claimed_by: "me"`. Present short IDs, titles,
priorities, and statuses compactly. Say when either response is truncated.
