#!/usr/bin/env python3
"""
OCL-62 — logo variant generator (decision material, not production).

Builds every variant in docs/design/logo-variants/ from real typeface outlines,
so the committed SVGs carry no font dependency: the letters are paths, not <text>.

    python3 -m venv .venv && .venv/bin/pip install fonttools
    .venv/bin/python docs/design/logo-variants/tools/generate.py

Outputs: svg/*.svg (one file per mark) and index.html (the preview the owner opens).
Geometry lives here. Never hand-edit an output.
"""

import os

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_DIR = os.path.join(ROOT, "svg")

SYS = "/System/Library/Fonts"
SUP = SYS + "/Supplemental"

# ---------------------------------------------------------------- font loading

_cache = {}


def face(key):
    """Load a face once. Variable faces are instanced to a static weight."""
    if key in _cache:
        return _cache[key]
    spec = FACES[key]
    font = TTFont(spec["path"], fontNumber=spec.get("index", 0))
    if spec.get("axes"):
        font = instancer.instantiateVariableFont(font, spec["axes"], updateFontNames=False)
    _cache[key] = font
    return font


FACES = {
    # neo-grotesque
    "hn-medium": {"path": f"{SYS}/HelveticaNeue.ttc", "index": 10},
    "hn-bold": {"path": f"{SYS}/HelveticaNeue.ttc", "index": 1},
    # geometric
    "avenir-demi": {"path": f"{SYS}/Avenir Next.ttc", "index": 2},
    "avenir-medium": {"path": f"{SYS}/Avenir Next.ttc", "index": 5},
    "futura-medium": {"path": f"{SUP}/Futura.ttc", "index": 0},
    # technical / industrial
    "din-bold": {"path": f"{SUP}/DIN Alternate Bold.ttf"},
    # system neo-grotesque (variable, instanced)
    "sf-regular": {"path": f"{SYS}/SFNS.ttf", "axes": {"wght": 400, "wdth": 100, "opsz": 28, "GRAD": 400}},
    "sf-bold": {"path": f"{SYS}/SFNS.ttf", "axes": {"wght": 760, "wdth": 100, "opsz": 28, "GRAD": 400}},
    # data voice (variable, instanced)
    "sfmono-medium": {"path": f"{SYS}/SFNSMono.ttf", "axes": {"wght": 500, "YAXS": 500}},
}

EM = 100.0  # every mark is drawn on a 100-unit em, y-up, baseline at y=0


def upm(f):
    return f["head"].unitsPerEm


def contours(fkey, char, k=1.0):
    """Glyph outline as a list of contours, scaled to the 100-unit em, y-up.

    Returned as [(bbox, recording), ...] so a contour can be dropped (the tittle
    of an `i`, for example) before the glyph is drawn.
    """
    f = face(fkey)
    s = EM / upm(f) * k
    gs = f.getGlyphSet()
    name = f.getBestCmap()[ord(char)]
    rec = DecomposingRecordingPen(gs)  # composites become plain contours
    gs[name].draw(TransformPen(rec, (s, 0, 0, s, 0, 0)))
    out, cur = [], []
    for op, args in rec.value:
        if op == "moveTo" and cur:
            out.append(cur)
            cur = []
        cur.append((op, args))
    if cur:
        out.append(cur)
    result = []
    for c in out:
        pts = [p for _, args in c for p in args if isinstance(p, tuple)]
        xs = [p[0] for p in pts] or [0]
        ys = [p[1] for p in pts] or [0]
        result.append(((min(xs), min(ys), max(xs), max(ys)), c))
    return result


def advance(fkey, char, k=1.0):
    f = face(fkey)
    name = f.getBestCmap()[ord(char)]
    return f["hmtx"][name][0] * EM / upm(f) * k


def kern(fkey, a, b):
    f = face(fkey)
    if "kern" not in f:
        return 0.0
    cmap = f.getBestCmap()
    try:
        pair = (cmap[ord(a)], cmap[ord(b)])
    except KeyError:
        return 0.0
    for table in f["kern"].kernTables:
        v = table.kernTable.get(pair)
        if v:
            return v * EM / upm(f)
    return 0.0


