# Design System v2 — Pesquisa de Fundamentos

> Frente 2 do Design System v2 unificado (PilotDeck + Overclock app).  
> Foco: tipografia, cor, tokens, glass/profundidade, espaço, raio, grid e sombra.  
> Não cobre motion (outra frente) nem coleta de referências visuais (outra frente).  
> Tudo aqui é pesquisa com fontes verificáveis; nada foi inventado.

---

## 1. Resumo executivo

Os design systems de elite dos últimos anos — Linear, Vercel/Geist, x.ai, Stripe — convergiram para uma mesma lógica de fundamentos, mesmo com personalidades distintas:

- **Tipografia como identidade:** uma única sans de alta qualidade carrega a hierarquia por tamanho e peso; o mono é reservado a dados, IDs, código e terminais.
- **Cor como luminância:** rampas de cinza construídas por passos de luminância (não por matiz), com um único acento funcional.
- **Tokens em três camadas:** primitivos → semânticos → componente.
- **Vidro como ferramenta, não como personalidade:** blur e translucidez só onde a camada precisa flutuar sobre conteúdo; fallback sólido é obrigatório.
- **Espaço e raio como sistema:** unidade base (4 px ou 8 px), escala matemática, raios nomeados por função.

O Overclock já tem uma direção clara em [`docs/design/ux-v2.md`](../ux-v2.md): *a escola x.ai* — canvas near-black, uma escala de cinza, um acento branco, Inter para UI, mono para dados. Esta pesquisa aprofunda esses fundamentos com evidência do estado da arte e propõe valores concretos para o design system v2.

---

## 2. Metodologia e fontes

Levantamento baseado em:

1. **Sistemas publicados:** Radix Colors, Vercel Geist, x.ai (via DESIGN.md publicado), Stripe (via análises publicadas), Linear (via análises de interface e referências de design).
2. **Guias de plataforma:** Apple Human Interface Guidelines (materiais/depth).
3. **Padrões de acessibilidade:** WCAG 2.2 contrast ratios.
4. **Ferramentas de tokens:** Style Dictionary, Tokens Studio, W3C Design Tokens Community Group.
5. **Base interna:** tokens `--oc-*` atuais em `apps/web/src/styles/themes/` e a doutrina `ux-v2.md`.

Todas as fontes estão listadas na seção 9 com links verificáveis.

---

## 3. Tipografia

### 3.1 O que os sistemas de elite fazem

| Sistema | Sans | Mono | Filosofia de peso | Uso do mono |
|---|---|---|---|---|
| **Linear** | Inter Variable | (sem destaque público) | Peso único ou muito restrito; hierarquia vem de tamanho e cor | IDs, slugs, números em tabelas |
| **Vercel/Geist** | Geist Sans | Geist Mono | 400/500/600 apenas; 700 é excluído de propósito | Código, comandos, atalhos, variáveis de ambiente, hashes |
| **x.ai** | Universal Sans (própria) ou Inter/Geist como fallback | Geist Mono | Peso 400 quase universal; tracking negativo agressivo nos displays | Eyebrows mono uppercase, métricas, labels técnicos |
| **Stripe** | Sohne (própria) | (sistema de apoio) | Peso 300 dominante para elegância editorial | Dados financeiros, código |

Padrões observados:

- **Duas faces, não uma:** sans para UI, mono para voz técnica/dados. A mistura é a identidade.
- **Pesos restritos:** 3 pesos no máximo (ex.: Vercel usa 400/500/600). Menos peso = menos decisões = mais coerência.
- **Tracking como ferramenta de voz:** negativo em display (`-0.02em` a `-0.04em`), levemente positivo em mono caps/labels (`0.04em`–`0.06em`).
- **Escala modular:** tamanhos derivados de uma razão fixa (major third 1.25, perfect fourth 1.333, etc.).

### 3.2 Mono vs Sans: voz e função

O Overclock vive num contexto híbrido: é um board de gestão, mas também lida com terminais, IDs de cards, custos, modelos e código. A doutrina já decidiu corretamente:

- **Sans (UI):** `Inter` — navegação, botões, labels, títulos de card, corpo de modal.
- **Mono (dados):** `SF Mono` / `Geist Mono` / `JetBrains Mono` — IDs de cards (`OCL-119`), preços, contadores, timestamps, hashes, blocos de código, estatísticas.

