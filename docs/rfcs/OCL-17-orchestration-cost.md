# RFC OCL-17 — custo do orquestrador por missão

- **Data:** 2026-08-19
- **Status:** proposta para aprovação do dono
- **Escopo:** PilotDeck (schema, MCP, Insights e briefing); integração automática do Overclock fica como etapa futura
- **Decisão pedida:** adotar a opção A, `mission_attempt`, e não representar orquestração como card
- **Relacionados:** OCL-11 (janela do claim e `usage_suspect`)

## Resumo da decisão

O orquestrador é trabalho da missão, não trabalho de um card. Cada execução de
orquestração terá um `mission_attempt` próprio, aberto quando a missão começa,
identificado por CLI/modelo/session e atualizado por snapshots cumulativos depois
de cada rodada de despacho. O snapshot final congela os mesmos segmentos, tempo,
preço e marcadores de honestidade que já existem em `execution_attempt`.

Um `mission_attempt` não aparece na fila, não recebe branch, não pede validação
humana e não conta como card. No Insights ele aparece explicitamente como uma
linha **orquestração** por missão, projeto e modelo. O total canônico passa a
ser:

```text
total da missão = execução confiável dos cards + orquestração confiável da missão
```

Uso ausente, estimado, não precificado ou suspeito continua visível e separado;
nenhum desses estados vira `$0` silencioso.

Este RFC não se considera aprovado pelo executor. O dono deve aprovar ou
comentar o card OCL-17 antes que os cards de implementação sejam criados.

## 1. Problema, objetivos e limites

Hoje `execution_attempt` pertence a `task`. Isso é correto para um agente que
executa um card: a janela começa no claim, termina no deliver e a tentativa tem
um resultado que pode ser revisado. O orquestrador trabalha antes, entre e depois
dos cards. Seus tokens entram no custo real da missão, mas não têm card, claim,
branch ou deliver próprios.

Sem uma unidade de dados para esse trabalho, há quatro erros possíveis:

1. o custo da missão fica menor do que o custo efetivo;
2. o custo de planejamento é duplicado em cada card despachado;
3. um card sintético polui a fila e parece trabalho validável;
4. um contador de uma sessão inteira é somado como se cada card tivesse usado
   aquela sessão inteira.

### Objetivos

- Medir tokens por modelo e duração do orquestrador na janela da missão.
- Aceitar atualizações incrementais sem somar duas vezes uma retransmissão.
- Reusar normalização de modelo, tabela de preços, snapshots de custo e notas de
  honestidade que o board já usa.
- Mostrar execução, orquestração e total combinado no Insights sem esconder a
  origem de cada número.
- Manter a regra de OCL-11: uma sessão reutilizada entre papéis não pode virar
  duas fontes de uso confiável sem uma marcação explícita.
- Ensinar ao orquestrador quando reportar e o que fazer quando a CLI não expõe
  contadores exatos.

### Fora do escopo desta primeira versão

- Reconstruir retroativamente tokens de missões antigas que nunca tiveram um
  attempt de orquestração.
- Inferir uma divisão de custo entre projetos quando uma missão atravessa vários
  projetos. Nesse caso o custo fica em uma linha `cross-project`.
- Guardar prompts, respostas ou conteúdo do transcript no board. O board guarda
  apenas a referência do transcript, como já faz para cards.
- Fazer o Overclock descobrir sozinho o modelo do pane sem uma integração
  explícita. Essa integração é o card futuro descrito na seção 8.

## 2. Modelo de dados recomendado — opção A

### 2.1 `mission_attempt`

Criar uma tabela `mission_attempt` no mesmo pacote de schema que contém
`execution_attempt`. A unidade é uma tentativa de orquestração, não uma nova
classe de task.