def metric(fkey, char, which):
    """A measured value off a real glyph: `stem` from `l`, `x` from `x`, etc."""
    cs = contours(fkey, char)
    xs = [c[0][0] for c in cs] + [c[0][2] for c in cs]
    ys = [c[0][1] for c in cs] + [c[0][3] for c in cs]
    box = (min(xs), min(ys), max(xs), max(ys))
    return {"w": box[2] - box[0], "h": box[3] - box[1], "top": box[3], "bottom": box[1]}[which]


# ---------------------------------------------------------------- composition
#
# A mark is a list of pieces. Each piece is a dict:
#   {"d": path data, "fill"|"stroke": True, "w": stroke width}
# Everything is in y-up 100-em units; emit() flips once, at the end.


def draw_contours(cs, dx=0.0, dy=0.0):
    """Path data plus its own control bounds — the bounds are tracked here
    because SVGPathPen emits H/V shorthands that cannot be re-parsed as pairs."""
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.2f}")
    xs, ys = [], []
    for _, rec in cs:
        for op, args in rec:
            moved = tuple((p[0] + dx, p[1] + dy) if isinstance(p, tuple) else p for p in args)
            for p in moved:
                if isinstance(p, tuple):
                    xs.append(p[0])
                    ys.append(p[1])
            getattr(pen, op)(*moved)
    bb = (min(xs), min(ys), max(xs), max(ys)) if xs else None
    return {"d": pen.getCommands(), "fill": True, "bb": bb}


def text_run(fkey, text, x=0.0, y=0.0, tracking=0.0, drop=None, pairs=None, k=1.0):
    """Set a string. tracking is in 100-em units. drop(char, i, bbox) -> bool
    removes a contour; pairs overrides a kern pair; k scales the whole run at the
    outline level, so advances, tracking and kerning stay proportional."""
    pieces, cursor = [], x
    for i, ch in enumerate(text):
        cs = contours(fkey, ch, k)
        if drop:
            cs = [c for c in cs if not drop(ch, i, c[0])]
        piece = draw_contours(cs, cursor, y)
        if piece["bb"]:
            pieces.append(piece)
        adv = advance(fkey, ch, k) + tracking * k
        if i + 1 < len(text):
            pair = kern(fkey, ch, text[i + 1])
            if pairs and (ch + text[i + 1]) in pairs:
                pair = pairs[ch + text[i + 1]]
            adv += pair * k
        cursor += adv
    return pieces, cursor - tracking * k


def polyline(points, width):
    d = "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in points)
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return {"d": d, "stroke": True, "w": width,
            "bb": (min(xs), min(ys), max(xs), max(ys))}


def bbox(pieces):
    xs, ys = [], []
    for p in pieces:
        pad = p.get("w", 0) / 2 if p.get("stroke") else 0
        x0, y0, x1, y1 = p["bb"]
        xs += [x0 - pad, x1 + pad]
        ys += [y0 - pad, y1 + pad]
    return min(xs), min(ys), max(xs), max(ys)


def svg(pieces, pad=0.0, box=None, tag=""):
    x0, y0, x1, y1 = box or bbox(pieces)
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    w, h = x1 - x0, y1 - y0
    body = []
    for p in pieces:
        if p.get("stroke"):
            body.append(
                f'<path d="{p["d"]}" fill="none" stroke="currentColor" '
                f'stroke-width="{p["w"]:.2f}" stroke-linecap="butt" stroke-linejoin="miter"/>'
            )
        elif p.get("rule"):
            body.append(f'<path d="{p["d"]}" fill-rule="{p["rule"]}"/>')
        else:
            body.append(f'<path d="{p["d"]}"/>')
    inner = "\n    ".join(body)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" '
        f'fill="currentColor" role="img" aria-label="pilotdeck{tag}">\n'
        f'  <g transform="translate({-x0:.2f} {y1:.2f}) scale(1 -1)">\n    {inner}\n  </g>\n</svg>\n'
    )


def square(pieces, pad_ratio=0.18):
    """Centre a mark in a square viewBox — the app-icon / favicon geometry."""
    x0, y0, x1, y1 = bbox(pieces)
    side = max(x1 - x0, y1 - y0) * (1 + pad_ratio * 2)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    return svg(pieces, box=(cx - side / 2, cy - side / 2, cx + side / 2, cy + side / 2))


# ---------------------------------------------------------------- the marks

WORD = "pilotdeck"
MARKS = {}


def emit(name, markup):
    MARKS[name] = markup
    with open(os.path.join(SVG_DIR, name + ".svg"), "w") as fh:
        fh.write(markup)


