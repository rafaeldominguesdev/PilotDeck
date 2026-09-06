# Design System v2 — Bancada A

> OCL-115. Uma linguagem visual unificada para o PilotDeck (web board) e o Overclock IDE (app multi-pane). Codinome interno: **Aero-Mono**.

## O que é esta bancada

Esta é uma proposta **autônoma e avançada** de design system para unificar dois produtos que hoje convivem no mesmo ecossistema mas ainda não falam a mesma língua visual:

- **PilotDeck web** — o board de cards (mission control).
- **Overclock app** — a IDE multi-pane, onde o usuário vê terminais, grids de panes, navegação e workspaces.

A bancada A adota a direção **x.ai** como ponto de partida: canvas near-black, tipografia seca falando por peso, monocromático disciplinado e ar generoso. Mas em vez de rejeitar o glass como a versão atual do sistema faz, ela o **instrumentaliza**: o blur e a profundidade existem para resolver o problema real do app multi-pane — panes flutuando sobre panes, terminais sobre grids, painéis de contexto sobre tudo.

## Visão em uma frase

> Um instrument panel único: denso como um terminal, limpo como o x.ai, e profundo como o espaço entre panes.

## Os 6 pilares

1. **Tokens arquiteturais** — cor, tipo, espaço, raio, sombra e glass como uma escala contínua, não como um saco de valores.
2. **Motion system** — choreography real, com easing físico, durações semânticas e orquestração de entrada/saída de panes.
3. **Glass e profundidade** — camadas de elevação, blur, saturação e highlights que fazem painéis flutuarem sobre o board e sobre o grid de panes.
4. **Componentes canônicos** — button, control, select, form, chip/badge, table, popover/menu, empty, toast, board card, pane header, pane grid, terminal.
5. **Ponte web ↔ app** — o que é compartilhado, o que cada produto especializa, e como o mesmo token vive em dois contextos.
6. **Referências x.ai** — densidade, tipografia seca, monocromático, nenhuma cor decorativa.

## Decisões principais

### D1 — Uma escala de elevação, não apenas cores

O sistema atual tem `--oc-surface`, `--oc-surface-2`, `--oc-surface-3`. A bancada A estende isso para uma escala contínua de **elevação + profundidade**:

- `--ocv2-elevation-*` define a distância do canvas (0 a 5).
- Cada elevação combina `bg`, `border-alpha`, `shadow`, `blur` e `highlight`.
- O board web usa elevações 0–2; o app multi-pane usa 2–5 para panes flutuantes.

### D2 — Glass é ferramenta, não identidade

A doutrina atual diz: "glassmorphism-as-identity" é proibido. Concordamos. Mas no app multi-pane, o glass é uma ferramenta óptica necessária: quando um pane flutua sobre outro pane que também flutua sobre um terminal, o blur comunica profundidade sem adicionar cor. Usamos glass apenas em:

- Pane headers flutuantes.
- Popovers e menus.
- Modais e sheets.
- O terminal em overlay.

### D3 — Tipografia unificada: Geist + Inter

O app usa Geist; a web atual usa Inter (na direção x.ai). A bancada A unifica com uma stack que coloca Geist primeiro quando disponível, mas cai em Inter/system-ui. Isso faz com que:

- O app continue com Geist.
- A web ganhe Geist se o usuário tiver a fonte; caso contrário, Inter.
- A voz de dados (`--ocv2-font-data`) é Geist Mono / SF Mono.

### D4 — Motion como sistema de estados

Motion não é só "hover 200ms". São quatro famílias:

- **Micro** (hover, focus, pressed): 150–200ms, easing atmosférico.
- **Layout** (aparecer, desaparecer, trocar): 250–400ms, easing com leve overshoot.
- **Pane** (entrar/sair do grid): 350–550ms, easing físico com spring sutil.
- **Ambient** (cursor, breath, background): 1s–20s, linear ou suave.

### D5 — Terminal é primeiro-cidadão

O terminal não é um componente qualquer. Ele tem:

- Sua própria escala de cor (preto puro, verde de status).
- Fonte mono obrigatória.
- Entrada de comando com histórico.
- Estado de execução com cursor piscando.

### D6 — Status por forma, não por cor

Seguindo a doutrina, cores semânticas (`--ocv2-ok`, `--ocv2-danger`) aparecem apenas em:

- Dots de status.
- Textos de erro/alerta.
- Ações destrutivas.

Nada de badges coloridos. Tipos (`bug`, `feature`, `rfc`) são palavras, e estados são dots + palavras.

## Ponte web ↔ app

| Conceito | Web (PilotDeck board) | App (Overclock IDE) | Token compartilhado |
|---|---|---|---|
| Canvas | `--ocv2-bg` near-black puro | `--ocv2-bg` near-black puro | `--ocv2-bg` |
| Superfície base | `--ocv2-surface-1` (board columns) | `--ocv2-surface-2` (pane body) | escala `--ocv2-surface-*` |
| Flutuação | popover, modal | pane flutuante, terminal overlay | `--ocv2-elevation-*` |
| Tipografia | Inter/Geist UI | Geist UI | `--ocv2-font-ui` |
| Dados | SF Mono / Geist Mono | Geist Mono | `--ocv2-font-data` |
| Controles | 32px compact | 32px compact (toolbar) / 36px forms | `--ocv2-control-height` |
| Densidade | board columns com gutter 24px | pane grid com gap 12px | `--ocv2-space-*` |
| Motion | cards entering columns | panes snapping into grid | `--ocv2-motion-pane-*` |

## Estrutura de arquivos

```
docs/design/system-v2-a/
├── README.md           # este arquivo
├── tokens.css          # tokens completos de design
├── motion.css          # motion system e keyframes
├── glass.css           # glass, elevação e profundidade
├── components.css      # componentes canônicos
├── index.html          # exemplar renderizável
└── assets/             # SVGs e ícones fonte
    └── icons.svg       # sprite de ícones
```

## Como usar

1. Abra `index.html` no navegador.
2. Navegue pelas seções: Tokens, Motion, Glass, Components, Pane Grid, Terminal.
3. Clique nos botões de play para ver motion vivo.
4. Leia os comentários nos arquivos CSS para as especificações exatas.

## O que não é

- Não é um tema para ser aplicado hoje no board ou no app. É biblioteca de design.
- Não olha para as bancadas B/C (independência é o valor).
- Não redefine a doutrina de UX v2; expande-a.

## Referências

- x.ai — densidade, monocromático, tipografia seca.
- PilotDeck UX v2 (`docs/design/ux-v2.md`) — direção base e kill list.
- PilotDeck design system OCL-81 (`docs/design/system/`) — base a superar.
- Overclock app — contexto multi-pane.
