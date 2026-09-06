# Briefing visual do board — 2026-08-19 (OCL-80, fase A)

Mapa do todo antes da rodada de consistência. **Nada foi corrigido e nenhum card foi criado.**
Este documento é insumo: o dono consolida com o relatório do OCL-79 e só depois abre a fase B.

---

## 1. Escopo e método

- **Alvo:** board de produção (`cloud.overclock.sh`), sessão do dono já autenticada no Chrome,
  via as tools de browser do Claude in Chrome.
- **Larguras:** 1440 e 900 (contrato original) + 700 e 360 (adição de contrato do dono,
  seção própria em §5). Larguras intermediárias 1370/1100/1024/500 entraram por acidente de
  redimensionamento da janela e ficaram no acervo porque revelaram folds reais.
- **Telas percorridas:** board (banner de release, board limpo, scroll longo), 3 temas,
  dropdown de projetos, dropdown de missões, painel de Filtros, menu de conta `⋯`,
  modal de card (topo, checklist, rail, rodapé), formulário "Criar missão",
  Insights (KPIs, chart, tabelas), Configurações nas 9 abas
  (Executores, Projetos, Política de harness, Custo, Receitas de uso, Tokens MCP,
  Timeout de claim, Idioma, Atualizações).
- **52 screenshots** nesta pasta, numerados por ordem de captura; os de mobile terminam
  em `-mobile`.
- Além do olho, o inventário de §2 foi levantado por leitura do DOM/CSSOM ao vivo
  (assinaturas computadas de cada controle, contagem de `<select>`, `<optgroup>`,
  breakpoints e literais hex). Onde o número aparece, ele foi medido, não estimado.

### Como ler as severidades

| Nível | Significa |
|---|---|
| **P1** | Quebra visível, perda de informação ou controle inalcançável |
| **P2** | Inconsistência estrutural entre telas — o mesmo conceito com duas caras |
| **P3** | Polimento: microcopy, ritmo, detalhe |

### Ressalvas honestas sobre esta sessão

- **Cliquei uma vez no botão "Atualizar" do banner de release** (`01`), por engano de
  coordenada depois de um redimensionamento de janela. Ele não atualizou nada: apenas
  revelou duas linhas de instrução manual (`git pull && docker compose up -d --build`) e a
  mensagem de que não há sidecar de atualização rodando. Nenhum container foi reiniciado.
  Isso, aliás, virou o achado **#44**.
- Houve um **502 transitório da Cloudflare** no meio da sessão; o board voltou sozinho em
  menos de um minuto. Não consegui ligá-lo a nenhuma ação minha e não o trato como achado.
- **O que eu achei que era achado e não é** (verificado e descartado, para ninguém gastar
  card com isso): (a) o tema *persiste* — fica no cookie `oc-theme`, não em `localStorage`;
  (b) a coluna principal do modal *não* trava a rolagem, ela realmente termina ali;
  (c) o halo alaranjado que aparece em alguns prints é a borda do grupo de abas do Chrome
  em automação, não o app; (d) o badge de tipo no card **não** é colorido no desktop —
  é chip neutro contornado (no mobile é outra história, ver M4).