def square_tittle(fkey, x_top):
    """Drop the round tittle of an `i` and return the side of its square stand-in."""
    stem = metric(fkey, "l", "w")

    def drop(ch, i, box):
        return ch == "i" and box[1] > x_top * 0.92

    return drop, stem


def build():
    # ---- 01 · grotesque, set solid, square tittle -------------------------
    f = "hn-medium"
    xh = metric(f, "x", "h")
    drop, stem = square_tittle(f, xh)
    pieces, w = text_run(f, WORD, tracking=-1.2, drop=drop)
    # the square tittle sits on the i's stem, one stem-gap above the x-height
    ix = 0.0
    cur = 0.0
    for i, ch in enumerate(WORD):
        if ch == "i":
            ix = cur
            break
        cur += advance(f, ch) - 1.2 + kern(f, ch, WORD[i + 1])
    isb = min(c[0][0] for c in contours(f, "i"))
    pieces.append(rect(ix + isb, xh + stem * 0.55, stem, stem))
    emit("01-grotesque-solid", svg(pieces))

    # ---- 02 · geometric, open tracking ------------------------------------
    f = "avenir-demi"
    pieces, _ = text_run(f, WORD, tracking=2.4)
    emit("02-geometric-open", svg(pieces))

    # ---- 03 · technical / industrial --------------------------------------
    f = "din-bold"
    pieces, _ = text_run(f, WORD, tracking=0.8)
    emit("03-technical-din", svg(pieces))

    # ---- 04 · weight split: over | click ----------------------------------
    a, b = "sf-regular", "sf-bold"
    left, xend = text_run(a, "over", tracking=-0.6)
    right, _ = text_run(b, "click", x=xend + 0.4, tracking=-0.6)
    emit("04-weight-split", svg(left + right))

    # ---- 05 · bound ck ligature -------------------------------------------
    f = "futura-medium"
    bind = -metric(f, "l", "w") * 0.50  # k kisses the c's terminal; -0.7+ muddies the bowl
    pieces, _ = text_run(f, WORD, tracking=0.6, pairs={"ck": bind})
    emit("05-ck-ligature", svg(pieces))

    # ---- 06 · v-check inside the wordmark ---------------------------------
    f = "hn-medium"
    xh, asc = metric(f, "x", "h"), metric(f, "l", "top")
    stem = metric(f, "l", "w")
    head, xend = text_run(f, "o", tracking=-1.2)
    vw = advance(f, "v") - 1.2
    check = polyline(
        [(xend + stem * 0.35, xh * 0.86), (xend + vw * 0.42, stem * 0.5), (xend + vw * 1.02, asc)],
        stem,
    )
    tail, _ = text_run(f, "erclick", x=xend + vw + 1.4, tracking=-1.2)
    emit("06-vcheck-inline", svg(head + [check] + tail))
    solo = polyline([(0, xh * 0.86), (vw * 0.42 - stem * 0.35, stem * 0.5),
                     (vw * 1.02 - stem * 0.35, asc)], stem)
    emit("06-vcheck-inline-symbol", square([solo]))

    # ---- 07 · v-check lockup ----------------------------------------------
    f = "avenir-medium"
    xh, asc = metric(f, "x", "h"), metric(f, "l", "top")
    stem = metric(f, "l", "w")
    sym = polyline([(0, asc * 0.52), (asc * 0.30, 0), (asc * 0.86, asc)], stem * 1.15)
    symw = asc * 0.86 + stem * 0.6
    word, _ = text_run(f, WORD, x=symw + xh * 0.95, tracking=0.4)
    emit("07-vcheck-lockup", svg(sym + word if isinstance(sym, list) else [sym] + word))
    emit("07-vcheck-lockup-symbol", square([sym]))
    pts = [(0, asc * 0.52), (asc * 0.30, 0), (asc * 0.86, asc)]
    word_only = text_run(f, WORD, tracking=0.4)[0]
    ww, sw = bbox(word_only), bbox([polyline(pts, stem * 1.15)])
    off = (ww[0] + ww[2]) / 2 - (sw[0] + sw[2]) / 2       # optical centre over the word
    rise = ww[3] + xh * 0.60 - sw[1]                       # clear space = 0.6 x-height
    stack_sym = polyline([(x + off, y + rise) for x, y in pts], stem * 1.15)
    emit("07-vcheck-lockup-stacked", svg([stack_sym] + word_only))

    # ---- 08 · oc bound ligature -------------------------------------------
    f = "hn-bold"
    bind = -metric(f, "l", "w") * 0.80  # fused, but the c keeps its aperture at 16px
    pieces, _ = text_run(f, "oc", tracking=0, pairs={"oc": bind})
    emit("08-oc-ligature", square(pieces, pad_ratio=0.24))
    word, _ = text_run("hn-medium", WORD, tracking=-1.2)
    gap = metric("hn-medium", "x", "h") * 0.9
    lig, _ = text_run(f, "oc", tracking=0, pairs={"oc": bind})
    lw = bbox(lig)
    word, _ = text_run("hn-medium", WORD, x=lw[2] + gap, tracking=-1.2)
    emit("08-oc-ligature-lockup", svg(lig + word))

    # ---- 09 · oc reversed plate -------------------------------------------
    # A stacked o-over-c was tried first and killed by its own 16px test: two
    # lowercase letters in a 1:2 stack lose letter identity below ~28px. Reversing
    # them out of a solid field puts the mass on the outside, where small sizes
    # need it, and the counters carry the letters.
    f = "din-bold"
    side = 100.0
    probe, _ = text_run(f, "oc", tracking=1.2)
    pb = bbox(probe)
    k = side * 0.44 / (pb[3] - pb[1])                      # letters at 44% of the plate
    holes, _ = text_run(f, "oc", tracking=1.2, k=k)
    hb = bbox(holes)
    holes, _ = text_run(f, "oc", tracking=1.2, k=k,
                        x=(side - (hb[2] - hb[0])) / 2 - hb[0],
                        y=(side - (hb[3] - hb[1])) / 2 - hb[1])
    plate = knockout(rounded_rect(0, 0, side, side, side * 0.16), holes)
    emit("09-oc-plate", svg([plate]))
    probe, _ = text_run(f, WORD, tracking=0.8)
    wb = bbox(probe)
    kw = (side * 0.42) / (wb[3] - wb[1])
    word, _ = text_run(f, WORD, tracking=0.8, k=kw,
                       x=side * 1.26 - wb[0] * kw,
                       y=(side - (wb[3] - wb[1]) * kw) / 2 - wb[1] * kw)
    emit("09-oc-plate-lockup", svg([plate] + word))

    # ---- 10 · prompt lockup, data voice -----------------------------------
    f = "sfmono-medium"
    pieces, _ = text_run(f, "> " + WORD, tracking=0)
    emit("10-prompt-mono", svg(pieces))
    caret, _ = text_run(f, ">")
    emit("10-prompt-mono-symbol", square(caret, pad_ratio=0.26))


