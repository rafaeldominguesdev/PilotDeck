#!/usr/bin/env python3
"""OCL-62 — builds index.html, the page the owner opens to pick a direction.

The SVGs are inlined (not <img>) so `currentColor` resolves: every test strip on
this page is the same file, recoloured by its container. That is the whole point
of a monochrome mark, and the page proves it rather than claiming it.
"""

import glob
import html
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARKS = {os.path.basename(f)[:-4]: open(f).read()
         for f in glob.glob(os.path.join(ROOT, "svg", "*.svg"))}


def mark(name, height, extra=""):
    """Inline a mark scaled to a rendered height in px (width follows the ratio)."""
    svg = MARKS[name]
    svg = svg.replace("<svg ", f'<svg style="height:{height}px;width:auto;{extra}" ', 1)
    return svg


VARIANTS = [
    dict(
        id="01", slug="01-grotesque-solid",
        name="Grotesca fechada",
        arch="Wordmark",
        type="Helvetica Neue Medium, caixa baixa, tracking −12/1000 em",
        symbol="Nenhum. Um único corte custom: o pingo redondo do <code>i</code> vira um "
               "quadrado de uma haste de largura, apoiado meia haste acima da altura-x.",
        fallback="08 · ligatura oc",
        detail="O nome fechado até o limite em que as contraformas ainda respiram. Nada é "
               "desenhado: a marca é uma decisão de espacejamento e um quadrado. Esse quadrado "
               "é a única coisa no wordmark que não é letra — é o ponto de status do board, "
               "promovido para dentro do nome.",
        signals=["Instrumento, não startup. O registro de um painel de controle suíço.",
                 "Neutra o bastante pra sobreviver a dez anos de mudança de interface.",
                 "Tipografia <em>é</em> a identidade — literalmente não existe mais nada."],
        rejects=["Não é logo desenhado. Não há símbolo pra explicar.",
                 "Não é simpática nem otimista; a grotesca se recusa a ter tom.",
                 "Rejeita de saída o registro geométrico-de-startup."],
        small="fails",
        small_note="A 16px o nome tem 88px de largura e some. Cai pro fallback.",
    ),
    dict(
        id="02", slug="02-geometric-open",
        name="Geométrica aberta",
        arch="Wordmark",
        type="Avenir Next Demi Bold, caixa baixa, tracking +24/1000 em",
        symbol="Nenhum.",
        fallback="08 · ligatura oc",
        detail="A aposta inversa da 01: letra geométrica pesada com ar empurrado entre as "
               "letras. Os círculos de <code>o c c</code> fazem o trabalho — três bojos quase "
               "perfeitos numa palavra de nove letras. O peso (Demi Bold) é o que mantém a "
               "variante longe do monoline fininho reprovado na rodada passada.",
        signals=["Produto, confiante, legível do outro lado da sala.",
                 "Tracking aberto lê como calma — a marca não está com pressa.",
                 "Calor sem serifa e sem cor."],
        rejects=["Não é técnica. Não sinaliza maquinário.",
                 "Não é o monoline de 2024: o peso é deliberadamente substancial.",
                 "Rejeita aperto como traço de personalidade."],
        small="fails",
        small_note="A mais larga do conjunto. 16px não é páreo — cai pro fallback.",
    ),
    dict(
        id="03", slug="03-technical-din",
        name="Técnica / industrial",
        arch="Wordmark",
        type="DIN Alternate Bold, caixa baixa, tracking +8/1000 em",
        symbol="Nenhum.",
        fallback="09 · placa oc",
        detail="DIN é a letra das placas de estrada e dos painéis de máquina alemães — bojos "
               "de lado reto, terminações quadradas, engenharia em vez de desenho. É o único "
               "registro do conjunto que diz a palavra <em>overclock</em> em voz alta sem "
               "desenhar nada.",
        signals=["Máquina, painel, vazão. A semântica da marca-mãe, carregada pela letra.",
                 "Lê como equipamento medido, não como marketing de software.",
                 "Casa nativamente com a voz de dados que o board já usa."],
        rejects=["Não é neutra — DIN tem sotaque, e o sotaque é industrial.",
                 "Não é acolhedora. Nada aqui é convidativo, de propósito.",
                 "Rejeita o registro humanista por completo."],
        small="fails",
        small_note="Os lados retos escalam melhor que a média, mas 16px ainda pede a 09.",
    ),
    dict(
        id="04", slug="04-weight-split",
        name="Quebra por peso — over | click",
        arch="Wordmark, dois pesos",
        type="SF Pro Regular (400) em <code>over</code>, SF Pro Bold (760) em <code>click</code>, "
             "tracking −6/1000 em",
        symbol="Nenhum.",
        fallback="08 · ligatura oc",
        detail="A hierarquia dentro do nome, carregada por <strong>peso em vez de alpha</strong>. "
               "A rodada passada separou <code>over</code>/<code>click</code> com opacidade 0.55, "
               "que é uma segunda cor disfarçada: morre em impressão de uma cor, em bordado e "
               "embaixo de um hot stamp. Peso sobrevive aos três — e sobrevive a qualquer tema "
               "sem precisar de token.",
        signals=["O verbo é a carga útil: você vem aqui pra <em>clicar</em>.",
                 "Uma família, dois pesos — exatamente a regra de hierarquia da doutrina.",
                 "Nativa da fonte de sistema; nunca vai parecer colada por cima do SO."],
        rejects=["Não é lockup de duas cores. Não tem alpha e não tem segunda tinta.",
                 "Não é desenho custom — é uma decisão de composição, sustentada.",
                 "Rejeita a ideia de que a quebra precisa de símbolo pra ser lida."],
        small="fails",
        small_note="O contraste de peso colapsa abaixo de ~40px de altura. Cai pro fallback.",
    ),
    dict(
        id="05", slug="05-ck-ligature",
        name="Ligatura ck",
        arch="Wordmark, um caractere custom",
        type="Futura Medium, caixa baixa, tracking +6/1000 em; <code>c</code> e <code>k</code> "
             "amarrados a −0,50 haste",
        symbol="Nenhum. A ligatura <em>é</em> o caractere distintivo.",
        fallback="08 · ligatura oc",
        detail="Um nó só, num wordmark que fora isso é liso: a haste do <code>k</code> encosta "
               "na terminação do <code>c</code> e as duas letras passam a dividir uma aresta. "
               "É a regra da arquitetura wordmark-puro — conquistar distinção com <em>um</em> "
               "caractere custom, não com nove. O valor da amarração foi escolhido no olho: a "
               "−0,70 a haste já invade o bojo e a palavra embola.",
        signals=["Ofício. Alguém sentou com essa palavra em vez de só digitar.",
                 "O nó cai na sílaba tônica — cl<strong>ick</strong>.",
                 "Os círculos da Futura mantêm o geométrico sem cair no fio de cabelo."],
        rejects=["Não é decorada. Exatamente uma coisa é custom.",
                 "Não é script nem floreio — a amarração é estrutural.",
                 "Rejeita simetria: o wordmark tem um ponto quente de propósito."],
        small="fails",
        small_note="A amarração é a primeira coisa que fecha ao reduzir. Cai pro fallback.",
    ),
    dict(
        id="06", slug="06-vcheck-inline",
        name="v-check, dentro da palavra",
        arch="Letterform-as-symbol, dentro do wordmark",
        type="Helvetica Neue Medium, tracking −12/1000 em; o <code>v</code> é desenhado, "
             "não composto",
        symbol="Derivado de letra. O <code>v</code> de <em>over</em> é redesenhado como um "
               "check: braço curto caindo de 0,86 da altura-x, braço longo subindo além da "
               "altura-x até a linha de ascendente. Espessura do traço = a haste da fonte.",
        fallback="o próprio check (<code>06-vcheck-inline-symbol.svg</code>)",
        detail="A única ideia do conjunto que é <em>sobre o produto</em>. O único ato "
               "irreversível do board é um humano validando um card; o glifo disso é um check. "
               "A palavra já contém um — <em>o·v·er</em> — então o símbolo não precisa ser "
               "adicionado, só revelado. E o braço longo passando da altura-x até o ascendente "
               "é o <em>over</em> de pilotdeck feito em geometria, não em metáfora.",
        signals=["Validado. Aprovado por humano. O verbo do board, dentro do nome do board.",
                 "Leitura dupla: é um check, e continua sendo a letra v.",
                 "O favicon sai de graça — o check sozinho aguenta 16px."],
        rejects=["Não é anel e não é alvo — a direção reprovada não se repete.",
                 "Não é símbolo parafusado: nada fica ao lado da palavra.",
                 "Rejeita o clichê do cursor/ponteiro pra representar <em>click</em>."],
        small="passes",
        small_note="O check sozinho é a marca de 16px e lê limpo.",
    ),
    dict(
        id="07", slug="07-vcheck-lockup",
        name="v-check em lockup",
        arch="Lockup (símbolo + wordmark), com alternativa empilhada",
        type="Avenir Next Medium, tracking +4/1000 em; traço do símbolo a 1,15 haste",
        symbol="O mesmo check, promovido pra fora da palavra e posto à esquerda, na altura do "
               "ascendente. Espaço livre entre símbolo e wordmark = uma altura-x; na empilhada, "
               "0,6 altura-x acima da palavra, centrado opticamente.",
        fallback="o check sozinho; alternativa empilhada pros contextos quadrados",
        detail="A mesma ideia da 06, feita como outra pergunta de arquitetura: o símbolo mora "
               "<em>dentro</em> da palavra ou <em>ao lado</em> dela? Ao lado te dá um ativo de "
               "verdade — uma marca que aparece sem o nome, num patch, num avatar, num estado "
               "de carregamento, num selo de card. Dentro mantém a identidade indivisível. "
               "A escolha é o trade, não o desenho.",
        signals=["Uma marca com símbolo, que é o que merch, avatar e ícone de app querem.",
                 "Lê a distância de sinalização; o check chega antes da palavra.",
                 "A alternativa empilhada torna os contextos quadrados triviais."],
        rejects=["Não é indivisível — aceita que palavra e marca viajem separadas.",
                 "Não é redução geométrica: o símbolo significa uma coisa específica.",
                 "Rejeita o anel/alvo da rodada reprovada."],
        small="passes",
        small_note="Símbolo sozinho a 16px é a marca pequena mais forte do conjunto.",
        extras=[("07-vcheck-lockup-stacked", "Alternativa empilhada", 64)],
    ),
    dict(
        id="08", slug="08-oc-ligature",
        name="Ligatura oc",
        arch="Monograma",
        type="Helvetica Neue Bold; <code>o</code> e <code>c</code> amarrados a −0,80 haste",
        symbol="Monograma. O <code>c</code> é puxado pra dentro do <code>o</code> até os "
               "contornos fundirem numa forma preenchida só, com duas contraformas. União por "
               "nonzero — uma forma, não duas letras se encostando.",
        fallback="não precisa; esta <em>é</em> a marca pequena de 01, 02, 04 e 05",
        detail="O cavalo de batalha dos contextos quadrados. <code>oc</code> é "
               "<em>pilotdeck</em> e é também <em>Overclock</em> — o monograma é o único lugar "
               "onde a relação de família entre o board e a IDE pode ser dita sem ser escrita. "
               "Peso alto e contorno fundido mantêm a marca longe do anel concêntrico fino que "
               "foi reprovado: isto é massa sólida com contraformas recortadas dela. "
               "A amarração foi escolhida no olho a 16px — a −1,1 a contraforma do "
               "<code>c</code> fecha e vira borrão.",
        signals=["Família. O board pertence ao Overclock e a marca assume isso.",
                 "Massa em tamanho pequeno — a única coisa que um tile de 16px precisa.",
                 "Nativa em quadrado: avatar, ícone, favicon, patch, sem adaptação."],
        rejects=["Não é um anel com ponto dentro. Nada é concêntrico e nada é alvo.",
                 "Não é decorativa — sem moldura, sem escudo, sem círculo em volta.",
                 "Rejeita ser a marca primária sozinha; ela serve um wordmark."],
        small="passes",
        small_note="Construída pra 16px. É a resposta de tamanho pequeno das variantes wordmark-puro.",
        extras=[("08-oc-ligature-lockup", "Como lockup, com o wordmark da 01", 40)],
    ),
    dict(
        id="09", slug="09-oc-plate",
        name="Placa oc reversa",
        arch="Monograma, vazado num campo",
        type="DIN Alternate Bold, <code>oc</code> a 44% da placa, tracking +12/1000 em, "
             "centrado opticamente; raio do campo a 16% do lado",
        symbol="Monograma, negativo. Um path só: um campo quadrado arredondado com as duas "
               "letras <em>vazadas</em> dele (<code>fill-rule=\"evenodd\"</code>, então a "
               "contraforma do <code>o</code> continua cheia). Continua uma tinta só e continua "
               "<code>currentColor</code> — o segundo valor é o fundo aparecendo, não uma "
               "segunda cor.",
        fallback="não precisa; esta <em>é</em> a marca pequena da 03",
        detail="Esta variante foi construída duas vezes. A primeira empilhava o <code>o</code> "
               "sobre o <code>c</code> e foi morta pelo próprio teste de 16px: duas letras de "
               "caixa baixa numa pilha 1:2 perdem identidade de letra abaixo de uns 28px. "
               "Vazá-las de um campo sólido joga a massa pra fora, que é exatamente onde um "
               "tile pequeno precisa gastar pixel — e transforma o monograma naquilo que a DIN "
               "sempre apontou: <strong>uma placa</strong>, a etiqueta parafusada na frente de "
               "um instrumento.",
        signals=["Equipamento. Um registro de placa de série que ninguém na categoria usa.",
                 "A marca pequena mais forte daqui — ainda lê <em>oc</em> a 16px.",
                 "Quadrada e ícone-de-app por construção: o tile faz parte do desenho."],
        rejects=["Não é a construção empilhada que foi testada e falhou; aquela morreu.",
                 "Não é monograma de espaço positivo — a 08 já ocupa esse lugar.",
                 "Rejeita suavidade por completo; os lados retos da DIN são o ponto."],
        small="passes",
        small_note="A melhor do conjunto a 16px: o campo carrega e as contraformas fazem a leitura.",
        extras=[("09-oc-plate-lockup", "Como lockup, com o wordmark da 03", 44)],
    ),
    dict(
        id="10", slug="10-prompt-mono",
        name="Lockup de prompt, voz de dados",
        arch="Lockup, monoespaçada",
        type="SF Mono Medium (wght 500), <code>&gt;&nbsp;pilotdeck</code> no avanço nativo "
             "da monoespaçada",
        symbol="O caret <code>&gt;</code>, na mesma fonte da palavra — um símbolo que também é "
               "caractere, então o lockup é uma corrida ininterrupta de tipo.",
        fallback="o caret sozinho",
        detail="A dissidente deliberada, incluída pro dono poder rejeitar de propósito em vez "
               "de nunca ter visto. A doutrina rebaixa a monoespaçada de <em>toda a "
               "interface</em> pra <em>voz de dados</em> — ids, contagens, dinheiro, código. "
               "Esta variante pergunta se a <em>marca</em> deve ser o único lugar onde a voz de "
               "dados ainda fala em volume cheio, enquanto a UI em volta migra pra Inter. "
               "O caret é o prompt onde um agente espera.",
        signals=["Executor. Terminal. A coisa que de fato roda o card.",
                 "Legível na hora pro público real: gente que vive dentro de um shell.",
                 "A marca mais larga e horizontal daqui — lockup natural de barra à esquerda."],
        rejects=["Não é corporativa. Nunca vai ler como software de empresa.",
                 "Não é a voz de UI da doutrina — é conscientemente o oposto dela.",
                 "Rejeita a ideia de que a marca precisa combinar com a fonte da interface."],
        small="warn",
        small_note="O caret sozinho aguenta 16px; o lockup inteiro não.",
        risk="Lê como a \u201csopa de terminal\u201d que a doutrina gastou uma página inteira "
             "removendo. Está no conjunto como polo honesto, não como recomendação.",
    ),
]

