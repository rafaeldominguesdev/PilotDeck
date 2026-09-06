---
description: Stamp the current PilotDeck card with an exact release tag.
argument-hint: <release-tag>
---

Load the bundled `pilotdeck` skill and read its linked canonical `PILOTDECK.md`.
Find this token's single executing card with `task_list`
using `status: "em_execucao"` and `claimed_by: "me"`. Treat `$ARGUMENTS` as the
exact release tag and call `task_update` with `resolved_in`. Refuse an empty tag
or an ambiguous set of active claims. This command does not validate or deploy
the card.
