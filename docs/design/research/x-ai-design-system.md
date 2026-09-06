# Design System — xAI Documentation (`docs.x.ai`)

> Pesquisa de referência visual extraída de `https://docs.x.ai/overview` e páginas vinculadas, complementada por análises públicas do design system xAI. Onde tokens não são expostos explicitamente, os valores estão marcados como **inferido**.

---

## 1. Paleta de Cores

### Superfícies (observadas no CSS da docs)

| Token / classe | Valor aproximado | Uso |
| --- | --- | --- |
| `bg-surface-base` / `bg-base` | `#0a0a0a` (`0 0% 4%`) | Fundo geral da página no tema escuro. |
| `bg-card` | `#191919` (`0 0% 10%`) | Fundo de cards e painéis. |
| `bg-l1` | `#121212` (`0 0% 7%`) | Sidebar / navegação lateral. |
| `bg-l2` | `#1a1a1a` (`0 0% 10%`) | Sub-superfícies. |
| `bg-l3` | `#212121` (`0 0% 13%`) | Hover em itens da sidebar. |
| `bg-l4` | `#262626` (`0 0% 15%`) | Inputs e containers aninhados. |
| `bg-l4-hover` | `#2b2b2b` (`0 0% 17%`) | Hover em inputs/containers. |
| `bg-overlay-hover` | branco a 3% | Hover sutil em botões e links. |
| `bg-codeblock` | `#121212` (`0 0% 7%`) | Fundo de blocos de código (observado). |

### Texto

| Token / classe | Valor aproximado | Uso |
| --- | --- | --- |
| `text-primary` / `fg` | `#f0f0f0` (`0 0% 98%`) | Títulos, corpo principal, links. |
| `text-secondary` / `text-subtle` / `fg-muted` | `#787878` (`0 0% 47%`) | Descrições, metadados, texto secundário. |
| `text-muted` | `#919191` (`216 4% 51%`) | Labels, timestamps, texto terciário. |
| `text-primary-foreground` | `#0a0a0a` (`0 0% 4%`) | Texto sobre botão primário branco. |

### Acentos e semântica

| Token / classe | Valor aproximado | Uso |
| --- | --- | --- |
| `text-solar` / `border-solar` | `#ff7a17` (`22 100% 52%`) | Badges "New", links com `<code>`, destaques técnicos. |
| `focus-visible:outline-blue-500` | `#3080ff` | Estado de foco em links/inputs (observado). |
| `success` | `#16a34a` (inferido do Open Design) | Estados de sucesso. |
| `warn` | `#eab308` (inferido) | Avisos. |
| `danger` / `destructive` | `#dc2626` / `0 55% 55%` | Erros, alertas. |

### Bordas

| Token | Valor aproximado | Uso |
| --- | --- | --- |
| `border-muted` | `#303030` (`0 0% 19%`) | Bordas padrão de cards e divisores. |
| `border-subtle` | `#5e5e5e` (`0 0% 37%`) | Bordas de inputs, estados inativos. |
| `border-bold` | `#f0f0f0` (`0 0% 4%`) | Bordas de alto contraste. |
| `border-primary/15` | branco a ~15% | Bordas de botões outline (observado). |

> **Nota:** O marketing site `x.ai` usa um canvas ainda mais escuro (`#0a0a0a`) e bordas brancas translúcidas (`rgba(255,255,255,0.1)`), enquanto a documentação adota cinzas mais neutros (`neutral5` a `neutral98`). A documentação é **dark-first**, mas os tokens permitem um tema claro completo.

---

## 2. Tipografia

### Famílias

| Token | Fonte | Papel |
| --- | --- | --- |
| `font-display` | `universalSansDisplay` (400 / 550) | Títulos de seção, hero, headings de cards. |
| `font-sans` / `font-universal-sans` | `universalSans` (400 / 550) | Corpo, labels, navegação. |
| `font-mono` | `GeistMono` | Código, slugs de modelo, badges técnicos, comandos. |

> `font-display` foi inferida a partir do HTML (`class="font-display text-4xl ..."`) e da presença de `@font-face universalSansDisplay` no CSS. A classe utilitária final pode ser uma abstração interna da docs.

### Escala observada (Tailwind custom)

| Token | Tamanho | Uso típico |
| --- | --- | --- |
| `text-xs` | 12px | Badges, metadados, timestamps. |
| `text-sm` | 14px | Corpo secundário, labels, menu. |
| `text-base` | 16px | Corpo padrão. |
| `text-lg` | 18px | Parágrafos de destaque. |
| `text-xl` | 20px | Subtítulos de cards. |
| `text-2xl` | 24px | Títulos pequenos. |
| `text-3xl` | 30px | Títulos de seção. |
| `text-4xl` | 36px | Hero em mobile. |
| `text-5xl` | 48px | Hero em desktop. |
| `text-[8rem]` → `text-[12rem]` | 128px → 192px | Números/métricas grandes (inferido, homepage). |

### Pesos e tracking