CSS = """
:root{
  --oc-bg:#000; --oc-surface:#0A0A0B; --oc-surface-2:#111113; --oc-surface-3:#17171A;
  --oc-border:rgba(255,255,255,.08); --oc-border-strong:rgba(255,255,255,.16);
  --oc-text-1:#F7F7F8; --oc-text-2:rgba(255,255,255,.64); --oc-text-3:rgba(255,255,255,.42);
  --oc-accent:#fff; --oc-radius-control:8px; --oc-radius-panel:12px;
  --oc-font-ui:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --oc-font-data:"SF Mono",ui-monospace,Menlo,monospace;
}
*{box-sizing:border-box}
body{margin:0;background:var(--oc-bg);color:var(--oc-text-1);font-family:var(--oc-font-ui);
     font-size:13px;line-height:1.6;-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:48px 32px 96px}
a{color:var(--oc-text-1)}
h1{font-size:22px;font-weight:600;letter-spacing:-.01em;margin:0 0 8px}
h2{font-size:16px;font-weight:600;margin:0}
h3{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;
   color:var(--oc-text-3);margin:0 0 8px}
p{margin:0 0 12px;color:var(--oc-text-2);max-width:72ch}
code{font-family:var(--oc-font-data);font-size:11px;color:var(--oc-text-1)}
em{font-style:normal;color:var(--oc-text-1)}
strong{font-weight:600;color:var(--oc-text-1)}
.lede{border-bottom:1px solid var(--oc-border);padding-bottom:32px;margin-bottom:48px}
.note{border:1px solid var(--oc-border);border-radius:var(--oc-radius-panel);
      padding:16px 20px;margin:24px 0 0;background:var(--oc-surface)}
.note p:last-child{margin:0}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.toc a{display:inline-flex;align-items:center;height:32px;padding:0 12px;gap:6px;
       border:1px solid var(--oc-border);border-radius:var(--oc-radius-control);
       text-decoration:none;color:var(--oc-text-2);font-size:13px;font-weight:500}
.toc a:hover{background:var(--oc-surface-3);border-color:var(--oc-border-strong);color:var(--oc-text-1)}
.toc a b{font-family:var(--oc-font-data);font-size:11px;color:var(--oc-text-3);font-weight:600}
.v{border-top:1px solid var(--oc-border);padding-top:48px;margin-top:48px}
.v-head{display:flex;align-items:baseline;gap:12px;margin-bottom:4px}
.v-head .n{font-family:var(--oc-font-data);font-size:11px;font-weight:600;color:var(--oc-text-3)}
.v-arch{font-size:12px;color:var(--oc-text-3);margin-bottom:24px}
.stage{background:var(--oc-surface-2);border:1px solid var(--oc-border);
       border-radius:var(--oc-radius-panel);padding:48px 32px;display:flex;
       align-items:center;justify-content:center;min-height:180px;color:var(--oc-text-1)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:24px}
@media(max-width:860px){.grid{grid-template-columns:1fr}}
.tests{display:flex;flex-wrap:wrap;gap:12px;margin-top:24px}
.test{border:1px solid var(--oc-border);border-radius:var(--oc-radius-panel);
      overflow:hidden;flex:1 1 200px;min-width:180px}
.test .cap{font-family:var(--oc-font-data);font-size:10px;color:var(--oc-text-3);
           padding:8px 12px;border-bottom:1px solid var(--oc-border);display:flex;
           justify-content:space-between;gap:8px}
.test .body{padding:20px 16px;display:flex;align-items:center;justify-content:center;
            min-height:76px}
.on-dark{background:var(--oc-bg);color:var(--oc-text-1)}
.on-white{background:#fff;color:#000}
.on-white .cap{color:rgba(0,0,0,.5);border-color:rgba(0,0,0,.1)}
.tile{display:flex;gap:16px;align-items:flex-end}
.tile figure{margin:0;text-align:center}
.tile .box{display:flex;align-items:center;justify-content:center;background:#0A0A0B;
           border:1px solid var(--oc-border);border-radius:3px}
.tile figcaption{font-family:var(--oc-font-data);font-size:9px;color:var(--oc-text-3);margin-top:6px}
.topbar{width:100%;height:48px;background:var(--oc-bg);border:1px solid var(--oc-border);
        border-radius:var(--oc-radius-control);display:flex;align-items:center;
        padding:0 16px;gap:16px;overflow:hidden}
.ctl{display:inline-flex;align-items:center;height:32px;padding:0 12px;gap:6px;flex:none;
     border:1px solid var(--oc-border);border-radius:var(--oc-radius-control);
     font-size:13px;font-weight:500;color:var(--oc-text-2)}
.ctl .b{font-family:var(--oc-font-data);font-size:11px;font-weight:600;color:var(--oc-text-1)}
ul{margin:0;padding-left:18px;color:var(--oc-text-2)}
li{margin-bottom:6px}
.badge{font-family:var(--oc-font-data);font-size:10px;font-weight:600;padding:2px 6px;
       border-radius:4px;border:1px solid var(--oc-border);color:var(--oc-text-3)}
.badge.pass{color:#4ADE80;border-color:rgba(74,222,128,.35)}
.badge.fail{color:#F87171;border-color:rgba(248,113,113,.35)}
.badge.warn{color:var(--oc-text-2)}
.risk{border-left:2px solid rgba(248,113,113,.5);padding-left:12px;margin-top:16px;
      color:var(--oc-text-2);font-size:12px}
footer{border-top:1px solid var(--oc-border);margin-top:64px;padding-top:32px;
       color:var(--oc-text-3);font-size:12px}
"""


