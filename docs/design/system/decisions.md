# Decisions — what the doctrine did not cover, and what the system decided

> OCL-81. Each entry: the gap, the decision, the rationale in one breath.
> Doctrine amendments proposed here are marked **[doctrine]** and take effect
> when `../ux-v2.md` adopts them; until then they are normative for the system.

## D1 — Body type scale becomes tokens

Gap: doctrine §2 names the ramp (22/16/13/12/11 = display/title/body/label/data)
but the token files carry only `--oc-text-display` (a 48–88px hero clamp) and
`--oc-text-caption`; every component body size is a literal scattered through
`nebula.css` (9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5px all appear).

Decision: add `--oc-text-display: 22px`, `--oc-text-title: 16px`,
`--oc-text-body: 13px`, `--oc-text-label: 12px`, `--oc-text-data: 11px`, plus
`--oc-weight-regular: 400` and `--oc-weight-semibold: 600` (the existing
`--oc-weight-medium: 500` stays). The hero clamp is renamed to
`--oc-text-hero`; it serves atmosphere/marketing surfaces only and is not part
of the UI ramp.

Rationale: the doctrine's ramp cannot be enforced while it has no token names;
ten literal sizes is exactly the inconsistency this system exists to end.

## D2 — One control height: 32px

Gap: the doctrine fixes the bar Control at 32px but says nothing about
buttons, selects and inputs elsewhere; today there are four select heights
(30–38px) and five button paddings.

Decision: 32px is the height of every compact interactive element (button,
select, menu item, chip row in a bar). Form inputs are 36px (they hold 13px
text with room for descenders). Below 768px the hit area grows to
`var(--oc-tap)` without changing the visual height.

Rationale: one height is what lets a bar, a toolbar and a form align on the
same optical axis; two heights (compact + field) is the minimum that keeps
forms comfortable.

## D3 — Chips, tags and badges collapse into one container

Gap: the app today has `.tag`, `.selo`, `.review-chip`, `.badge`,
`.state-chip`, `.mission-status`, `.release-chip`, `.mchip`, `.seen-chip` —
nine near-identical pills at five font sizes.

Decision: one chip (components §5.1), one count badge (§5.3), and type
expressed as a plain word (§5.2, doctrine kill list). The disabled chip gets a
normative state: dashed border, text-3, no hover.

Rationale: meaning comes from position and the status dot; nine pill variants
were nine decisions nobody made on purpose.

## D4 — Disabled and orphaned options are shown, annotated, unselectable

Gap (owner's finding): selects need a grouped-by-CLI presentation with real
enabled/disabled states. Today no option is ever `disabled`; a model that fell
off the catalog survives as `.sel.orphan`, a selectable option with a warn
border.

Decision: options group under caption-style headers (CLI names). Unavailable
options stay visible in text-3 with a data-face reason suffix
(`· not installed`, `· removed from catalog`) and `aria-disabled="true"`. A
currently-configured value that becomes unavailable stays in the trigger with
the same annotation.

Rationale: hiding a configured-but-unavailable value makes the board lie about
its own state; keeping it selectable invites a silent misconfiguration. Shown
and inert is the only honest state.

## D5 — Popovers get one anatomy and one close behavior

Gap: four popover implementations differ in offset (6 vs 8px), width strategy,
z-rung and ARIA role, and each re-implements Escape/click-away.

Decision: one panel anatomy (components §7), role chosen by content
(menu / listbox / dialog), one shared close hook to be extracted in phase B.

Rationale: a popover is chrome, not content; chrome that differs per screen
reads as a bug even when each instance is fine alone.

## D6 — Page containers are named, not invented

Gap: board, insights, settings and the context editor each chose their own
max-width.

Decision: the four containers in composition.md (fluid board, 1320px data,
720px form, 560px reading). Insights keeps its 1320px; settings moves from its
current ad-hoc width to 720px.

Rationale: width is a reading decision; it belongs to the page type, not to
whichever file happened to declare it.

## D7 — Toasts need a new z-rung **[doctrine]**

Gap: the doctrine's layer ladder (OCL-59) has no rung for toasts, and this
system introduces the toast (components §9).

Decision: propose `--oc-z-toast: 70`, above `--oc-z-sheet`, so a confirmation
is never trapped under the phone's full-screen detail.

Rationale: doctrine law says a new layer gets a name in the ladder, never a
`+1` at the call site; this is the request for that name.

## D8 — No spinner component

Gap: the doctrine covers loading nowhere, and the app has no loading
component.

Decision: skeleton bars for regions, dimmed label + `aria-busy` inline,
microcopy for blocking actions (components §10). No spinner exists in the
system.

Rationale: a spinner says "wait" without shape; a skeleton says what is
coming, which is what an instrument panel owes its operator.

## D9 — Danger keeps the standard focus ring

Gap: `.btn-rev` is today the only control with a non-accent focus ring (red).

Decision: one focus ring for everything, danger included; danger is expressed
on border, text and hover fill only.

Rationale: the focus ring is a navigation signal, not a mood; two ring colors
teach that focus means different things in different places.