| Campo | Regra |
| --- | --- |
| `id` | UUID, chave primária. |
| `mission_id` | FK obrigatória para `mission`; a remoção de uma missão remove seus attempts. |
| `project_id` | FK opcional para `project`, capturado no início. Nulo significa `cross-project`; nunca duplicar o mesmo custo em vários projetos. |
| `executor` | Identidade da CLI/agente, no mesmo formato aceito por `execution_attempt`. |
| `model` / `model_source` | Modelo declarado e a origem da declaração, para o rótulo do attempt; os segmentos são a fonte para o custo por modelo. |
| `session_id` | Obrigatório no início. É a identidade estável usada na guarda de OCL-11. |
| `transcript` | Referência `{cli, session_id, path, resume}`, nunca o conteúdo. |
| `status` | `aberto`, `sucesso` ou `abandonado`; apenas `sucesso` finalizado entra nos totais confiáveis. |
| `started_at` / `last_activity_at` / `finished_at` | Início da missão, lease de atividade e encerramento. |
| `usage_segments` | Snapshot cumulativo, um segmento por modelo que realmente rodou. |
| `tokens_in` / `tokens_out` / `tokens_cache` | Totais planos derivados dos segmentos, para compatibilidade com leitores existentes. |
| `duration_ms` | Tempo ativo reportado pelo orquestrador. |
| `server_duration_ms` | Tempo medido pelo servidor entre abertura e fechamento do attempt. |
| `turns` / `usage_estimated` | Contagem de turnos e marca de estimativa, seguindo `execution_attempt`. |
| `reported_cost_usd` | Valor voluntário da CLI; só é fallback quando o board não consegue precificar. |
| `cost_usd`, `cost_source`, `cost_status`, `cost_unpriced_models`, `cost_breakdown` | Snapshot congelado pelo mesmo motor de preço usado em cards. |
| `usage_suspect` / `usage_suspect_reason` | Guarda para janela impossível, sessão reutilizada ou outra inconsistência; o attempt continua auditável, mas sai do total confiável. |
| `result` / `result_note` | Resultado final e explicação de abandono, quando houver. |
| `last_report_sequence` | Maior sequência cumulativa aceita; começa em zero. |

O status da missão continua sendo o status humano da missão. Ele não substitui o
status do attempt: uma missão pode estar `ativa` enquanto um attempt está aberto,
ou ser concluída depois de um attempt de sucesso.

### 2.2 `mission_attempt_report`

O attempt guarda o estado atual; uma tabela pequena de reports guarda o histórico
dos checkpoints. Isso permite auditar a rodada que produziu um número e torna a
operação idempotente sem confiar em retries do transporte.

Campos mínimos:

- `id`, `mission_attempt_id`, `sequence` e `captured_at`;
- `checkpoint`: `rodada` ou `final`;
- `usage_segments`, contadores planos derivados, `duration_ms`, `turns` e
  `estimated`;
- `result`/`result_note` somente no checkpoint final.

Há uma constraint única em `(mission_attempt_id, sequence)`. O report é um
**snapshot cumulativo**, não um delta: a sequência 3 já inclui tudo que foi
reportado nas sequências 1 e 2. Reenviar a mesma sequência com o mesmo payload é
no-op; reenviar a sequência com payload diferente é `INVALID_ARGUMENT`. Uma
sequência menor que a última aceita também é rejeitada. A transação insere o
report e atualiza o aggregate apenas quando a sequência é nova.

Assim, o caso normal é:

```text
mission_attempt (estado atual)
  1 ── snapshot após despacho dos cards da rodada 1
  2 ── snapshot após despacho da rodada 2
  3 ── snapshot final ao fechar a missão
```

O board não soma as três linhas. O Insights lê o estado final do attempt; os
reports servem para auditoria, retry e diagnóstico.

### 2.3 Invariantes

1. Só há um attempt aberto por missão. Uma nova execução depois de um abandono
   abre outro attempt, sem sobrescrever o anterior.
2. Todo attempt tem um `session_id` no início. O `session_id` não é exibido como
   segredo nem usado para guardar conteúdo de sessão; ele só liga as regras de
   telemetria.
3. `started_at` é o início da missão/orquestração, não o horário do primeiro
   report. O servidor mede `server_duration_ms` dessa janela.
4. Os contadores dos reports são cumulativos e nunca são somados entre reports.
5. O custo é calculado por segmento, normalizado pelo mesmo alias table e
   congelado no fechamento. Preço ausente continua sendo `unpriced`, não zero.
6. Attempt aberto ou abandonado fica fora de `totals`, mas aparece em contadores
   de execução incompleta/descartada.
7. Attempt de orquestração não tem `task_id`, não tem branch/PR, não aparece como
   card e não participa da taxa de reopen.
8. A resolução de `mission_id` e `project_id` respeita o workspace do token,
   como nas tools atuais.

## 3. Comparação com a opção B — card `type=orchestration`

