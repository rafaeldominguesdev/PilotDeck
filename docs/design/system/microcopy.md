# Microcopy — the default words for the default states

> OCL-81. The product voice, applied to the three states every screen has:
> empty, error, loading. Voice contract (from `apps/web/src/lib/i18n.ts`):
> **direct, no enthusiasm, no em-dash.** Strings ship in English (default) and
> pt-BR; both are normative. A screen that needs a new sentence follows the
> patterns here instead of improvising.

## The voice in five rules

1. State the fact, then the way out. Never only one of the two.
2. No exclamation marks, no "great", no "oops", no apology theater.
3. No em-dash anywhere. Use a period, a colon or a comma.
4. Verbs in the imperative for actions ("Create a card"), plain present for
   facts ("No agent working").
5. Numbers are formatted by the doctrine §4 helpers, never typed into copy.

## Empty

Pattern: **what this region is for + how it fills.** The board columns already
speak this way and are the reference:

| Context | en | pt-BR |
|---|---|---|
| Column: open | "Nothing queued. Create a card or tell your agent: register this as a task." | "Nada na fila. Crie um card ou diga ao seu agente: registre isso como tarefa." |
| Column: in progress | "No agent working right now." | "Nenhum agente trabalhando agora." |
| Column: done | "This is where the agent's work lands, with evidence and cost." | "É aqui que o trabalho do agente chega, com evidência e custo." |
| Column: validated | "What passed your review. Only you stamp this column." | "O que passou pela sua revisão. Só você carimba esta coluna." |
| Column: discarded | "Abandoned work stays traceable here without blocking the queue." | "O trabalho abandonado fica rastreável aqui sem travar a fila." |
| Filtered board, no match | "No cards match these filters. Clear them to see the board." | "Nenhum card com esses filtros. Limpe para ver o board." |
| Search, no result | "Nothing found for this search." | "Nada encontrado para essa busca." |
| Empty list in a popover | "Nothing here yet." | "Nada aqui ainda." |
| Table without rows | "No data for this period." | "Sem dados neste período." |
| Missing contract field | "This card was written without confirmation steps." | "Este card foi escrito sem passos de confirmação." |

Rules: sentence case, final period on full sentences, no ellipsis as decoration.
The empty state never says "empty".

## Error

Pattern: **what failed + what the person can do.** Blame the system, not the
user, and only as much as is known.

| Context | en | pt-BR |
|---|---|---|
| Load failure | "This failed to load. Try again." | "Não carregou. Tente de novo." |
| Save failure | "Not saved. Your text is still here; try again." | "Não salvou. Seu texto continua aqui; tente de novo." |
| Permission | "This token cannot do that. Ask for a token with the manage flag." | "Este token não pode fazer isso. Peça um token com a flag manage." |
| Not found | "This card does not exist anymore. It may have been discarded." | "Este card não existe mais. Pode ter sido descartado." |
| Offline / unreachable | "The board server is unreachable. Check your connection." | "O servidor do board está inalcançável. Verifique sua conexão." |
| Form validation | field-level, states the rule: "Check at least one CLI. Without an executor the board goes nowhere." | "Marque pelo menos uma CLI. Sem executor o board não anda." |
| Unknown failure | "Something failed. The error is in the console; try again." | "Algo falhou. O erro está no console; tente de novo." |

Rules: an error names the failed verb ("load", "save"), never just "error".
Destructive confirmations state the consequence in one sentence before the
button: "Deleting this project destroys every card in it. There is no undo."

## Loading

Pattern: **the verb in progress, nothing else.**

| Context | en | pt-BR |
|---|---|---|
| Region loading (with skeleton) | no text | sem texto |
| Inline, blocking action | "Saving…" / "Creating…" / "Moving…" | "Salvando…" / "Criando…" / "Movendo…" |
| First paint of a page | "Loading the board…" | "Carregando o board…" |
| Long sync | "Syncing with the server…" | "Sincronizando com o servidor…" |

Rules: the ellipsis is the only ornament. A loading state never pairs with a
spinner glyph (components §10) and never lies about progress.

## Toasts

Pattern: **past-tense fact + optional undo/details action.**

| Context | en | pt-BR |
|---|---|---|
| Created | "Card OCL-82 created." | "Card OCL-82 criado." |
| Moved | "3 cards moved to the mission." | "3 cards movidos para a missão." |
| Copied | "Copied." | "Copiado." |
| Error toast | "Could not move the cards. Nothing changed." | "Não foi possível mover os cards. Nada mudou." |