Regra de ouro dos sistemas de elite: **o mono nunca é a fonte padrão da interface.** Quando o mono domina a UI, a densidade vira "sopa de terminal". No Overclock, o mono deve ser a *voz dos dados*, não a voz do produto.

### 3.3 Escala modular proposta para Overclock

Base: 13 px (corpo da UI, já definido na doutrina).  
Razão: **major third (1.25)** para UI densa; **perfect fourth (1.333)** reservado a marketing/hero fora do produto.  
A escolha de 1.25 mantém os passos apertados (característico de interfaces densas como Linear/x.ai) sem saltos tipográficos estridentes.

| Token | Cálculo | Valor | Uso |
|---|---|---|---|
| `--oc-text-hero` | clamp — fora do UI ramp | `clamp(40px, 6vw, 72px)` | Surfaces de marketing/landing |
| `--oc-text-display` | 13 × 1.25⁴ | ~32 px | Títulos de página grandes |
| `--oc-text-title` | 13 × 1.25³ | ~25 px | Títulos de seção/modal |
| `--oc-text-body` | base | **13 px** | Corpo da UI |
| `--oc-text-label` | 13 × 1.25⁻¹ | ~10 px → arredondado para **12 px** | Labels, captions |
| `--oc-text-data` | 13 × 1.25⁻² | ~8 px → **11 px** | IDs, contadores, timestamps, dinheiro |

> Nota: a doutrina atual (22/16/13/12/11) já está próxima. A proposta é formalizar a escala como tokens e abandonar tamanhos literais espalhados (ver [`decisions.md`](../system/decisions.md) D1).

### 3.4 Proposta de tipografia para Overclock

```css
/* faces */
--oc-font-ui:   Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
--oc-font-data: "Geist Mono", "SF Mono", ui-monospace, Menlo, Monaco, Consolas, monospace;
--oc-font-label: var(--oc-font-ui);

/* rampa */
--oc-text-hero:    clamp(40px, 6vw, 72px);
--oc-text-display: 22px;   /* mantido da doutrina para compatibilidade */
--oc-text-title:   16px;
--oc-text-body:    13px;
--oc-text-label:   12px;
--oc-text-data:    11px;

/* pesos */
--oc-weight-regular:  400;
--oc-weight-medium:   500;
--oc-weight-semibold: 600;

/* tracking */
--oc-tracking-tight: -0.02em;  /* display/title */
--oc-tracking-wide:   0.06em;  /* labels uppercase mono */
--oc-tracking-none:   0;

/* altura de linha */
--oc-leading-none: 1;
--oc-leading-tight: 1.25;
--oc-leading-normal: 1.5;
```

Diretrizes de uso:

- **UI:** `--oc-font-ui`, peso 400/500/600, tracking 0.
- **Dados:** `--oc-font-data`, peso 400/600, tracking 0 (colunas numéricas tabulares com `font-variant-numeric: tabular-nums`).
- **Labels técnicos/eyebrows:** `--oc-font-data` uppercase, tracking `0.06em`, tamanho `--oc-text-label` ou `--oc-text-data`.
- **Display:** `--oc-font-ui`, peso 600, tracking `-0.02em`.

---

## 4. Cor e tema

### 4.1 Monocromático + um acento

A direção x.ai — e que a doutrina do Overclock adota — é:

- **Canvas near-black:** `#000` ou `#0a0a0b`.
- **Superfícies em escala de cinza:** poucos passos acima do canvas.
- **Texto em escala de branco:** 100% / 64% / 42% / 28%.
- **Um único acento funcional:** branco puro (`#ffffff`) no tema x.ai; vermelho no tema overclock; azul-acinzentado no tema nebula.
- **Cores semânticas restritas:** verde/vermelho/amarelo só para status, nunca como decoração.