| Dimensão | A — `mission_attempt` | B — card especial claimado pelo orquestrador |
| --- | --- | --- |
| Unidade correta | Attempt nasce da missão e pode ficar aberto durante várias rodadas. | O custo é forçado a caber no ciclo claim → deliver de um card. |
| Fila | Não cria trabalho falso nem altera a fila humana. | Adiciona um card que ninguém precisa executar nem validar. |
| Relação com cards | A missão liga o attempt a todos os cards sem atribuir o mesmo token a cada um. | O card especial precisa de uma convenção artificial para representar vários cards. |
| Sessão | `session_id` é nativo e pode ser comparado com attempts de cards. | O mesmo session id parece uma execução comum e ativa a guarda tarde demais. |
| Reports incrementais | Rodadas atualizam o mesmo attempt com sequência cumulativa. | Cada update teria semântica de progresso de card e poderia parecer uma nova entrega. |
| Insights | Linha explícita de orquestração, sem per-card falso. | Totais por card, reopens e contagem de attempts ficam inflados. |
| Validação | Só o resultado da missão é encerrado; não há deliver automático. | O orquestrador aparenta entregar um card e pode cair na fila de revisão. |
| Implementação | Exige migration, tools e agregação específicas. | Reusa mais código no início, mas espalha exceções por claim, deliver, UI e docs. |
| Projeto | Captura um projeto primário ou `cross-project` sem duplicar custo. | Um card só pode apontar para um projeto e esconde missões multi-projeto. |

### Prós da opção B

- Menor migration inicial se todos os campos coubessem em `execution_attempt`.
- Reutilização imediata de parte do cálculo existente de token e preço.
- Um agente que só conhece a fila poderia descobrir o card.

### Contras da opção B

- Confunde planejamento com execução e viola o contrato “card = trabalho
  validável”.
- Exige inventar título, `o_que`, `por_que`, `como_confirmo`, branch, resultado e
  reviewer para uma atividade que não tem esses conceitos.
- A janela começaria no claim do card especial, não necessariamente no início da
  missão.
- O custo fica ligado a um card que pode ser movido, reaberto, descartado ou
  contado por projeto, produzindo números errados.
- Um report cumulativo pareceria progresso/deliver, e um retry pode criar mais um
  attempt no lugar de atualizar o atual.
- Não resolve de forma limpa uma missão que despacha cards de vários projetos.

### Recomendação

Escolher A. O pequeno custo de uma tabela própria compra uma semântica correta e
uma superfície que pode crescer para outros papéis de missão. O motor de preço e
as funções de agregação de tokens devem ser compartilhados com
`execution_attempt`; o armazenamento e o ciclo de vida não devem ser
compartilhados por meio de um card sintético.

Uma eventual refatoração futura pode extrair um tipo interno comum, como
`billable_attempt`, para os dois schemas. Isso não é pré-requisito de OCL-17 e
não deve atrasar a primeira entrega.

## 4. Ciclo de vida e contrato MCP

### 4.1 Início

Adicionar `mission_attempt_start`:

```json
{
  "mission_id": "<id da missão>",
  "project_id": "<id opcional; ausente = cross-project>",
  "executor": {"cli": "codex", "model": "gpt-5.6-sol", "session_id": "<id>"},
  "transcript": {"cli": "codex", "session_id": "<id>", "path": "<referência local>"}
}
```

A tool valida que a missão está `ativa`, que o projeto pertence ao mesmo
workspace e que não existe outro attempt aberto para a missão. Retorna o
`mission_attempt_id`, a sequência zero e `started_at`. O início é o único ponto
em que `session_id` é registrado; reports seguintes referenciam o attempt.

Se o orquestrador morrer antes de reportar, o lease expira como abandonado, com
`server_duration_ms` preservado. Um worker posterior pode abrir outro attempt,
mas não pode sobrescrever o anterior.

### 4.2 Depois de cada rodada de despacho

Adicionar `mission_report_usage`:

```json
{
  "mission_id": "<id da missão>",
  "attempt_id": "<id retornado no start>",
  "sequence": 2,
  "checkpoint": "rodada",
  "usage": {
    "segments": [
      {"model": "gpt-5.6-sol", "input": 70000, "output": 8000, "cache_read": 15000}
    ],
    "duration_ms": 370000,
    "turns": 5,
    "estimated": false
  }
}
```