- **Peso predominante:** `font-normal` (400) para leitura; `font-medium` (500) para títulos e botões.
- **Tracking:** `tracking-tight` (-0.025em) e `tracking-tighter` (-0.05em) em títulos grandes; `tracking-wide` (0.025em) em labels/caps.
- **Mono em UI:** slugs de modelo (`grok-4.6`) e links de API usam `font-mono` com `text-solar`.

---

## 3. Espaçamento e Grid

### Sistema de espaçamento

- **Base:** `0.25rem` = **4px**.
- Escala Tailwind padrão com valores-chave observados: 4, 8, 12, 16, 20, 24, 32, 48, 64, 96 px.
- **Padding de seção:** `py-16` (64px) para grandes blocos de conteúdo.
- **Padding interno de cards:** `1.25rem` (20px) — variável `--card-px`.

### Grid e containers

| Classe | Largura | Uso |
| --- | --- | --- |
| `max-w-2xl` | 448px | Coluna de texto de documentação. |
| `max-w-6xl` | 1152px | Container do conteúdo principal da overview. |
| `max-w-7xl` | 1280px | Seções de API com schema/sidebar de parâmetros. |
| Container docs | ~1200px | Centro do conteúdo (inferido, padrão Mintlify-like). |

### Padrões de layout

- **Sidebar esquerda:** largura `15.5rem` (mobile) → `18rem` (desktop), colapsável.
- **Topbar:** `3.5rem` (mobile) → `4rem` (desktop).
- **TOC direita:** `w-80` (320px), sticky, oculto em mobile.
- **Cards da overview:** grid `1 → 3` colunas (`lg:grid-cols-3`).
- **Cards de API:** flex `1 → 2` colunas (`@[800px]:flex-row`).

---

## 4. Componentes e Padrões de UI

### Botões

**Primário (preenchido)**

- Fundo: `bg-primary` (branco no dark).
- Texto: `text-primary-foreground` (quase preto).
- Forma: `rounded-full` (pill).
- Padding: `px-5 py-3` (~20px × 12px).
- Ícone opcional à direita.
- Hover: `hover:brightness-90` (escurece levemente).

**Outline / Ghost**

- Fundo: transparente.
- Borda: `border-primary/15` (branco translúcido).
- Texto: `text-primary`.
- Forma: pill ou `rounded-full`.
- Hover: `hover:bg-overlay-hover` (branco 3%).

**Icon button**

- Tamanho: `size-9` (36px).
- Forma: `rounded-full`.
- Hover: `hover:bg-overlay-hover`.

### Cards

- Fundo: `bg-card` (`#191919`).
- Borda: geralmente implícita via contraste de superfície; ocasionalmente `border-primary/7`.
- Radius: `rounded-2xl` (16px) ou `rounded-3xl` (24px) para cards grandes; `rounded-xl` (12px) para modais/tooltips.
- Sombra: rara; quando usada, `shadow-xl shadow-black/10 backdrop-blur-xl` (modal, inferido).
- Padding interno: 20–24px.

### Code blocks

- Tema: **Shiki** com temas `github-light` / `github-dark`.
- Fundo claro: `#ffffff`; fundo escuro: `#24292e` (GitHub dark) ou `#121212` para blocos embutidos.
- Fonte: `font-mono` (`GeistMono`).
- Tabs de linguagem: botões segmentados com `bg-primary` ativo.
- Copy button: ícone discreto no canto superior direito.
- Links dentro de `<code>` usam `text-solar` com `decoration-dotted`.

### Navegação

- **Sidebar:** menu colapsável com ícones `lucide`, itens de `h-8` (32px), `rounded-[10px]`, `text-[13px]`.
  - Estado ativo: `data-active:bg-base data-active:text-primary`.
  - Hover: `hover:text-primary hover:bg-overlay-hover`.
- **Topbar:** logo + busca + CTA. Busca com `rounded-full border-primary/15`.
- **Breadcrumb / TOC:** texto `text-muted`, hover `text-primary`.

### Badges

- Badge "New": `rounded-full`, borda `border-solar/25`, texto `text-solar`, fundo transparente, `text-xs`.
- Badges de status: `h-6 px-2.5 py-0.5`.

### Tabelas

- Não foram renderizadas nas páginas inspecionadas via `FetchURL`, mas o CSS expõe tokens de data-table (`bg-l2`, `fg-muted`, bordas `border-muted`).
- **Inferido:** cabeçalho com fundo `bg-l2`/`bg-base`, texto `caption-mono` (GeistMono uppercase), linhas separadas por `border-muted`, células com `text-sm`.

### Inputs

- Fundo: `bg-l4` (`#262626`).
- Borda: `border-subtle` / `border-muted`.
- Radius: `rounded-[10px]` a `rounded-full`.
- Foco: `focus-visible:ring-2 focus-visible:ring-primary`.
- Placeholder: `text-muted`.

---

## 5. Tom, Voz e Princípios Visuais