def tests_block(v):
    slug = v["slug"]
    small_mark = slug + "-symbol"
    if small_mark not in MARKS:
        small_mark = {"01": "08-oc-ligature", "02": "08-oc-ligature", "03": "09-oc-plate",
                      "04": "08-oc-ligature", "05": "08-oc-ligature",
                      "08": "08-oc-ligature", "09": "09-oc-plate"}[v["id"]]
    is_square = "viewBox=\"0 0 " in MARKS[small_mark] and abs(
        float(MARKS[small_mark].split('viewBox="0 0 ')[1].split(" ")[0])
        - float(MARKS[small_mark].split('viewBox="0 0 ')[1].split(" ")[1].split('"')[0])) < 1

    badge = {"passes": ("pass", "16px OK"), "fails": ("fail", "16px pede fallback"),
             "warn": ("warn", "16px parcial")}[v["small"]]

    tiles = ""
    for px in (16, 32, 64):
        side = px if is_square else px
        tiles += (f'<figure><div class="box" style="width:{side}px;height:{side}px">'
                  f'{mark(small_mark, px * 0.72)}</div>'
                  f'<figcaption>{px}px</figcaption></figure>')

    return f"""
    <div class="tests">
      <div class="test on-dark">
        <div class="cap"><span>topbar · 22px · escuro</span><span>≥16px de respiro</span></div>
        <div class="body" style="padding:8px">
          <div class="topbar">{mark(slug, 22)}
            <span class="ctl">Filtros <span class="b">2</span></span>
            <span class="ctl" style="margin-left:auto">Custo <span class="b">US$&nbsp;27,10</span></span>
          </div>
        </div>
      </div>
    </div>
    <div class="tests">
      <div class="test on-dark">
        <div class="cap"><span>favicon / ícone de app</span>
          <span class="badge {badge[0]}">{badge[1]}</span></div>
        <div class="body"><div class="tile">{tiles}</div></div>
      </div>
      <div class="test on-white">
        <div class="cap"><span>uma cor só · preto no branco</span><span>1&nbsp;pol</span></div>
        <div class="body">{mark(slug, 26)}</div>
      </div>
      <div class="test on-dark">
        <div class="cap"><span>reverse · branco no preto</span><span>mesmo arquivo</span></div>
        <div class="body">{mark(slug, 26)}</div>
      </div>
    </div>
    <p style="font-size:12px;color:var(--oc-text-3);margin-top:12px">
      <strong>Comportamento em tamanho pequeno.</strong> {html.escape(v['small_note'])}
      Marca de fallback: {v['fallback']}.</p>
    """