`mission_id` é obrigatório para manter o contrato legível; `attempt_id` pode ser
omitido apenas quando houver exatamente um attempt aberto para aquela missão.
Os segmentos e `duration_ms` são cumulativos desde o início. O report renova
`last_activity_at` e pode ser repetido com segurança.

### 4.3 Fechamento

O mesmo `mission_report_usage` aceita `checkpoint: "final"` e `result:
"success"`. O report final é obrigatório para que o attempt entre nos totais
confiáveis. Ele pode repetir o último snapshot se não houve trabalho entre a
última rodada e o fechamento.

Uma falha explícita usa `checkpoint: "final"`, `result: "abandoned"` e uma
`result_note`. Fechar uma missão sem um snapshot final não deve fabricar tokens:
o attempt fica `abandonado`, e o Insights mostra `usage not reported` ou a razão
de suspeita.

`mission_update {status: "concluida"}` não deve fechar silenciosamente um attempt
aberto. Se houver attempt aberto, a operação informa que o orquestrador precisa
enviar o checkpoint final (ou um operador deve abandoná-lo explicitamente).

### 4.4 Janela e relação com OCL-11

O orquestrador mede a própria sessão na janela `mission_attempt.started_at` →
fechamento. A receita de uso é por CLI, a mesma que o briefing usa para os
executores de cards. A instrução é reportar o acumulado da sessão **desde o
início da missão**, não o acumulado histórico da CLI.

O board compara `(session_id, started_at, finished_at)` de attempts de missão com
`execution_attempt` de cards:

- se não há sobreposição nem reutilização, ambos podem ser confiáveis;
- se a mesma sessão reporta orquestração e depois entrega um card sem uma
  declaração explícita, o deliver continua auditável, mas o uso envolvido recebe
  `usage_suspect: true` e razão `session_reused_orchestration`;
- uma flag explícita de compartilhamento permite o fluxo operacional não quebrar,
  mas não transforma contadores sobrepostos em custo confiável. Para entrar no
  total, o executor teria de enviar escopos não sobrepostos que o board consiga
  verificar; o MVP não presume essa divisão.

Essa guarda segue OCL-11: o sistema não pune o agente com uma falha silenciosa,
mas também não apresenta uma sessão inteira duas vezes como se fossem dois
trabalhos independentes.

### 4.5 Permissões e erros

As novas tools usam o mesmo escopo de workspace e o mesmo tipo de token das
tools de missão. Os erros devem ser tipados e acionáveis:

- `MISSION_NOT_ACTIVE`: iniciar em missão pausada/concluída;
- `MISSION_ATTEMPT_ALREADY_OPEN`: já existe um orquestrador ativo;
- `MISSION_ATTEMPT_NOT_FOUND`: attempt inexistente ou de outro workspace;
- `INVALID_SEQUENCE`: sequência repetida com payload diferente ou regressiva;
- `SESSION_REUSED`: sobreposição detectada, quando a chamada exigir rejeição;
- `INVALID_ARGUMENT`: projeto, checkpoint ou snapshot incompatível.

## 5. O que o Insights deve mostrar

### 5.1 Agregação

O loader passa a ler duas fontes: `execution_attempt` ligado a cards e
`mission_attempt` ligado a missões. O cálculo de preço, normalização de modelos,
`estimated`, `missing`, `zero_usage`, `unpriced` e `suspect` permanece um só.

O resultado interno ganha três visões explícitas:

```text
execution_totals       = somente attempts de cards bem-sucedidos
orchestration_totals   = somente mission_attempts finais bem-sucedidos
totals                 = execution_totals + orchestration_totals
```

`totals` passa a ser o total de trabalho confiável do board; os dois subtotais
ficam disponíveis para auditoria e para o detalhe da tela. Attempts abertos,
abandonados, suspeitos e sem preço mantêm os contadores separados, exatamente
como hoje.

Para cada dimensão (`mission`, `project`, `model`) o resultado precisa carregar:

- uma linha `execution`;
- uma linha `orchestration`;
- uma linha `total` que soma as duas sem duplicar o attempt.

No contrato MCP, isso deve ser aditivo: preservar os campos de execução que
clientes atuais consomem e acrescentar `execution_totals`,
`orchestration_totals`, `orchestration_groups` e `combined_groups` (ou uma
estrutura equivalente claramente tipada). A tela pode usar a estrutura
combinada; um cliente antigo continua conseguindo ler o subtotal de execução.