1. **Dark-first, high-contrast.** O padrão é `#0a0a0a` com texto quase branco. Não há gradientes decorativos na documentação.
2. **Monospace como sinal técnico.** Toda referência de código, slug de modelo e endpoint usa `GeistMono` + acento solar.
3. **Restrição cromática.** A cor só aparece em função: solar para destaque técnico, azul para foco, verde/vermelho para semântica.
4. **Densidade moderada.** Cards espaçosos com padding generoso, mas a sidebar e tabelas mantêm densidade técnica.
5. **Pill como linguagem de interação.** Botões, busca, badges e chips são arredondados ao máximo (`rounded-full`), criando contraste com os cards de cantos mais suaves.
6. **Tipografia como hierarquia.** Pouco uso de bold; tamanho, tracking e família fazem o trabalho de ênfase.

---

## 6. Motion e Transições

| Padrão | Duração / easing | Uso |
| --- | --- | --- |
| `transition-colors duration-150` | 150ms | Botões, links. |
| `transition-colors duration-200` | 200ms | Itens de sidebar, collapsibles. |
| `transition-[margin,opacity] duration-200 ease-linear` | 200ms linear | Search input. |
| `transition-transform duration-200` | 200ms | Ícones de seta em collapsibles. |
| `cubic-bezier(.4,0,.2,1)` | padrão Tailwind | Hover e estados. |
| `cubic-bezier(0,0,.2,1)` | ease-out | Animações de entrada. |
| `animate-collapsible-down/up` | inferido | Abrir/fechar seções da sidebar. |
| `fade-in-0`, `zoom-in-95`, `slide-in-from-*` | 150–500ms | Modais, dropdowns, tooltips. |
| Skeleton / shimmer | não observado diretamente | Provável uso de `bg-l2` pulsante (inferido). |

> **Observação:** Não há motion pesado ou parallax. As transições são utilitárias, rápidas e quase invisíveis — consistentes com a estética técnica.

---

## 7. O Que Torna a Estética x.ai Reconhecível

- **Canvas escuro quase puro** (`#0a0a0a`) com branco como cor primária de interação.
- **Dupla tipográfica UniversalSans + GeistMono**: proporção para leitura, monoespaço para código.
- **Acento laranja solar** (`#ff7a17`) usado com parcimônia para links técnicos e badges.
- **Formas híbridas:** cards arredondados (`rounded-2xl/3xl`) + botões e inputs pill (`rounded-full`).
- **Ausência de adornos:** sem ilustrações decorativas, sem sombras pesadas, sem gradientes de fundo na documentação.
- **Foco no conteúdo técnico:** code blocks com tabs, slugs copiáveis, navegação por API.

---

## 8. O Que Trazer para o Overclock

Abaixo, o que faz sentido adaptar para o design system do Overclock, respeitando a identidade própria da plataforma:

1. **Adotar um tema escuro como default.** `#0a0a0a` ou `#111111` como fundo, com texto em escala de branco/neutro claro. Manter tema claro opcional, mas secundário.
2. **Tipografia dupla.** Uma sans geometrica moderna para UI e leitura (similar à UniversalSans/Inter) e uma mono de alta legibilidade (GeistMono, JetBrains Mono ou IBM Plex Mono) para código, métricas e labels técnicos.
3. **Cor de acento única e funcional.** Escolher uma cor de destaque (ex.: laranja, azul ou verde) e usá-la apenas para: links técnicos, badges de status, foco e CTA primário.
4. **Botões pill para ações primárias e secundárias.** `rounded-full` com preenchido + outline; evitar cantos quadrados para CTAs.
5. **Cards com superfície levemente elevada.** Fundo `#191919` sobre `#0a0a0a`, bordas sutis (`rgba(255,255,255,0.06)` a `0.1`), radius médio (`12–16px`). Sem sombras fortes.
6. **Code blocks de primeira classe.** Tabs de linguagem, copy-to-clipboard, fundo escuro independente do tema, syntax highlight Shiki ou similar, links de código em cor de acento.
7. **Espaçamento generoso, densidade técnica.** Seções com `64–96px` de padding vertical; componentes densos em grids de dashboard/tabela.
8. **Motion comedido.** Transições de 150–200ms, foco em cores e opacidade, sem animações elaboradas.
9. **Navegação de docs sidebar + TOC.** Sidebar colapsável à esquerda, toc sticky à direita, breadcrumbs discretos.
10. **Não copiar o brutalismo do marketing site x.ai.** A documentação x.ai é mais "suave" (cards arredondados, mais cinza) do que o site institucional (cantos afiados, 320px mono). Para o Overclock, a versão "docs" é o modelo mais aplicável a uma ferramenta de produtividade/agentes.

---

## Fontes e Notas

- CSS extraído diretamente de `https://docs.x.ai/overview` em 2026-08-21.
- Tokens de cor convertidos de HSL para HEX aproximado quando aplicável.
- Análise complementar de:
  - [Open Design — xAI design system](https://open-design.ai/plugins/design-system-x-ai/)
  - [awesome-design-md / x.ai DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/DESIGN.md)
- Páginas inspecionadas: `/overview`, `/`, `/models`, `/api-reference`, `/guides`, `/developers/rest-api-reference/inference`. Nenhuma página retornou erro; o conteúdo dinâmico de API foi inspecionado via HTML bruto.