def variant_block(v):
    extras = ""
    for slug, cap, h in v.get("extras", []):
        extras += (f'<div class="test on-dark"><div class="cap"><span>{cap}</span>'
                   f'<span>{slug}.svg</span></div><div class="body">{mark(slug, h)}</div></div>')
    if extras:
        extras = f'<div class="tests">{extras}</div>'
    risk = f'<p class="risk"><strong>Risco conhecido.</strong> {v["risk"]}</p>' if v.get("risk") else ""
    return f"""
  <section class="v" id="v{v['id']}">
    <div class="v-head"><span class="n">{v['id']}</span><h2>{v['name']}</h2></div>
    <div class="v-arch">{v['arch']} · <code>{v['slug']}.svg</code></div>
    <div class="stage">{mark(v['slug'], 92 if v["id"] in ("08", "09") else 46)}</div>
    {extras}
    <div class="grid">
      <div>
        <h3>Tipografia</h3><p>{v['type']}</p>
        <h3>Símbolo</h3><p>{v['symbol']}</p>
      </div>
      <div>
        <h3>A ideia</h3><p>{v['detail']}</p>
      </div>
    </div>
    <div class="grid">
      <div><h3>Sinaliza</h3><ul>{''.join(f'<li>{s}</li>' for s in v['signals'])}</ul></div>
      <div><h3>Rejeita</h3><ul>{''.join(f'<li>{s}</li>' for s in v['rejects'])}</ul></div>
    </div>
    {risk}
    {tests_block(v)}
  </section>"""