- Um formulário de **criação de card** não foi capturado porque **não existe na UI web**
  (ver achado #40). O formulário de criação equivalente é o "Criar missão" (`35`).

---

## 2. Inventário de padrões — quantas variações existem hoje

### 2.1 Gatilhos / controles de barra — **4 assinaturas só no board**

Medido em `/home` a 1440 (assinatura = altura + raio + borda + fundo + fonte + peso):

| # | Assinatura | Onde | Print |
|---|---|---|---|
| 1 | 32px · raio 8 · borda 1px `rgba(255,255,255,.08)` · Inter 13/500 | `.pf-trigger`, `.am-trigger`, `.ff-trigger` — **6 instâncias** | `02` |
| 2 | **16px · borda 0px** · Inter 13/500 | `.mf-trigger` (chip de missão) — bare text | `02` |
| 3 | 19px · **borda só à esquerda** (`0 0 0 1px`) · Inter 16/400 | `.board-total` ("19 cards") — é um `<button>` | `02`, `09` |
| 4 | Arial 13.33px · borda `#858585` · fundo `#3b3b3b` | `.ml-status` — controle **nativo do browser**, sem estilo | DOM |

A anatomia do Controle da doutrina (§3) **existe e funciona** — mas cobre 6 gatilhos de 9.
Os outros três são um bare-text, uma divisória clicável e um controle nativo cru.

### 2.2 Selects — **6 padrões visuais distintos para "escolher uma coisa"**

| # | Padrão | Onde | Print |
|---|---|---|---|
| 1 | Chip 32px com chevron | projeto, no board | `02`, `09` |
| 2 | Bare text com chevron colado | missão, no board | `02`, `09` |
| 3 | Popover **lista de checkbox** multi-select, com contagem e tag `ctx` | dropdown de projetos | `11` |
| 4 | Popover **lista simples** single-select, linha ativa preenchida, ação `+ Nova missão` | dropdown de missões | `12` |
| 5 | Caixa com borda, sem chevron, texto truncado | "MISSÃO" no rail do modal | `16` |
| 6 | `<select>` nativo estilizado (Inter 11/400, raio 8) — **103 instâncias**, **0 com `<optgroup>`** | Configurações inteira | `26`, `27` |
| 7 | Linha full-width empilhada | painel de Filtros colapsado ≤940 | `37`, `42`, `48` |

Os padrões **1 e 2 ficam lado a lado**, a 8px um do outro, e não parecem o mesmo componente.
Os padrões **3 e 4** são abertos por gatilhos vizinhos e usam **afordâncias de seleção
opostas** (caixa marcada vs linha preenchida).

### 2.3 Badges / chips — **6 anatomias**

| # | Anatomia | Exemplo | Print |
|---|---|---|---|
| 1 | Contorno 1px, raio 8, **9.5px** uppercase, letter-spacing .57 | `FEATURE` / `BUG` / `RFC` no card — 19 instâncias, assinatura única | `04` |
| 2 | Contorno + ícone | `⊙ FEITO · REVISÃO` no modal | `14` |
| 3 | Contorno uppercase largo | `MODELO INFERIDO DO HARNESS`, `GERÊNCIA`, `RESOLVIDO EM 5DA75ACDA3AB` | `16`, `30`, `44` |
| 4 | Rótulo de timeline | `TROCA DE EXECUTOR`, `RELATO` | `13` |
| 5 | Chip de modelo em **dois estados sem legenda** (preenchido vs contornado) | `fable-5 ×` vs `grok-4.5 ×` | `24`, `40` |
| 6 | Chip **tracejado** de ação | `+ model`, card "Customize" | `24`, `22` |
| 7 | **Letra colorida** (F verde / B vermelha) | só no mobile ≤768 | `41`, `46` |

### 2.4 Tabelas — **4 tratamentos**

| # | Tratamento | Onde | Print |
|---|---|---|---|
| 1 | Cabeçalho mono uppercase, linhas de 3 níveis (`EXECUÇÃO`/`ORQUESTRAÇÃO`/`TOTAL`), sigilos `⌀ ! + =` | Insights › Por projeto / Por missão | `21` |
| 2 | Lista com barra de proporção + valor + % | Insights › Participação por modelo | `19` |
| 3 | Grade de 4 `<select>` por linha, sem separadores | Configurações › Política de harness | `27` |
| 4 | Grade de inputs numéricos soltos, sem borda de linha | Configurações › Custo | `28` |

### 2.5 Checkbox / radio — **4 layouts, todos nativos**

`appearance: auto` e `accent-color: auto` em Configurações **e** no painel de Filtros: são
controles crus do browser, o que explica o azul (o único azul do produto) e o fato de
ignorarem qualquer token `--oc-*`.

| # | Layout | Onde | Print |
|---|---|---|---|
| 1 | Inline à esquerda, rótulo + descrição | checklist do modal; Configurações › Atualizações | `17`, `33` |
| 2 | **Empilhado e centralizado acima do rótulo** | painel de Filtros | `10` |
| 3 | Canto superior direito do card | Configurações › Executores | `22` |
| 4 | Inline azul-do-browser | Configurações › Custo | `28` |

### 2.6 Botões — **6 assinaturas numa única aba de Configurações**

Cinco delas são **brancas preenchidas** (o acento), em 4 tamanhos diferentes
(alturas auto/30/31, fontes 11.5 e 12.5). Total de botões de acento numa tela: **28**.

### 2.7 Breakpoints — **13 condições, 10 larguras distintas**

`380 · 760 · 768 · 940 · 1000 · 1050 · 1099 · 1120 · 1199 · 1200`

Não há escala. É a causa-raiz mecânica dos folds fora do previsto pela doutrina
(que fala em 1100 e 768): o L2 colapsa em **940**, não em 768.

### 2.8 Formatos de dado

- **Datas — 5 formas:** `08/18` (rail do modal) · `19/8` (chart) · `19 de ago. de 2026`
  (política de harness) · `2026-08-17` (custo) · `há 2 min` (tokens).
- **Tokens — 3 formas:** `51.3M tokens` (topbar) · `79k tok` (telemetria) · `2.5M`
  (linha mobile, sem unidade).
- **Dinheiro — 2 tipografias:** mono no topbar e nos cards, **sans** nos KPIs do Insights.
- **SHA — 2 caixas na mesma tela:** `RESOLVIDO EM 5DA75ACDA3AB` no chip e
  `5da75acda3ab` no texto ao lado.

### 2.9 O que a doutrina já cobrou e **está cumprido** (não abrir card)

- **Checklist #1 — literais de cor:** **0 de 915 regras de componente** têm literal hex.
  Os 44 hexes do CSS servido vivem todos em blocos `:root` / `[data-theme]`, que é
  exatamente onde a doutrina manda. Inclusive os valores da kill list (`#ffd9a0`,
  `#a9c7e8`, `#e8a1a1`) só sobrevivem como **valor de token do tema nebula**, que por
  contrato tem que ser fiel ao de hoje.
- **#5** topbar em dois níveis acima de 1100 · **#8** dinheiro rotulado com moeda
  (`Custo ~US$ 13,17`) · **#12** piso de 44px nas abas e nas linhas do board mobile ·
  **#13** sem scroll horizontal de página em 360 · **#15** `prefers-reduced-motion`
  presente · `Revogar` em vermelho como ação destrutiva (§2) · tema persistido em cookie.

---

## 3. Inconsistências — desktop (1440 / 900)

### P1 — quebra, perda de informação, controle inalcançável

**1. Painel de Filtros com checkbox e radio empilhados e centralizados acima do rótulo.**
`.ff-opt` está `display:flex; flex-direction:column; align-items:center`. Cada opção vira
uma pilha de 47px (marcador em cima, texto embaixo) e as opções de RELEASE viram três
linhas (marcador / nome / contagem). É a tela mais quebrada do produto.
→ `10` · contraste direto com `17` e `33`, onde o mesmo componente é inline à esquerda.
Doutrina §3.

**2. Meta dos cards trunca no meio da palavra, sem elipse.**
`· ab`, `modelo inferido do ha`, `~U`, e um nome de modelo reduzido a **`g…`** — uma letra
e reticências. A linha não tem prioridade nem largura mínima: corta no que sobrar.
→ `04`, `09`, `18`. Doutrina §3 ("rail truncates with ellipsis") e regra OCL-10.

**3. Abas de Configurações cortadas no meio da palavra, sem nenhuma affordance de scroll.**
A 1440 lê-se `ATUALIZAÇÕI`. `.settabs` tem `overflow-x:auto` (313px visíveis para 999px de
conteúdo), mas não há seta, fade, sombra ou barra visível: o corte no meio do glifo é a
única pista de que existe mais coisa. A 900 somem 3 abas; a 360, 6 de 9.
→ `23`, `34`, `40`, `50`.

**4. Conteúdo passa por baixo da barra de abas em todas as abas de Configurações.**
Um elemento arredondado aparece pela metade logo abaixo das abas, em Executores, Projetos,
Política, Custo, Receitas, Tokens e Atualizações — falta o padding superior da região
rolável.
→ `22`, `23`, `26`, `27`, `28`, `29`, `30`, `33`.

**5. "Mover para missão" fica visível com zero cards selecionados.**
A doutrina (§3, L2) diz que ele só aparece com seleção. Hoje ocupa o canto direito o tempo
todo, e no painel colapsado vira uma linha permanente.
→ `09`, `37`.

**6. O menu `⋯` é desenhado por baixo do painel de Filtros em ≤940.**
Com os dois abertos, o menu aparece cortado no meio do segundo item. A doutrina §2 é
explícita: *"A menu is always over the board"*, e a barra que dona o painel dona a rung.
→ `38`.

**7. `Escape` não fecha o painel de Filtros.** Em 900, 700 e 360 o painel fica aberto por
cima da lista; abrir o `⋯` também não o fecha, e os dois convivem sobrepostos.
→ `38`, `42`, `48`.

**8. A topbar não é fixa.** Ao rolar uma coluna longa, os dois níveis saem da viewport:
perde-se filtros, custo, projeto, missão e o menu de conta. Numa coluna de 19 cards isso
acontece na primeira rolagem.
→ `18`.

### P2 — o mesmo conceito com duas caras

**9. Dois dropdowns vizinhos, duas linguagens de seleção.** Projetos = lista de checkbox
multi-select, com contagem à direita e uma tag `ctx` só em alguns itens. Missões = lista
simples single-select, linha ativa preenchida, divisória e ação `+ Nova missão`. São os dois
primeiros controles da barra.
→ `11`, `12`.

**10. O chip de missão é bare text.** `border-width: 0`, altura **16px**, colado ao chevron —
ao lado de um chip de projeto de 32px com borda. Fere §5.3 (nada de gatilho em texto puro)
e §5.12 (piso de 44px) de uma vez.
→ `02`.

**11. "19 cards" é um botão disfarçado de divisória.** `.board-total` é um `<button>` cuja
única borda é 1px à esquerda. O que parece um separador vertical na barra é, na verdade, um
controle clicável — e o inverso também vale: ninguém descobre que é clicável.
→ `02`, `09`.

**12. O badge de "Filtros" mostra a contagem de cards, não de filtros ativos.** Abaixo de
1100 o texto no DOM é literalmente `Filtros19` com **nenhum filtro aplicado**. A doutrina
reserva esse badge para filtros aplicados (`Filtros ②`). Hoje ele diz "19" o tempo todo.
→ `08`, `36`, `41`, `46`.

**13. O painel "Filtros" tem um item chamado "Filtros" dentro dele.** No estado colapsado,
o terceiro item da lista é outro gatilho de Filtros.
→ `37`, `42`, `48`.

**14. Dinheiro em duas tipografias.** Mono no topbar e nos cards, **sans** nos KPIs do
Insights (`US$ 326,68`). §4.1 pede a face de dados sempre.
→ `09` vs `19`, `20`.

**15. Faixa de seis números sem rótulo no Insights, duplicando os tiles acima.**
`execução 925.3M · 9h58 · 128 execuções   orquestração 0 · 0s · 0 execuções`. §4.2 proíbe
exatamente isso.
→ `19`, `20`.

**16. Sigilos sem legenda nas tabelas do Insights.** `US$ 209,34 ⌀`, `635.3M !`, `6h39 +`,
`140.9M =` — quatro símbolos grudados em números, sem legenda em lugar nenhum da tela.
→ `21`.

**17. Nulos misturados na mesma linha.** A linha `ORQUESTRAÇÃO` mostra `não reportado` no
custo e `0` / `0s` literais nas outras colunas. §4.4 manda nunca converter ausência em zero.
→ `21`, `52`.

**18. Agrupamento de linhas inconsistente dentro da mesma tabela.** Em "Por missão", alguns
grupos repetem o nome nas 3 linhas e outros não têm nome nenhum, só `EXECUÇÃO` /
`ORQUESTRAÇÃO` / `TOTAL` soltos.
→ `21`.

**19. Cinco formatos de data.** Ver §2.8. → `16`, `19`, `27`, `28`, `30`.

**20. Três formatos de token.** Ver §2.8. → `09`, `41`, `44`.

**21. Dois modelos de salvamento em Configurações.** Timeout, Idioma e Atualizações têm
botão "Salvar…" explícito; Executores, Projetos, Política e Custo não têm botão nenhum
(salvam sozinhos). Não há como saber, olhando, se uma mudança foi persistida.
→ `31`, `32`, `33` vs `22`, `26`, `27`, `28`.

**22. Três rótulos de botão salvar.** "Salvar timeout de claim", "Salvar idioma", "Salvar".
→ `31`, `32`, `33`.

**23. Checkbox e radio nativos do browser.** `appearance:auto` + `accent-color:auto` produzem
o azul do sistema — o único azul do produto — e ignoram todos os tokens.
→ `28`, `33`.

**24. Verde (`--oc-ok`) usado como decoração de container.** O bloco "PARA CONFERIR, ABRA"
no modal tem borda e fundo verdes; os chips "vistos em conexões reais" têm fundo verde; a
tag "RECEITA PRÓPRIA" é verde. A regra de §2 restringe `--oc-ok` a bolinha de status, texto
de status, texto de erro e ação destrutiva.
→ `15`, `25`, `29`.

**25. Inflação do acento.** 28 botões brancos preenchidos numa única aba, em 4 tamanhos.
Quando quatro "adicionar" secundários e dois "gerar token" competem em branco puro, não
sobra hierarquia para o primário de verdade.
→ `22`, `30`.

**26. 103 `<select>` em Configurações e nenhum `<optgroup>`.** É o achado #2 do dono medido:
toda lista de modelo é plana, sem agrupamento por CLI. `<optgroup>` já é suportado por
`<select>` nativo, então o caminho está aberto.
→ `27`.

**27. Chip de modelo com dois estados e nenhuma legenda.** Preenchido vs contornado, sem
rótulo, tooltip ou aviso. É o achado #1 do dono ("chip de executor desativado sem alerta")
ainda de pé.
→ `24`, `40`.

**28. Duas larguras de casca.** O board é full-bleed de borda a borda; Insights e
Configurações são centrados em ~1010px com 215px de margem morta de cada lado.
→ `09` vs `19`, `22`.

**29. Três padrões de navegação.** Chips na barra (board), breadcrumb dentro de uma caixa
arredondada (Insights/Configurações) e abas sublinhadas (Configurações).
→ `09`, `19`, `22`.

**30. O breadcrumb de Configurações mostra um projeto, não a página.**
"PilotDeck / **Overclock App**" — enquanto o de Insights mostra "PilotDeck / Insights".
→ `22` vs `19`.

**31. O rail do modal é 2,4× mais alto que a coluna principal.** Medido: `d-main`
scrollHeight 795px, `d-rail` 1254px, ambos com 522px visíveis. O log de execução (secundário)
é mais longo que o contrato (principal), rola sozinho e não tem nenhuma marca de que continua.
→ `13`, `17`.

**32. A saída de emergência da validação é o elemento menos visível da tela.**
Com o checklist em 0/4, "Validar" fica desabilitado e **não diz o que falta**; a única
alternativa é `validar mesmo assim`, um link sublinhado em `rgba(255,255,255,.42)`
(~3:1 de contraste), no canto oposto.
→ `15`.

**33. Duas anatomias de fechar.** `×` em caixa com borda (modal) e glifo `⊗` sem caixa
(popover Criar missão).
→ `13`, `35`.

**34. Textareas com resize handle nativo.** Em "Criar missão" e em "Receitas de uso" o
usuário pode arrastar o campo para fora do container.
→ `29`, `35`.

**35. O chart "Gasto ao longo do tempo" é a superfície mais clara do app.** Duas barras
sólidas quase brancas, sem eixo, sem escala, sem rótulo de valor — lê-se como skeleton de
carregamento, não como dado.
→ `19`, `20`, `51`.

### P3 — polimento

**36. Mistura de idioma.** A UI é pt-BR; o conteúdo de "O que o agente lê", em Receitas de
uso, é inglês corrido. → `29`.

**37. SHA em caixa alta num chip e minúsculo no texto ao lado, na mesma tela.**
`RESOLVIDO EM 5DA75ACDA3AB` vs `5da75acda3ab`. → `44`.

**38. Microcopy contraditória na telemetria.** `~US$ 0,25 calculado · estimado` — as duas
palavras na mesma linha. → `44`.

**39. Frases sem ponto e sem maiúscula convivendo com frases completas.**
"desligado por padrão · marque só para um token…" e "esta execução não reportou o caminho",
ao lado de textos formatados como frase. → `30`, `44`.

**40. O empty state manda criar um card e não oferece como.** "Nada na fila. Crie um card ou
diga ao seu agente: *registre isso como tarefa*" — mas **não existe formulário de criação de
card na UI web**; a varredura dos controles do board devolve só os gatilhos da barra. A
única criação disponível é "+ Nova missão", escondida dentro do dropdown de missões.
→ `09`, `35`.

**41. O blur de rodapé cobre conteúdo real em todas as páginas.** O último card da coluna,
as últimas linhas das tabelas do Insights e o parágrafo explicativo do painel de modelos
ficam permanentemente desfocados — não é um fade curto de borda, é conteúdo ilegível.
→ `09`, `19`, `21`, `41`.

**42. O chip de tipo do card é 9.5px.** Abaixo do piso de 11px da rampa de §2, em uppercase
com letter-spacing — o texto menor do produto é também o mais espremido. → `04`.

**43. Dez larguras de breakpoint sem escala.** Ver §2.7. É o motivo de o L2 colapsar em 940
em vez dos 768 previstos, e de o L1 dobrar em 1099 em vez de 1100.

**44. O botão primário do banner de release não atualiza nada.** "Atualizar", branco
preenchido, o único botão de acento da faixa, apenas revela duas linhas de instrução manual
e o aviso de que não há sidecar capaz de reiniciar um container. O rótulo promete uma ação
que o botão não executa.
→ `01` (antes) e `07` (depois do clique, com as duas linhas reveladas).

**45. Duas versões com formatos diferentes na mesma sessão.** O banner anuncia `v0.2.1`;
Configurações › Atualizações informa `0.1.12`. Além de divergirem, um tem `v` e o outro não.
→ `01`, `33`.

---

## 4. O que a fase A confirma dos dois achados do dono

| Achado do dono | Estado | Onde |
|---|---|---|
| Chip de executor desativado sem alerta | **De pé.** Dois estados de chip (preenchido/contornado) sem legenda, tooltip ou aviso — em Claude Code, Kimi e Grok | #27 · `24`, `40` |
| Dropdown de modelo plano, sem agrupamento por CLI | **De pé e quantificado.** 103 `<select>`, 0 `<optgroup>` | #26 · `27` |

---

## 5. Inconsistências — mobile (700 e 360)

> Adição de contrato do dono em 2026-08-19. Prints com sufixo `-mobile`.
> A ≤768px o board troca de arquitetura: as 5 colunas viram **uma lista de linhas** com
> seletor de coluna no topo, e o modal vira **sheet de tela cheia**. São componentes
> diferentes, não os mesmos componentes reflowados — por isso a maioria dos achados abaixo
> não tem par no desktop.
>
> Nota de método: o Chrome no macOS não deixa a janela abaixo de ~500px, então o 360 foi
> renderizado num iframe de 360px de largura na mesma origem — as media queries respondem
> ao viewport do iframe (`max-width:480px` verdadeiro, `innerWidth` 360), então o layout é o
> real, não um zoom.

### P1

**M1. O menu `⋯` é cortado pela borda direita da viewport em 360.** Só a metade esquerda do
botão fica visível. Com isso, **Insights, Configurações, seletor de tema e Sair ficam sem
ponto de entrada** num telefone.
→ `47`, `46`.

**M2. O título do card é espremido a ~18 caracteres enquanto a coluna de custo mantém a
largura inteira.** "Cliente MCP do Over…", "compararVersa…", "Mapeamento p…". O único
conteúdo que identifica o card perde para o número.
→ `46`.

**M3. A mesma coluna mistura dinheiro e tokens, sem unidade.** Na lista aparecem
`~US$ 1,16`, `~US$ 0,02`, **`~1k`** e **`2.5M`** — os dois últimos são contagem de token
ocupando a coluna de dinheiro, sem rótulo. Uma linha custa 1,16 dólares e a de baixo custa
"2.5M" de nada.
→ `41`, `46`.

**M4. O tipo do card vira letra colorida — verde para `F`, vermelha para `B` — só no
mobile.** No desktop o mesmo dado é chip neutro contornado. É o único lugar do produto onde
o tipo carrega cor, e a kill list de §5.2 é explícita: zero badge de tipo colorido.
→ `41`, `46` vs `04`.

**M5. Insights a 360 perde ~200px de conteúdo, de forma irrecuperável.** Medido:
`.nb.nebula-surface` tem `overflow-x: clip` com 345px de container para 546px de conteúdo,
e o documento não tem scroll horizontal (`clientWidth == scrollWidth == 345`). Não é
"role para o lado": é conteúdo cortado sem saída. A tabela interna (`.ins-scroll`) até
tem `overflow-x:auto`, mas está dentro do container que corta.
→ `51`, `52`.

**M6. Abas de Configurações a 360 mostram 3 de 9**, com o mesmo corte no meio da palavra e
a mesma ausência de affordance do desktop.
→ `50`.

### P2

**M7. O `×` do sheet colide com o breadcrumb.** A 700 ele passa por cima do texto do
"RELATO"; a 360 o breadcrumb é cortado e o link da missão quebra em duas linhas por baixo do
botão.
→ `43`, `44`, `49`.

**M8. O rodapé de ações do sheet não é fixo.** Para validar ou reabrir é preciso rolar o
card inteiro. E a ordem inverte em relação ao desktop: no mobile o `validar mesmo assim`
vem **acima** dos dois botões.
→ `44`.

**M9. Paridade de conteúdo quebrada entre breakpoints.** A linha mobile mostra **custo**; o
card desktop mostra **"modelo inferido do harness · aberto 8 min"** e nenhum custo. É o mesmo
card exibindo fatos diferentes conforme a largura da janela.
→ `41` vs `09`.

**M10. O stat de custo ganha uma caixa com borda no mobile** e é texto solto (com a
divisória-que-é-botão) no desktop.
→ `47` vs `02`.

**M11. Chips de código estouram a coluna a 360.** `context/dossie-overclock.md` e
`getProjectContext(projectId)` ocupam quase a largura inteira dentro de um parágrafo,
quebrando o ritmo do texto em degraus.
→ `49`.

**M12. Chips "vistos em conexões reais" com alturas desiguais** (56px e 78px na mesma
coluna), porque o nome do modelo e a contagem quebram em duas linhas em alguns e não em
outros.
→ `50`.

**M13. Os KPIs do Insights viram 2×2 com alturas de conteúdo muito desiguais** — um tile
tem 4 linhas de nota e o de "EXECUÇÕES" não tem nenhuma, deixando metade da caixa vazia.
→ `51`.

### P3

**M14. Painel de Filtros aninhado e `Escape` que não fecha** se repetem igual ao 900 —
mesma causa, então provavelmente o mesmo conserto.
→ `42`, `48`.

**M15. O blur de rodapé também come a última linha da lista e da tabela no mobile**, onde
a área útil é justamente a mais escassa.
→ `41`, `46`, `52`.

---

## 6. Proposta de agrupamento para a fase B

Onze frentes. Cada uma junta achados que compartilham causa ou arquivo, para não ter dois
cards brigando pelo mesmo trecho. **Nenhum card foi criado** — a lista abaixo é proposta.

| # | Frente | Fecha | Por que junto |
|---|---|---|---|
| **A** | **Controles de formulário tokenizados** — checkbox, radio e `<select>` deixam de ser nativos; `<optgroup>` por CLI | 1, 23, 26, 27, M-nenhum | Mesma raiz: `appearance:auto`. Resolve a tela mais quebrada e os **dois achados do dono** |
| **B** | **Anatomia única de gatilho na barra** | 5, 10, 11, 12, 13 | Todos vivem na topbar; mexer em um sem os outros recria o desalinhamento |
| **C** | **Truncagem e prioridade de conteúdo** — meta do card, abas, breadcrumb, título mobile | 2, 3, M2, M6 | Mesmo defeito (corte cego sem prioridade) em 4 superfícies |
| **D** | **Camadas e overlays** — menu sobre painel, `Escape`, topbar fixa, blur de rodapé | 6, 7, 8, 41, M14, M15 | É a ladder de `--oc-z-*` de §2 e o comportamento de dismiss; um card só |
| **E** | **Formatadores únicos** — data, token, dinheiro, SHA, nulos, sigilos | 14, 16, 17, 19, 20, 37, 38, M3 | §4.4 já pede "um formatador"; hoje há 5 datas, 3 tokens e 2 tipografias de dinheiro |
| **F** | **Sistema único de badge/chip** — tipo, estado, contagem | 27, 42, M4 | 7 anatomias hoje; o mobile ainda usa cor onde a kill list proíbe |
| **G** | **Escala de breakpoints e paridade desktop↔mobile** | 43, M9, M10 | Sem escala de breakpoint, os folds continuam caindo em lugares arbitrários |
| **H** | **Casca de página e navegação** — container, breadcrumb, tabs vs chips | 28, 29, 30 | Board full-bleed vs páginas centradas; 3 padrões de navegação |
| **I** | **Sinal de salvamento em Configurações** | 21, 22 | Um único modelo (auto-save com feedback, ou botão em todas) |
| **J** | **Insights: hierarquia, chart, tiles, faixa duplicada** | 15, 18, 31(?), 35, M5, M13 | Página inteira; o clip de M5 é bloqueante e mora no mesmo container |
| **K** | **Acento e cor semântica** — verde decorativo, inflação de branco, contraste da saída de emergência | 24, 25, 32 | Todos são "cor com significado errado"; §2 tem a regra pronta |

Fora do agrupamento, três itens que são decisão de produto antes de serem de design e
provavelmente merecem card próprio (ou um "não vamos mexer" explícito):

- **#40** — o board não tem criação de card na UI. Ou o empty state para de prometer, ou
  ganha o formulário.
- **#44** e **#45** — o botão "Atualizar" que não atualiza e as duas versões divergentes.
- **#31** — o rail do modal mais longo que o contrato: é hierarquia de informação, não CSS.

---

## 7. Índice dos prints

| # | Arquivo | Tela |
|---|---|---|
| 01 | `01-board-1440-banner-release.jpg` | Board com banner de release |
| 02 | `02-topbar-1440-zoom.png` | Zoom da topbar (2 níveis) |
| 03 | `03-board-1440-limpo.jpg` | Board sem banner |
| 04 | `04-card-1440-zoom-badge-truncagem.png` | Card: chip de tipo e meta truncada |
| 05 | `05-menu-conta-1440-tema.jpg` | Menu `⋯` com seletor de tema |
| 06 | `06-board-1440-tema-xai.jpg` | Tema xAI |
| 07 | `07-board-1370-banner-reaparece.jpg` | Banner com as 2 linhas reveladas por "Atualizar" |
| 08 | `08-board-1024-fold-filtros-badge-19.jpg` | Fold ≤1099: badge "Filtros 19" |
| 09 | `09-board-1440-limpo-canonico.jpg` | **Board canônico 1440** |
| 10 | `10-filtros-1440-painel-quebrado.jpg` | **Painel de Filtros quebrado** |
| 11 | `11-dropdown-projetos-1440-checkbox.jpg` | Dropdown de projetos |
| 12 | `12-dropdown-missoes-1440-lista-simples.jpg` | Dropdown de missões |
| 13 | `13-modal-card-1440.jpg` | Modal de card |
| 14 | `14-modal-zoom-badges-breadcrumb.png` | Badges e breadcrumb do modal |
| 15 | `15-modal-zoom-bloco-verde-e-rodape.png` | Bloco verde + rodapé de ações |
| 16 | `16-modal-zoom-rail-harness.png` | Rail: missão, harness, papéis |
| 17 | `17-modal-card-1440-checklist.jpg` | Checklist de validação |
| 18 | `18-board-1440-scroll-meta-truncada-topbar-some.jpg` | Scroll longo: meta truncada, topbar some |
| 19 | `19-insights-1440-topo.jpg` | Insights: KPIs, chart, participação |
| 20 | `20-insights-1100-kpis.jpg` | Insights a 1100 |
| 21 | `21-insights-1100-tabelas-sigilos.jpg` | Tabelas com sigilos `⌀ ! + =` |
| 22 | `22-config-executores-1440.jpg` | Configurações › Executores |
| 23 | `23-config-zoom-abas-cortadas.png` | Abas cortadas |
| 24 | `24-config-zoom-chips-modelo.png` | Chips de modelo (dois estados) |
| 25 | `25-config-zoom-chips-verdes-adicionar.png` | Chips verdes + botões "adicionar" |
| 26 | `26-config-projetos-1440.jpg` | Configurações › Projetos |
| 27 | `27-config-politica-harness-1440.jpg` | Configurações › Política de harness |
| 28 | `28-config-custo-1440.jpg` | Configurações › Custo |
| 29 | `29-config-receitas-uso-1440.jpg` | Configurações › Receitas de uso |
| 30 | `30-config-tokens-mcp-1440.jpg` | Configurações › Tokens MCP (**tokens mascarados**) |
| 31 | `31-config-timeout-claim-1440.jpg` | Configurações › Timeout de claim |
| 32 | `32-config-idioma-1440.jpg` | Configurações › Idioma |
| 33 | `33-config-atualizacoes-1440.jpg` | Configurações › Atualizações |
| 34 | `34-config-zoom-aba-ativa-cortada.png` | Aba ativa cortada |
| 35 | `35-form-criar-missao-1440.jpg` | Formulário "Criar missão" |
| 36 | `36-board-900.jpg` | Board a 900 |
| 37 | `37-board-900-painel-filtros-aninhado.jpg` | Painel colapsado com "Filtros" dentro |
| 38 | `38-board-900-menu-conta-clipado-sob-painel.jpg` | Menu `⋯` por baixo do painel |
| 39 | `39-insights-900.jpg` | Insights a 900 |
| 40 | `40-config-executores-900-abas-cortadas.jpg` | Configurações a 900 |
| 41 | `41-board-700-mobile.jpg` | **Board a 700 (lista)** |
| 42 | `42-board-700-painel-filtros-mobile.jpg` | Painel de filtros a 700 |
| 43 | `43-modal-card-700-mobile.jpg` | Sheet do card a 700 |
| 44 | `44-modal-card-700-rodape-mobile.jpg` | Rodapé do sheet a 700 |
| 45 | `45-board-500-mobile.jpg` | Board a 500 |
| 46 | `46-board-360-mobile.jpg` | **Board a 360** |
| 47 | `47-header-360-zoom-menu-cortado-mobile.png` | **`⋯` cortado pela viewport** |
| 48 | `48-board-360-painel-filtros-mobile.jpg` | Painel de filtros a 360 |
| 49 | `49-modal-card-360-mobile.jpg` | Sheet do card a 360 |
| 50 | `50-config-executores-360-mobile.jpg` | Configurações a 360 |
| 51 | `51-insights-360-mobile.jpg` | Insights a 360 |
| 52 | `52-insights-360-tabela-cortada-mobile.jpg` | Tabela cortada sem scroll a 360 |