`group_by=model` usa os segmentos reais do `mission_attempt`. Se um
orquestrador mudou de modelo, tokens e custo vão para cada modelo; a duração
continua com a mesma regra de `shared_attempts` usada para cards, porque o board
não inventa como dividir o relógio entre modelos.

### 5.2 Linhas e rótulos na UI

Na tabela por missão, projeto e modelo, cada grupo mostra uma linha filha
`orchestration`. A linha deve ser visualmente distinta de um card, mas usar as
mesmas unidades:

```text
Zero → PilotDeck
  execução       8 attempts · 1.2M tokens · 31m
  orquestração   1 attempt  · 93k tokens  · 6m
  total          9 attempts · 1.293M tokens · 37m
```

O rótulo deixa claro quando o projeto é `cross-project`. O custo em dólares só
aparece quando o pricing layer está ligado; `no price`, `not reported`,
`estimated` e `suspect` continuam próximos do número que qualificam.

A visão por card não recebe uma linha de orquestração falsa. Em seu lugar, o
detalhe do card pode mostrar “missão: X; custo de orquestração da missão: Y”
como referência, sem atribuir Y ao card.

### 5.3 Totais, período e descarte

- O filtro temporal usa `finished_at` tanto para cards quanto para
  `mission_attempts`; attempts abertos ficam fora do total filtrado.
- A taxa de reopen continua sendo de entregas de cards. Orquestração não é
  validada por card e não entra nessa métrica.
- Um attempt de orquestração abandonado aparece em `discarded.orchestration`,
  com tokens/custo suspeitos preservados, mas não reduz nem aumenta o total
  confiável.
- Cards de exemplo continuam fora. Não deve existir “mission attempt de exemplo”
  para popular a tela.

## 6. O que a skill e o briefing ensinam

O briefing da missão e `skills/pilotdeck/SKILL.md` devem ganhar uma seção curta,
com a mesma disciplina do contrato de usage de cards:

1. **Ao iniciar a missão:** abrir `mission_attempt_start` com CLI, modelo,
   `session_id` e referência do transcript.
2. **Ao terminar cada rodada de despacho:** chamar `mission_report_usage` com o
   snapshot cumulativo desde o início, mesmo que nenhum card tenha sido criado
   naquela rodada.
3. **Ao fechar a missão:** enviar um report `final` com resultado, duração e os
   segmentos finais. Esse passo é obrigatório para o custo entrar no total.
4. **Se a CLI não informar tokens:** enviar `estimated: true` quando houver uma
   estimativa honesta; se não houver nem estimativa, fechar com usage ausente e
   deixar o board mostrar `usage not reported`. Nunca enviar zero para significar
   “não sei”.
5. **Se a sessão também executar um card:** declarar o compartilhamento. O
   board manterá a suspeita em vez de somar a mesma sessão duas vezes.
6. **Nunca colocar tokens de planejamento no deliver de cada card:** o card
   reporta apenas a execução daquele card; a missão reporta o planejamento e o
   despacho.

O texto deve apontar para a receita da CLI já existente, não copiar uma segunda
implementação de leitura de transcript. O briefing deve repetir somente quando
reportar, qual é a janela e como o board rotula ausência/estimativa.

## 7. Exemplo concreto — “Zero → PilotDeck”, 2026-08-18

Este é o caso de teste narrativo desta decisão: a rodada em que Zero levou
trabalho para o PilotDeck em 2026-08-18, com cards como ZERO-1 (cliente MCP),
ZERO-3 (mapeamento do briefing), ZERO-7 (entrega/deploy) e ZERO-8 (docs e smoke).
Os números abaixo são ilustrativos para fixar o contrato; não são uma tentativa
de reconstituir usage que a execução original não registrou.

### Sem `mission_attempt` — situação atual

O orquestrador consulta o fórum, deduplica, decide o que despachar e acompanha
os retornos. Cada card pode entregar seu próprio usage, mas o custo de ler,
planejar e decidir não pertence a nenhum deles. O Insights soma apenas os
attempts de ZERO-1, ZERO-3, ZERO-7 e ZERO-8 e subestima a missão.

### Com a opção A

1. Ao abrir a missão `Zero → PilotDeck`, o orquestrador chama
   `mission_attempt_start` com um `project_id` primário e sua sessão. O servidor
   grava `started_at` e retorna `attempt_id=MA-1`.