def rounded_rect(x, y, w, h, r):
    d = (f"M{x + r:.2f} {y:.2f} H{x + w - r:.2f} A{r:.2f} {r:.2f} 0 0 1 {x + w:.2f} {y + r:.2f} "
         f"V{y + h - r:.2f} A{r:.2f} {r:.2f} 0 0 1 {x + w - r:.2f} {y + h:.2f} "
         f"H{x + r:.2f} A{r:.2f} {r:.2f} 0 0 1 {x:.2f} {y + h - r:.2f} "
         f"V{y + r:.2f} A{r:.2f} {r:.2f} 0 0 1 {x + r:.2f} {y:.2f} Z")
    return {"d": d, "fill": True, "bb": (x, y, x + w, y + h)}


def knockout(field, holes):
    """One path: `field` filled, `holes` cut out of it. fill-rule=evenodd keeps the
    counter of an `o` solid, so the result is still one ink and still currentColor —
    the second value is the background showing through, not a second colour."""
    d = " ".join([field["d"]] + [h["d"] for h in holes])
    return {"d": d, "fill": True, "rule": "evenodd", "bb": field["bb"]}


def rect(x, y, w, h):
    d = (f"M{x:.2f} {y:.2f} L{x + w:.2f} {y:.2f} "
         f"L{x + w:.2f} {y + h:.2f} L{x:.2f} {y + h:.2f} Z")
    return {"d": d, "fill": True, "bb": (x, y, x + w, y + h)}


if __name__ == "__main__":
    os.makedirs(SVG_DIR, exist_ok=True)
    build()
    print(f"wrote {len(MARKS)} marks to {SVG_DIR}")
    for k in sorted(MARKS):
        print("  ", k)
