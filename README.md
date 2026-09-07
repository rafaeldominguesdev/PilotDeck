# PilotDeck

**Quadro de tarefas self-hosted onde os agentes de IA fazem o trabalho e o humano decide e valida.**

PilotDeck é um board para times híbridos humano + agente. O humano escreve o
contrato da tarefa e valida o resultado; o agente pega o card, executa na
própria máquina e devolve com evidência e telemetria real (tokens por modelo e
tempo). O board é só três coisas: uma interface, um banco de dados e um
servidor MCP.

> Seu board. Seu servidor. Seus dados. Nada sai da sua instância: sem
> analytics, sem tracking, sem verificação de e-mail, sem phone-home.

É um **companheiro do [DevTerm](https://github.com/rafaeldominguesdev)**: o
DevTerm orquestra os terminais dos agentes; o PilotDeck é a camada persistente
e auditável onde os contratos, o histórico e os custos ficam guardados. Veja
[`docs/devterm.md`](docs/devterm.md).

---

## Como funciona (a versão simples)

1. **Você cria um card.** Não é um ticket, é um contrato: *o quê* deve
   acontecer, *por quê*, e *como confirmar* (um roteiro de teste em linguagem
   comum).
2. **O agente pega o card.** "Pega a próxima tarefa do board." O agente dá
   `claim` no card via MCP, recebe um briefing autocontido (contrato + harness
   + contexto da missão + convenção de branch) e o card anda para *Em
   execução*.
3. **O agente entrega.** Um handoff com resumo, evidência, links de branch/PR
   e telemetria real: tokens por modelo e duração. O briefing diz ao agente
   exatamente como ler esses números do próprio transcript — medido, não
   chutado.
4. **Você valida.** Revisa com o roteiro que você escreveu no passo 1. Só um
   humano carimba *Validado*. Reabre com um comentário e o agente vê no
   próximo claim.

Cada card mostra o que custou: `34 min · 1.2M tokens · sonnet-5 → opus-5`.
Tokens e tempo, porque são fatos em qualquer plano. Dinheiro é uma camada
opcional, desligada por padrão.

---

## Quickstart

```bash
git clone https://github.com/rafaeldominguesdev/PilotDeck && cd PilotDeck
export AUTH_SECRET="$(openssl rand -base64 32)"
docker compose up --build
```

O `AUTH_SECRET` é obrigatório e tem que ser único por instalação — o compose
para com erro se ele faltar. Guarde o valor gerado no ambiente protegido do
seu deploy para que os restarts usem a mesma chave.

Abra `http://localhost:3000`, crie a conta admin local (e-mail + senha,
guardados no seu Postgres, usados só para login) e siga o onboarding de 3
passos: projeto, executores, conectar o agente. Passo a passo completo:
[`docs/getting-started.md`](docs/getting-started.md).

### Conectar um agente

```bash
claude mcp add --transport http pilotdeck http://<seu-host>/mcp \
  --header "Authorization: Bearer <seu-token>"
```

Depois, no terminal: *"pega a próxima tarefa do board."*

### Instalar o plugin (Claude Code, Codex, Grok, Kimi)

O servidor MCP acima já basta para dar claim e entregar cards. O plugin
adiciona o resto do fluxo — o `PILOTDECK.md` canônico, os comandos
`/pilotdeck:*` e os hooks de ciclo de vida:

```bash
claude plugin marketplace add rafaeldominguesdev/pilotdeck
claude plugin install pilotdeck@pilotdeck
```

Confirme que instalou de verdade em vez de confiar na mensagem de sucesso:
`claude plugin list` e `claude plugin details pilotdeck`.

---

## O que torna diferente

- **Cards são contratos.** *O quê / Por quê / Como confirmo*, escritos antes do
  trabalho, para que a revisão seja um roteiro e não um "achei bom". `Feito !=
  Validado`: merge é a opinião da máquina, validação é a sua.
- **Política de harness, não roleta de modelo.** Você declara quais CLIs/modelos
  o time tem e mapeia 20 tipos de atividade para executores. Cada linha é uma
  cadeia, não um nome só: primeira escolha, escalação, piso. O board pega o
  primeiro elo que consegue rodar de fato, então desligar um executor degrada a
  política em vez de anulá-la.
- **Três papéis por card.** Quem pediu, quem executou e para quem volta para
  revisão. Quem delega nem sempre é quem confere.
- **RFCs como cards.** Decisões grandes viram cards `rfc` cujo entregável é um
  documento; aprovar gera os cards de execução.
- **Tokens e tempo por card.** O agente reporta uso em todo handoff, separado
  por modelo. Estimativa é rotulada como estimativa; quem não reportou nada
  aparece como "não reportado", nunca como um zero confiante.
- **Dinheiro é opt-in.** Numa assinatura fixa um valor em dólar é ficção. Custo
  fica desligado por padrão.
- **Nativo de convenção Git.** `AGB-123` no branch, no commit e no título do
  PR. Sem necessidade de API do GitHub; funciona com qualquer forge, ou
  nenhum.

---

## Stack

Next.js · PostgreSQL · Drizzle ORM · MCP SDK oficial. Um `docker compose up`.

## Status

Cedo e mudando rápido. O loop principal (criar, dar claim, handoff, validar)
funciona de ponta a ponta. Onboarding, settings e insights ainda estão
amadurecendo. Herdado de um projeto na casa da v0.3.

## Relação com o OverClick

PilotDeck é um **fork do [OverClick](https://github.com/ustoppble/overclick)**
(MIT), adaptado para o ecossistema DevTerm. O que mudou em relação ao upstream:

| Mudança | Motivo |
|---|---|
| Removido o serviço `updater` do docker-compose | Montava o socket do Docker do host (root). Para atualizar: `git pull && docker compose up -d --build`. |
| Removido `deploy/` (compose de nuvem + Traefik + `deploy.sh`) | PilotDeck roda local ou numa máquina que você controla; não há tier hospedado. |
| Rebrand `overclick` / `agent-board` → `pilotdeck` | Projeto próprio. |
| `docs/devterm.md` | Como o board conversa com o DevTerm. |

O upstream continua sendo a fonte das ideias de design (card como contrato, os
3 papéis, telemetria de tokens/tempo, harness routing).

## Segurança

**Não exponha o PilotDeck direto na internet sem um proxy de auth seu na
frente.** Ele foi feito para rodar local ou em rede privada confiável. Se
colocar um reverse proxy na frente, ligue `PILOTDECK_TRUSTED_PROXY=1`.

## Licença

[MIT](LICENSE). Fork, self-host, faça a sua versão.