2. Depois da primeira rodada, reporta a sequência 1: 50.000 tokens de input,
   5.000 de output, 10.000 de cache, 210 segundos ativos.
3. Depois da rodada que despacha ZERO-7 e ZERO-8, reporta a sequência 2 como
   snapshot cumulativo: 70.000 input, 8.000 output, 15.000 cache, 370 segundos,
   cinco turnos.
4. Ao fechar a missão, envia a sequência 3 com `checkpoint=final`. O board
   congela o custo desses 93.000 tokens nos modelos efetivamente usados e mede
   também a janela do servidor, por exemplo 1.140 segundos.
5. Os quatro cards continuam com seus próprios attempts e seus próprios custos.
   No Insights, a missão mostra:

   ```text
   execução       = soma dos quatro cards confiáveis
   orquestração   = MA-1 (93.000 tokens, 370s ativos)
   total          = execução + MA-1
   ```

6. Se o mesmo `session_id` for enviado no deliver de ZERO-7 com o contador
   acumulado da missão, a guarda de OCL-11 marca a sobreposição como suspeita.
   O número continua disponível para auditoria, mas não aparece duas vezes no
   total confiável.

O exemplo também explica por que um card `OCL-ORCH` seria enganoso: ele teria
de fingir um contrato, uma branch e uma validação, embora o custo real atravesse
quatro entregas e comece antes do primeiro claim.

## 8. Integração futura com o Overclock

O primeiro release pode ser operado manualmente por uma CLI. Em uma etapa
posterior, o pane que exerce o papel de orquestrador deve receber o contexto da
missão ao ser criado e registrar automaticamente:

- `mission_id`;
- `session_id`, CLI e modelo efetivos;
- `attempt_id` retornado pelo start;
- referência do transcript, sem conteúdo.

O ciclo do pane chama report ao final de cada rodada de despacho e chama o
checkpoint final no fechamento. Um pane executor de card não recebe o papel de
orquestrador por inferência: a integração envia o papel explicitamente. Isso
permite ao PilotDeck aplicar a guarda de sessão antes de aceitar um deliver
ambíguo.

Essa etapa pode começar com um único projeto primário. Se a missão despachar
cards de vários projetos, a integração envia `project_id` nulo e a tela mostra
`cross-project`; nenhuma alocação arbitrária é feita pelo servidor.

## 9. Cards de implementação propostos

Os cards abaixo são contratos prontos para serem criados depois da aprovação do
dono. A ordem é deliberada: cada etapa deixa uma superfície verificável para a
seguinte. O harness segue a política vigente do workspace em 2026-08-19.

### 1. Schema e migração de `mission_attempt`

- **Tipo:** feature
- **Harness:** `codex` · `gpt-5.6-sol` · `high` (cadeia `gpt-5.6-sol → gpt-5.6-terra`)
- **O que:** criar `mission_attempt` e `mission_attempt_report`, enums, FKs,
  índices, constraint de um attempt aberto por missão e a migration; extrair ou
  reutilizar os helpers de segmentos, normalização e snapshot de custo.
- **Por que:** persistir a telemetria por missão sem criar um card falso e sem
  divergir da matemática de `execution_attempt`.
- **Como confirmo:** migration sobe em banco limpo e existente; reports com
  sequência nova atualizam o aggregate; retransmissão idêntica é no-op;
  retransmissão conflitante falha; o schema preserva `estimated`, `unpriced` e
  `suspect` sem transformar ausência em zero.

### 2. Tools MCP e ciclo de vida da missão

- **Tipo:** feature
- **Harness:** `codex` · `gpt-5.6-sol` · `high` (cadeia `gpt-5.6-sol → gpt-5.6-terra`)
- **O que:** implementar `mission_attempt_start` e `mission_report_usage`,
  fechamento final, lease/abandono, resolução por workspace e a guarda de
  `session_id` compartilhado com attempts de cards.
- **Por que:** dar ao orquestrador uma superfície explícita para abrir, atualizar
  e fechar seu próprio custo, com retries seguros.
- **Como confirmo:** iniciar uma missão retorna `attempt_id`; iniciar duas vezes
  falha; reports cumulativos não somam duas vezes; `final` fecha e entra nos
  totais; missão pausada/concluída, sequência inválida e workspace diferente
  retornam erros tipados; sessão compartilhada fica marcada conforme OCL-11.

