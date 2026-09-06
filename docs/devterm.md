# PilotDeck + DevTerm

DevTerm e PilotDeck resolvem metades diferentes do mesmo problema.

| | DevTerm | PilotDeck |
|---|---|---|
| O que é | Orquestrador de terminais: abre o terminal de cada agente, entrega a tarefa, espera, coleta o relatório | Board: guarda o contrato, o histórico e a telemetria de cada card |
| Onde vive o estado | `.devterm/` (arquivos efêmeros de uma execução) | Postgres (persistente, auditável) |
| Contrato da tarefa | texto livre num heredoc | campos estruturados: *o quê / por quê / como confirmo* |
| Papéis | Piloto delega, agente executa, Piloto revisa | requestor / executor / reviewer gravados no card |
| Custo / tempo | não registra | tokens por modelo + duração por card |
| Roteamento | "o modelo mais barato que dá conta" (regra no `PILOT.md`) | cadeia declarativa por tipo de atividade (`harness_recommend`) |

Resumindo: **DevTerm move o trabalho, PilotDeck lembra do trabalho.**

## Roster de agentes

Os agentes do DevTerm (`haiku`, `sonnet`, `opus`, `grok`, `codex`, `cursor`,
`antigravity`) são bundles CLI + modelo. No PilotDeck cada executor é
`{ cli, model }`. Mapeamento sugerido para os executores da instância:

| Agente DevTerm | `cli` no PilotDeck | `model` (exemplo) |
|---|---|---|
| `haiku`  | `claude-code` | `haiku-4-5` |
| `sonnet` | `claude-code` | `sonnet-5` |
| `opus`   | `claude-code` | `opus-5` |
| `grok`   | `grok`        | `grok-*` |
| `codex`  | `codex`       | `gpt-5.6-*` |
| `cursor` | `cursor`      | (o que o Cursor expõe) |
| `antigravity` | `antigravity` | `gemini-*` |

Ative em Settings › Executores só os que o time realmente tem. A cadeia de
harness (`docs/harness-routing.md`) sempre pega o primeiro elo que existe entre
os executores ativos, então declarar menos executores degrada a política em vez
de quebrá-la.

## Modo 1 — Board primeiro (recomendado)

O Piloto trabalha a partir do board, não do `.devterm/outbox`.

1. Piloto cria um card no PilotDeck (`task_create` com `o_que` / `por_que` /
   `como_confirmo`) ou pega um card já aberto.
2. Piloto chama `harness_recommend { type }` e usa o `cli`/`model` retornado
   para escolher **qual agente do DevTerm** delegar.
3. Piloto delega no DevTerm com uma frase só:

   ```
   Executa o card PD-123 no board do PilotDeck.
   ```

4. O agente (com o plugin `pilotdeck` instalado) dá `task_claim`, recebe o
   briefing autocontido, faz o trabalho, dá push e `task_deliver` com a
   telemetria lida do próprio transcript.
5. O Piloto revisa com o `como_confirmo` do card e carimba `validado` — só o
   humano faz isso.

Nada de `delegate.sh` / `wait.sh` nesse modo: o `claim`/`deliver` do board é o
handshake, e o `stop-guard` do plugin impede o agente de encerrar com um card
seu em execução.

## Modo 2 — Ponte (mantém o hábito do `.devterm/`)

Se você quer continuar delegando com `bash .devterm/delegate.sh <agente>` e só
ganhar histórico + custo, rode uma ponte que espelha cada tarefa/relatório do
`.devterm/` num card do PilotDeck:

- ao aparecer um `.devterm/outbox/*.task` → `task_create` no board
- ao aparecer um `.devterm/reports/*.json` → `task_deliver` com o `summary` e
  os `checks` do relatório

Isso é um script de fora (um watcher em cima de `.devterm/`), não faz parte do
board. O board não sabe do DevTerm; ele só recebe chamadas MCP. Um exemplo de
watcher fica em aberto como card de RFC.

## O que o PilotDeck NÃO herda do DevTerm

- O `.devterm/` continua sendo a fila de execução do DevTerm. O board não a
  substitui nem a lê.
- O protocolo `report.sh` / `wait.sh` do DevTerm é local e continua válido. O
  board é a memória de longo prazo, não o barramento de mensagens.