def build():
    toc = "".join(
        f'<a href="#v{v["id"]}"><b>{v["id"]}</b> {v["name"]}</a>' for v in VARIANTS
    )
    body = "".join(variant_block(v) for v in VARIANTS)
    doc = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>pilotdeck — 10 variantes de marca (OCL-62)</title>
<style>{CSS}</style></head>
<body><div class="wrap">
  <header class="lede">
    <h1>pilotdeck — 10 variantes de marca</h1>
    <p><strong>OCL-62 · terceira rodada da identidade · material de decisão, não produção.</strong>
       Nada aqui está aplicado ao app. O dono abre esta página, aponta uma variante (ou duas), e
       o card seguinte refina a escolhida e troca topbar + favicon.</p>
    <p>Todas as marcas são <strong>monocromáticas por construção</strong>: os SVGs usam
       <code>currentColor</code> e não carregam nenhum hex. Cada faixa de teste nesta página é
       <em>o mesmo arquivo</em>, recolorido pelo container — é assim que se prova que a marca
       sobrevive a tema, a impressão de uma cor e a reverse.</p>
    <p>As letras são <strong>contornos reais</strong> extraídos das fontes, não
       <code>&lt;text&gt;</code>: os SVGs não dependem de nenhuma fonte instalada.</p>
    <div class="note">
      <h3>O que esta rodada não repete</h3>
      <p>O <a href="../brand.md">OCL-37</a> foi reprovado: monoline geométrico minúsculo com
         anel-alvo (um anel fino com um ponto concêntrico no centro). <strong>Nenhuma variante
         aqui é um anel, um alvo, nem um monoline de traço único.</strong> A hierarquia
         <code>over</code>/<code>click</code> por alpha 0.55 também sai: a variante 04 refaz essa
         mesma hierarquia com <em>peso</em>, que sobrevive a uma cor só, a bordado e a hot stamp
         — alpha não sobrevive.</p>
      <p>Doutrina aplicada (<a href="../ux-v2.md">ux-v2.md</a>): near-black, um acento (branco),
         tipografia como identidade, zero cor decorativa, ≥16px entre o wordmark e o primeiro
         controle. Esta página inteira obedece aos tokens <code>--oc-*</code>.</p>
    </div>
    <div class="note">
      <h3>Como ler</h3>
      <p>São <strong>5 arquiteturas</strong>, não 10 desenhos: wordmark puro (01–03), wordmark com
         um corte custom (04–05), letterform-as-symbol (06–07), monograma (08–09) e lockup na voz
         de dados (10). A pergunta que o dono responde não é "qual desenho é mais bonito" — é
         <strong>qual arquitetura a marca deve ter</strong>. Dentro da escolhida, kerning, peso e
         proporção ainda são ajustáveis no card de refino.</p>
      <p>Wordmark puro não sobrevive a 16px — isso não é defeito, é a razão de existir a
         hierarquia <em>primária + fallback</em>. As variantes 08 e 09 são os fallbacks
         projetados para 01–05; 06 e 07 carregam o próprio.</p>
    </div>
    <div class="toc">{toc}</div>
  </header>
  {body}
  <footer>
    <p>Gerado por <code>docs/design/logo-variants/tools/generate.py</code> +
       <code>preview.py</code> a partir de contornos reais das fontes do sistema.
       Editar geometria no gerador, nunca num SVG de saída.</p>
    <p>Próximo passo: o dono aponta a variante. O card de refino ajusta kerning e proporção,
       congela a hierarquia primária/fallback, e só então troca <code>topbar</code> e
       <code>favicon</code>.</p>
  </footer>
</div></body></html>
"""
    out = os.path.join(ROOT, "index.html")
    with open(out, "w") as fh:
        fh.write(doc)
    print("wrote", out, f"({len(doc)//1024}kb, {len(VARIANTS)} variants)")


if __name__ == "__main__":
    build()