### 3. Agregação e UI do Insights

- **Tipo:** feature
- **Harness:** `codex` · `gpt-5.6-sol` · `high` (cadeia `gpt-5.6-sol → gpt-5.6-terra`)
- **O que:** carregar attempts de missão, produzir subtotais de execução e
  orquestração, total combinado e grupos por missão/projeto/modelo; estender
  `insights_query` e a tela com linhas `execution`, `orchestration` e `total`.
- **Por que:** tornar visível o custo que antes ficava fora do board sem perder
  a origem, o período ou os marcadores de honestidade.
- **Como confirmo:** um fixture com um card e um mission attempt mostra a soma
  somente no total combinado; `group_by=mission|project|model` mostra as três
  linhas; um attempt aberto/suspeito/sem preço fica fora do total e aparece no
  contador correto; reopens continuam contando apenas cards; UI e
  `insights_query` devolvem os mesmos números.

### 4. Skill, briefing e documentação MCP

- **Tipo:** docs
- **Harness:** `codex` · `gpt-5.6-sol` · `medium` (cadeia `gpt-5.6-sol → gpt-5.6-terra`)
- **O que:** atualizar `skills/pilotdeck/SKILL.md`, o briefing de missão e
  `docs/mcp.md` com início, report cumulativo por rodada, fechamento, janela,
  estimativa, sessão compartilhada e exemplos.
- **Por que:** sem instrução no ponto de uso, a nova tool será chamada tarde ou
  com deltas, reintroduzindo exatamente a dupla contagem que o RFC remove.
- **Como confirmo:** um agente consegue seguir o briefing para abrir, reportar e
  fechar uma missão sem consultar código; o texto diz explicitamente para não
  enviar zero quando usage é desconhecido; os exemplos usam segmentos e
  explicam `estimated`, `unpriced` e `suspect`.

### 5. Registro automático do pane orquestrador no Overclock

- **Tipo:** feature
- **Harness:** `codex` · `gpt-5.6-sol` · `high` (cadeia `gpt-5.6-sol → gpt-5.6-terra`)
- **O que:** ao criar um pane com papel `orchestrator`, registrar a missão,
  sessão, CLI/modelo e transcript; enviar reports por rodada e o report final;
  propagar a flag de sessão compartilhada quando aplicável.
- **Por que:** eliminar o registro manual sem fazer o PilotDeck adivinhar qual
  pane é responsável pelo custo de planejamento.
- **Como confirmo:** abrir um pane orquestrador cria exatamente um attempt na
  missão; cada rodada atualiza uma sequência cumulativa; encerrar com sucesso
  cria o snapshot final; um pane executor de card não cria attempt de missão;
  o mesmo session id aciona a guarda de OCL-11.

### Ordem de execução

```text
1 schema/migration
       ↓
2 MCP lifecycle + guard
       ↓
3 Insights/API/UI
       ↓
4 skill/briefing/docs
       ↓
5 Overclock auto-registration
```

Os quatro primeiros cards pertencem ao fechamento do contrato no PilotDeck. O
quinto depende da superfície estável e pode ser criado no projeto do Overclock
quando o dono aprovar a integração entre produtos.

## 10. Rollout e aprovação

1. Aprovar este RFC no card OCL-17 ou comentar as decisões que precisam mudar.
2. Criar os cards 1–4 nesta missão com os contratos acima; não criar o card
   sintético de orquestração.
3. Implementar migration e tools atrás de testes de sequência, janela e sessão.
4. Adicionar uma fixture de “Zero → PilotDeck” com números conhecidos e conferir
   que `execution + orchestration = total` sem duplicação.
5. Liberar a UI e a documentação juntas; antes disso, reports desconhecidos
   devem aparecer como `unreported`, nunca como custo zero.
6. Depois da aprovação humana e da entrega dos cards, o dono valida. `feito` não
   é `validado`.

### Critério de aprovação do RFC

O dono aprova quando concordar com todos estes pontos:

- a unidade canônica é `mission_attempt`, não card;
- reports são snapshots cumulativos, versionados e idempotentes;
- sessão compartilhada nunca entra duas vezes como uso confiável;
- Insights separa execução, orquestração e total;
- preço, estimativa, ausência e suspeita mantêm a mesma semântica dos cards;
- os cards de implementação têm contratos e ordem suficientes para serem
  validados sem nova decisão de produto.