A análise publicada do x.ai mostra valores reais: canvas `#0a0a0a`, card `#191919`, hairline `#212327`, ink `#ffffff`, body `#dadbdf`, mute `#7d8187` [[xAI DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/DESIGN.md)]. A Vercel usa `#000000` de fundo, texto `#ededed`, muted `#888888` [[GetDesignSystem](https://www.getdesignsystem.io/catalog/vercel)]. Linear opera em `#08090a` com superfícies dentro de `hsl(210–240, 3–11%, 4–25%)` e um índigo `#5e6ad2` como único acento cromático [[CSS DNA](https://cssdna.com/blog/design-md-for-ai-coding-agents/)] [[Refero Styles](https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b1d1)].

### 4.2 Rampa de cinza por luminância (não por matiz)

A grande inovação dos sistemas modernos é construir a escala de cinza por **luminância perceptual**, não por ajustes arbitrários de HSL. Isso garante:

- Contrastes previsíveis entre passos adjacentes.
- Texto legível em cada superfície.
- Temas dark/light derivados da mesma lógica.

O **Radix Colors** é o exemplo mais documentado: cada escala tem 12 passos, onde os passos 1–2 são fundos, 3–5 fundos de componentes, 6–8 bordas, 9–10 fundos sólidos, 11–12 textos [[Radix Understanding the Scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)]. A escala `gray` do Radix é neutra; `slate` tem um subtom azul, `mauve` um subtom púrpura — mas todos são *construídos por luminância*.

### 4.3 Temas escaláveis

O Overclock já tem três temas: `nebula`, `xai`, `overclock`. A arquitetura correta é:

1. **Primitivos de cor:** `--oc-white-rgb`, `--oc-black-rgb`, `--oc-accent-rgb`, `--oc-ok-rgb`, `--oc-danger-rgb`.
2. **Superfícies derivadas:** `--oc-bg`, `--oc-surface`, `--oc-surface-2`, `--oc-surface-3`.
3. **Texto derivado:** `--oc-text-1`, `--oc-text-2`, `--oc-text-3`.
4. **Bordas derivadas:** `--oc-border`, `--oc-border-hover`, `--oc-border-strong`.

Cada tema redefine apenas os primitivos; os semânticos e componentes herdam. Isso já é o que `xai.css` e `overclock.css` fazem; a proposta é formalizar e documentar a regra.

### 4.4 Contraste e acessibilidade

WCAG 2.2 estabelece [[a11yflow](https://www.a11yflow.dev/blog/color-contrast-wcag-developer-guide)] [[WebAIM](https://webaim.org/resources/contrastchecker/)]:

| Contexto | AA | AAA |
|---|---|---|
| Texto normal | 4.5:1 | 7:1 |
| Texto grande (≥18.66 px) | 3:1 | 4.5:1 |
| Elementos de UI e gráficos | 3:1 | — |

Para o tema x.ai, verificando os valores propostos:

- `--oc-text-1` `#f7f7f8` sobre `--oc-bg` `#000000` → contraste **~20.5:1** (AAA).
- `--oc-text-2` `rgba(255,255,255,0.64)` sobre `#000000` → contraste **~8.5:1** (AAA normal, AA).
- `--oc-text-3` `rgba(255,255,255,0.42)` sobre `#000000` → contraste **~4.2:1** (AA grande, falha AA normal).

Isso é aceitável: `--oc-text-3` deve ser usado apenas para metadados grandes ou elementos não essenciais; nunca para corpo de leitura.

### 4.5 Proposta de cores para Overclock

#### Tema `xai` (referência / direção futura)

```css
/* primitivos */
--oc-black-rgb: 0 0 0;
--oc-white-rgb: 255 255 255;
--oc-accent-rgb: 255 255 255;   /* branco = acento funcional */
--oc-ok-rgb:    96 200 134;     /* #60c886, saturação reduzida */
--oc-danger-rgb: 228 133 133;   /* #e48585, saturação reduzida */

/* superfícies */
--oc-bg:        rgb(var(--oc-black-rgb));        /* #000000 */
--oc-surface:   #0a0a0b;
--oc-surface-2: #111113;
--oc-surface-3: #17171a;
--oc-surface-hover: rgb(var(--oc-white-rgb) / 0.06);

/* texto */
--oc-text-1: #f7f7f8;
--oc-text-2: rgb(var(--oc-white-rgb) / 0.64);
--oc-text-3: rgb(var(--oc-white-rgb) / 0.42);
--oc-text-4: rgb(var(--oc-white-rgb) / 0.28);   /* opcional: disabled/placeholder */

/* bordas */
--oc-border:        rgb(var(--oc-white-rgb) / 0.08);
--oc-border-hover:  rgb(var(--oc-white-rgb) / 0.16);
--oc-border-strong: rgb(var(--oc-white-rgb) / 0.16);
--oc-divider:       rgb(var(--oc-white-rgb) / 0.05);

/* acento */
--oc-accent:          #ffffff;
--oc-accent-contrast: #000000;
```

#### Tema `overclock` (produto IDE)

Mantém o vermelho como acente (já extraído do app), mas a rampa de cinza deve seguir a mesma lógica de luminância:

```css
--oc-accent-rgb: 239 68 68;     /* red-500 */
--oc-text-1: #ededed;
--oc-text-2: #9ca3af;
--oc-text-3: #6b7280;
--oc-border: #1f2937;
--oc-border-hover: #4b5563;
```

A diferença entre `xai` e `overclock` não deve ser a *arquitetura*, apenas os primitivos de acento e a temperatura dos cinzas.

---

## 5. Tokens

### 5.1 Arquitetura de referência: três camadas

A indústria convergiu para uma taxonomia de três camadas [[Contentful](https://www.contentful.com/blog/design-token-system/)] [[RNO1](https://rno1.global/blog/design-tokens-guide/)] [[Design Systems 2026](https://www.digitalapplied.com/blog/design-systems-2026-scale-ui-without-the-chaos-methodology)]:

| Camada | Nome | Função | Exemplo |
|---|---|---|---|
| **1** | Primitivos / Global / Option | Valores brutos, sem contexto | `--color-gray-500: #6b7280` |
| **2** | Semânticos / Alias / Decision | Significado e contexto | `--color-text-secondary: var(--color-gray-500)` |
| **3** | Componente | Decisões específicas de um componente | `--button-bg: var(--color-surface-secondary)` |

Por que três camadas:

- **Primitivos** permitem troca de marca sem tocar em componentes.
- **Semânticos** são o contrato real da interface: `text-primary`, `surface-elevated`, `border-subtle`.
- **Componentes** isolam exceções e permitem override local sem quebrar o sistema.

### 5.2 O que cada referência faz

- **Radix Colors:** escala de 12 passos por cor, com papéis fixos (1–2 fundo, 3–5 componente, 6–8 borda, 9–10 sólido, 11–12 texto). Usado por shadcn/ui e muitos sistemas modernos [[Radix](https://www.radix-ui.com/colors/docs/palette-composition/scales)].
- **Vercel Geist:** tokens compactos, nomes semânticos (`--geist-foreground`, `--geist-background`), poucos primitivos, alta consistência [[SeedFlip](https://seedflip.co/blog/vercel-design-system)].
- **Style Dictionary:** ferramenta de transformação que recebe JSON no formato W3C DTCG e exporta CSS, iOS, Android, etc. [[LogRocket](https://blog.logrocket.com/design-foundational-reusable-components-style-dictionary/)]
- **Tokens Studio + Figma Variables:** fonte de verdade no design; JSON exportado alimenta Style Dictionary.

### 5.3 Evolução do `--oc-*` atual

Os arquivos atuais (`apps/web/src/styles/themes/nebula.css`, `xai.css`, `overclock.css`) já seguem uma boa arquitetura: primitivos RGB no topo, semânticos de superfície/texto/borda no meio, tokens de componente embaixo. O que falta documentar e talvez formalizar:

1. **Separar primitivos puros de semânticos:** hoje `--oc-surface-2` é ao mesmo tempo um semântico e carrega `rgb(var(--oc-surface-2-rgb) / 0.72)`. A camada primitiva deveria ser apenas `--oc-surface-2-rgb: 16 18 22`; a camada semântica deveria ser `--oc-surface-2: rgb(var(--oc-surface-2-rgb) / 0.72)`.
2. **Documentar regras de uso:** quais tokens podem ser referenciados por componentes? Hoje a regra é implícita.
3. **Adicionar tokens faltantes na escala tipográfica:** `--oc-text-body`, `--oc-text-label`, `--oc-text-data` já estão em [`decisions.md`](../system/decisions.md) D1, mas ainda não são usados consistentemente.
4. **Considerar o formato W3C DTCG:** preparar um `tokens.json` ou `tokens/` para eventual integração com Style Dictionary/Tokens Studio.

### 5.4 Proposta de estrutura de tokens para v2

```
tokens/
├── primitives/
│   ├── color.json        /* white/black/accent/ok/danger RGB */
│   ├── font.json         /* stacks, weights, tracking, leading */
│   ├── space.json        /* 4/8/12/16/24/32/48 */
│   ├── radius.json       /* 0/4/8/12/999 */
│   ├── shadow.json       /* raw shadow definitions */
│   └── motion.json       /* durations, easings */
├── semantic/
│   ├── color.json        /* bg/surface/text/border/accent/status */
│   ├── type.json         /* text-*, font-* */
│   ├── space.json        /* aliases semânticos quando necessário */
│   └── depth.json        /* glass, shadow, z-index */
└── component/
    ├── button.json
    ├── control.json
    ├── card.json
    ├── input.json
    └── popover.json
```

Saída via Style Dictionary:

```
build/
├── web/
│   ├── tokens.css        /* custom properties --oc-* */
│   └── tokens.ts         /* constantes tipadas */
├── ios/...
└── android/...
```

Regras de governança:

- **Nenhum literal em componente:** hex/rgba só nos primitivos.
- **Componente referencia semântico:** `--button-bg: var(--oc-surface-3)`, nunca `--button-bg: var(--oc-surface-3-rgb)`.
- **Semântico referencia primitivo:** `--oc-surface-3: rgb(var(--oc-surface-3-rgb))`.
- **Temas redefinem apenas primitivos e alguns semânticos diretos:** nunca tokens de componente.

---

## 6. Glass e profundidade

### 6.1 Quando vidro é ferramenta vs decoração

A doutrina do Overclock é explícita: "blur is an optical tool for panels that float over content, not the personality of the product" [[ux-v2.md](../ux-v2.md)]. Isso alinha-se às diretrizes da Apple para materiais: materiais criam "sense of depth, layering, and hierarchy between foreground and background elements" [[Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)].

| Uso correto (ferramenta) | Uso errado (decoração) |
|---|---|
| Modal flutuando sobre board | Card com blur só para "ficar bonito" |
| Barra de navegação sobre conteúdo scrollável | Fundo de página com blur |
| Popover/menu sobre camada inferior | Botão com vidro sem necessidade |
| Painel de filtros suspensa | Toda a UI com glass por padrão |

Princípio: **se o painel não flutua sobre outro conteúdo, ele não precisa de blur.** O tema x.ai leva isso ao extremo: `--oc-glass-blur: 0px` em todos os lugares.

### 6.2 Specs técnicos reais

A receita de glass no CSS é bem estabelecida [[Superdesign.dev](https://superdesign.dev/styles/glassmorphism)]:

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px) saturate(150%);
  -webkit-backdrop-filter: blur(12px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

Para o Overclock, a receita deve ser adaptada para fundos escuros:

```css
.glass-dark {
  background: rgb(var(--oc-surface-2-rgb) / 0.72);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--oc-border);
  box-shadow: var(--oc-shadow-panel);
}
```

Regras de layering:

1. **O glass precisa de um stacking context:** `position: relative` ou `transform`/`will-change`.
2. **`backdrop-filter` só funciona com área visível:** o elemento precisa de dimensão; filhos com `overflow: hidden` podem cortar o blur.
3. **Fallback obrigatório:** `@supports not (backdrop-filter: blur(1px))` → cor sólida `--oc-surface-3`.
4. **Z-index como escada nomeada:** usar os tokens `--oc-z-*` já definidos; nunca `+1` no componente [[ux-v2.md](../ux-v2.md) §2].

### 6.3 Performance e cuidados com Chrome

`backdrop-filter` é GPU-compositado, mas tem custos reais [[Digital Thrive](https://digitalthriveai.com/en-us/resources/web-design/using-css-backdrop-filter-for-ui-effects/)] [[Codefronts](https://codefronts.com/components/css-glassmorphism-cards/)]:

- **Raio do blur afeta performance:** valores menores (8–12 px) são mais baratos que 30 px+.
- **Área afetada importa:** quanto mais pixels, mais lento.
- **Animar `backdrop-filter` diretamente é caro:** prefira animar `opacity`/`transform` de um wrapper pai.
- **INP (Interaction to Next Paint):** mudanças de blur em hover podem empurrar INP acima de 200 ms em Androids de médio porte.
- **Problemas específicos do Chrome:** o Chrome às vezes renderiza `backdrop-filter` de forma instável quando o elemento está dentro de um stacking context complexo ou quando há múltiplos níveis de blur aninhados. O Overclock já foi "mordido" por isso (referência do briefing).

Mitigações para o Overclock:

1. **Blur padrão de 12–18 px:** suficiente para o efeito, não excessivo.
2. **Nunca animar o valor do blur:** animar `opacity` do painel ou `transform` de escala.
3. **Limitar o número de camadas de glass:** se uma barra já tem glass, o menu dentro dela pode ser sólido.
4. **Testar em Chrome/Edge Windows e Android:** principalmente com muitos cards no board.
5. **Modo `prefers-reduced-motion`:** desabilitar glass ou substituir por sólido.

### 6.4 Proposta de tokens de glass/profundidade

```css
/* camadas de superfície */
--oc-surface: transparent;          /* colunas no canvas */
--oc-surface-2: rgb(var(--oc-surface-2-rgb) / 0.72);  /* cards com glass */
--oc-surface-3: rgb(var(--oc-surface-3-rgb));         /* hover/popover sólido */

/* glass */
--oc-glass-bg:        var(--oc-surface-2);
--oc-glass-border:    var(--oc-border);
--oc-glass-highlight: inset 0 1px 0 rgb(var(--oc-white-rgb) / 0.06);
--oc-glass-blur:      18px;   /* nebula */
                       0px;    /* xai — sem glass */
                       12px;   /* overclock */

/* sombras */
--oc-shadow-panel:      0 8px 32px rgb(var(--oc-black-rgb) / 0.5), var(--oc-glass-highlight);
--oc-shadow-card-hover: 0 12px 40px rgb(var(--oc-black-rgb) / 0.55), var(--oc-glass-highlight);
--oc-shadow-modal:      0 24px 60px -10px rgb(var(--oc-black-rgb) / 0.7);

/* z-index */
--oc-z-atmo-back:   -3;
--oc-z-atmo-mid:    -2;
--oc-z-atmo-front:  -1;
--oc-z-content:      2;
--oc-z-fade:         5;
--oc-z-bar:         10;
--oc-z-panel:       20;
--oc-z-backdrop:    25;
--oc-z-chrome:      30;
--oc-z-menu:        40;
--oc-z-modal:       50;
--oc-z-sheet:       60;
--oc-z-toast:       70;   /* proposto em decisions.md D7 */
```

---

## 7. Espaço, raio, grid e sombra

### 7.1 Espaço

A unidade base do Overclock é **4 px**. A escala atual (4/8/12/16/24/32) é sólida; a proposta é adicionar 48 px para "section air" e manter 2 px para micro-ajustes quando necessário.

| Token | Valor | Uso |
|---|---|---|
| `--oc-space-0` | 0 | colapso |
| `--oc-space-1` | 4 px | micro gap, ícone + label |
| `--oc-space-2` | 8 px | inline gap, padding vertical compacto |
| `--oc-space-3` | 12 px | padding de control, gap de barra |
| `--oc-space-4` | 16 px | padding de card pequeno, gap de coluna |
| `--oc-space-5` | 24 px | padding de card/modal |
| `--oc-space-6` | 32 px | section padding, gutter |
| `--oc-space-7` | 48 px | section air, hero padding |

> Nota: a numeração atual (`--oc-space-1..8` com 4/8/12/16/24/32/48) já funciona; a proposta é apenas documentar a escala completa.

### 7.2 Raio

Raios nomeados por função, não por número. A doutrina já decidiu: controles 8 px, painéis 12 px, pills morrem (exceto status dot). Proposta:

| Token | Valor | Uso |
|---|---|---|
| `--oc-radius-none` | 0 | full-bleed, bandas |
| `--oc-radius-sm` | 4 px | tags pequenas, ticks |
| `--oc-radius-control` | 8 px | botões, inputs, chips |
| `--oc-radius-card` | 12 px | cards, tiles |
| `--oc-radius-panel` | 12–16 px | modais, popovers, sheets |
| `--oc-radius-pill` | 999 px | casos excepcionais (conta, badges de status) |
| `--oc-radius-circle` | 50% | avatares, dots |

### 7.3 Grid

O PilotDeck é um board denso; o grid precisa ser flexível o suficiente para colunas variáveis. Referências:

- **Linear:** colunas com scroll snap, gutters 24 px, grupos separados por 48 px.
- **x.ai:** content band centrado em ~1200 px; grids 2-up no desktop.
- **Vercel:** container fluido com max-widths por tipo de página.

Proposta para Overclock:

```css
--oc-grid-page-max: 1320px;    /* páginas de dados */
--oc-grid-form-max: 720px;     /* formulários */
--oc-grid-reading-max: 560px;  /* textos longos */
--oc-grid-gutter: 24px;
--oc-grid-gutter-wide: 48px;   /* separação de grupos no board */
```

### 7.4 Sombra

Sombras no dark mode precisam ser *escuras* (mais opacas) para criar elevação, já que não há luz branca por trás. Valores propostos:

```css
--oc-shadow-sm:   0 1px 2px rgb(var(--oc-black-rgb) / 0.4);
--oc-shadow-md:   0 4px 12px rgb(var(--oc-black-rgb) / 0.5);
--oc-shadow-panel: 0 8px 32px rgb(var(--oc-black-rgb) / 0.5);
--oc-shadow-lg:   0 16px 48px rgb(var(--oc-black-rgb) / 0.6);
```

Regra: **sombra só onde o elemento flutua.** Cards no board não precisam de sombra em repouso; hover pode ter uma sombra sutil ou apenas mudança de borda/superfície.

### 7.5 Proposta de tokens de espaço/raio/grid/sombra

```css
/* espaço */
--oc-space-0: 0;
--oc-space-1: 4px;
--oc-space-2: 8px;
--oc-space-3: 12px;
--oc-space-4: 16px;
--oc-space-5: 24px;
--oc-space-6: 32px;
--oc-space-7: 48px;

/* raios */
--oc-radius-none: 0;
--oc-radius-sm: 4px;
--oc-radius-control: 8px;
--oc-radius-card: 12px;
--oc-radius-panel: 12px;
--oc-radius-pill: 999px;
--oc-radius-circle: 50%;

/* grid */
--oc-grid-page-max: 1320px;
--oc-grid-form-max: 720px;
--oc-grid-reading-max: 560px;
--oc-grid-gutter: 24px;
--oc-grid-gutter-wide: 48px;

/* sombras */
--oc-shadow-sm: 0 1px 2px rgb(var(--oc-black-rgb) / 0.4);
--oc-shadow-md: 0 4px 12px rgb(var(--oc-black-rgb) / 0.5);
--oc-shadow-panel: 0 8px 32px rgb(var(--oc-black-rgb) / 0.5);
--oc-shadow-lg: 0 16px 48px rgb(var(--oc-black-rgb) / 0.6);
```

---

## 8. Checklist: o que o design system TEM que ter

Estes são os fundamentos que o design system v2 deve implementar para ser considerado completo:

### Tipografia
- [ ] Duas faces: sans para UI (`--oc-font-ui`), mono para dados (`--oc-font-data`).
- [ ] Rampa tipográfica tokenizada: `--oc-text-hero/display/title/body/label/data`.
- [ ] Apenas 3 pesos: 400/500/600.
- [ ] Tracking negativo em display (`-0.02em`), levemente positivo em mono caps (`0.06em`).
- [ ] `font-variant-numeric: tabular-nums` em colunas numéricas.

### Cor
- [ ] Canvas near-black (`#000` ou `#0a0a0b`).
- [ ] Rampa de cinza por luminância: 4+ passos de superfície + 3+ passos de texto.
- [ ] Um único acento funcional por tema (`--oc-accent`).
- [ ] Cores semânticas restritas: `--oc-ok` e `--oc-danger` apenas em status, erros e ações destrutivas.
- [ ] Contrastes verificados: texto normal ≥4.5:1, texto grande e UI ≥3:1.

### Tokens
- [ ] Arquitetura de 3 camadas documentada: primitivos → semânticos → componente.
- [ ] Nenhum literal (hex/rgba) em regras de componente; apenas tokens.
- [ ] Temas (`nebula`, `xai`, `overclock`) redefinem apenas primitivos.
- [ ] Caminho para W3C DTCG + Style Dictionary documentado.

### Glass / Profundidade
- [ ] Glass é ferramenta, não decoração: só em painéis flutuantes.
- [ ] Tokens `--oc-glass-bg`, `--oc-glass-border`, `--oc-glass-blur`, `--oc-shadow-panel`.
- [ ] Fallback sólido para browsers sem `backdrop-filter`.
- [ ] Regras de performance: não animar blur, limitar área, testar no Chrome/Windows/Android.
- [ ] Escada de z-index nomeada (`--oc-z-*`); nenhum `+1` nos componentes.

### Espaço / Raio / Grid / Sombra
- [ ] Escala de espaço baseada em 4 px: 0/4/8/12/16/24/32/48.
- [ ] Raios nomeados por função: control 8 px, card/panel 12 px.
- [ ] Containers nomeados por tipo de página.
- [ ] Sombras só em elementos flutuantes; cards no board não têm sombra em repouso.

---

## 9. Fontes verificáveis

### Tipografia
- Linear design system analysis (Refero Styles): https://styles.refero.design/style/90ce5883-bb24-4466-93f7-801cd617b1d1
- Linear DESIGN.md (CSS DNA): https://cssdna.com/blog/design-md-for-ai-coding-agents/
- Vercel design system breakdown (SeedFlip): https://seedflip.co/blog/vercel-design-system
- Vercel Geist DESIGN.md (designmd.app): https://designmd.app/brands/vercel
- Vercel Geist three-weight rule (GitHub design-bites): https://github.com/educlopez/design-bites/blob/main/design-mds/vercel.com/DESIGN.md
- Geist font package (npm): https://www.npmjs.com/package/geist
- xAI DESIGN.md (VoltAgent): https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/x.ai/DESIGN.md
- Modular type scale guide (Art of Styleframe): https://artofstyleframe.com/blog/type-scale-systems-modular-scale/
- Typescale.com: https://typescale.com/

### Cor
- Radix Colors — Understanding the Scale: https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale
- Radix Colors — Composing a palette: https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette
- Radix color scales: https://www.radix-ui.com/colors/docs/palette-composition/scales

### Tokens
- Design tokens explained (Contentful): https://www.contentful.com/blog/design-token-system/
- Design Tokens — three-layer framework (RNO1): https://rno1.global/blog/design-tokens-guide/
- Style Dictionary + foundational components (LogRocket): https://blog.logrocket.com/design-foundational-reusable-components-style-dictionary/
- Design Systems 2026 methodology: https://www.digitalapplied.com/blog/design-systems-2026-scale-ui-without-the-chaos-methodology
- W3C Design Tokens Community Group / DTCG format (mencionado em várias fontes acima; especificação pública via design tokens community).

### Acessibilidade
- WCAG 2.2 contrast guide (a11yflow): https://www.a11yflow.dev/blog/color-contrast-wcag-developer-guide
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

### Glass / Profundidade
- Apple HIG — Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- CSS Backdrop Filter guide (Digital Thrive): https://digitalthriveai.com/en-us/resources/web-design/using-css-backdrop-filter-for-ui-effects/
- Glassmorphism CSS recipe (Superdesign.dev): https://superdesign.dev/styles/glassmorphism
- Backdrop-filter performance (Codefronts): https://codefronts.com/components/css-glassmorphism-cards/

---

## 10. Notas de escopo e limitações

- Esta pesquisa **não** produz código de produto; ela alimenta as specs do design system v2.
- **Não** cobre motion — essa é outra frente.
- **Não** cobre coleta de referências visuais — outra frente.
- Os valores propostos devem ser validados em protótipo renderizável antes de virarem tokens definitivos.
- A decisão final sobre acento (branco x.ai vs vermelho overclock vs azul nebula) pertence ao tema, não ao fundamento: a arquitetura deve suportar qualquer acento.
