# 9993d — 999 Casino · the fullscreen 16:9 build

**The table is the screen.** One cloth, one dealer, six boxes, and a camera
that holds whoever is deciding — a full 3D blackjack table rendered live in
raw WebGL, with a fullscreen sign-in in the same presentation language.
No three.js, no CDN, no asset pipeline: every texture is drawn at runtime,
every page is self-contained, and nothing here touches the live app — these
are additive screens kept beside it for side-by-side comparison.

**▶ Play it live: https://joaoalbuq.github.io/9993d/**

*(workspace folder: `3dfullscreen/`)*

---

## Highlights

- **A table fitted to the frame** — a 16:9 screen gets a 16:9 frustum: the
  felt spans the viewport edge to edge, undistorted, every box in frame
  (measured at 1280×720 and 1920×1080). On a phone portrait the camera
  backs off so the whole table still fits — it widens, never crops, and
  nothing is stretched to make it fit.
- **The camera is a rule, not an interpolation** — while a box decides the
  camera **holds** that box, tight on its cards and bet; the dealer's hand
  owns the frame while it plays; a round **ends on the dealer's hand**; a
  table holding cards never parks on the wide shot. Every shot fits its
  subject (box stack, dealer fan, whole table) at any viewport — the camera
  widens, never crops.
- **Six real table cloths** — the palette set vendored verbatim from
  `999-bridge/src/theme.js`: felt, rail, accent and cloth-ink, with the two
  derived values computed by the bridge's own `shade()`. One choice paints
  the 2D felt, the 3D cloth and the HUD together, and travels in `?theme=<id>`.
- **The hub, one origin away** — `serve.js` serves the pages and proxies
  `/hub/*`, so sign-in is same-origin: no preflight, no CORS in the
  conversation at all. The signed-in **name and live wallet balance** follow
  you to the table — and the stakes are REAL: the bet (unit 25) is debited
  when the hand is dealt, a double debits one more, and settle pays the
  hand through the hub ledger. The balance tracks play.
- **Guest names are credentials** — unguessable handles (`Guest-` + 16
  random chars, ≈82 bits) replace the enumerable `Guest-NNNN` space;
  sessions verify against the hub, and existing handles are adopted from the
  legacy keys so every wallet keeps its sub.

## The screens

### `login-16x9.html` — the fullscreen sign-in

- **Fullscreen, three arrangements** — a 16:9 stage that fills a 16:9 screen
  exactly, a compact two-column layout on phone landscape, and a stacked
  portrait layout that fits a phone with no scroll. Safe-area insets
  everywhere; `visualViewport` keeps the panel above the mobile keyboard.
- **The felt is the screen** — procedural canvas: weave noise, light pool,
  vignette, and the printed identity (`BLACKJACK`, `DEALER MUST DRAW ALL 17`,
  `3 : 2`, `999`). Pixel ratio capped at 2; the light drift pauses when the
  tab is hidden and collapses under `prefers-reduced-motion`.
- **The hub's real client, vendored** — `makeHubClient` from
  `999-bridge/src/hub-client.js`: `session` mints, `verify` restores a warm
  session, `wallet` opens the balance. The never-throws contract is kept
  exactly — an unreachable hub degrades to a visible preview state, never a
  blank or blocked screen.

### `table-16x9.html` — the 3D table (the screen behind the login)

- **Raw WebGL, zero deps** — every texture (felt weave, card faces, backs,
  chips, the next-to-play ring) is drawn in a canvas at runtime. The table
  owns the whole viewport.
- **The readable-table rule** — each hand stacks vertically, one card of
  cloth wide, each card after the first lifting so its **top strip — where
  the rank prints — stays visible**. A ten prints **"10"**, never "T". The
  dealer keeps a sideways fan pitched a card-width apart: no coincident
  quads, no flicker. Totals print below each hand and dodge the thumb bar.
- **The full ceremony** — six boxes, a dealer hand, a shoe and a chip tray;
  European deal order (one to each box 1…6, the dealer, then a second to
  each), one card per ~0.7s, and the dealer **always plays out to 17** (S17)
  even when every box has ended.
- **Thumb action bar** — Hit / Stand / Double / Split above the safe area,
  `H`/`S`/`D` keys on desktop. The 3D zoom control's label reflects the next
  action and user zoom survives every shot change.

### `serve.js` — the preview host with the hub on one origin

`node serve.js` serves both pages **and proxies `/hub/*` to the dev hub**, so
the pages fetch their own origin and the browser never enters CORS — no
preflight, no `Access-Control-*` needed on any answer. The host injects
`window.__HUB_BASE__` into the pages it serves so they know the route.

## Play it

**https://joaoalbuq.github.io/9993d/** — GitHub Pages, no install: the portal
opens onto the sign-in and the 3D table. The table is fully playable there
(deal, hit/stand/double, the camera director, all six cloths); sign-in needs
a hub, so on the public host it degrades to the visible preview state by
design.

## Quickstart (with the hub)

```bash
node poker/local-server.js    # the dev hub on :8899
node serve.js                 # pages + /hub proxy on :8787
```

Open **http://127.0.0.1:8787/** — sign in as a guest, and the wallet follows
you to the table. `?hub=<url>` points the pages anywhere; served bare (as
files or behind a static host) they fall back to the dev hub directly, which
answers with CORS headers.

## Verified

- **16:9 fit** — felt corners project inside the frame at 1280×720
  (x ∈ [3, 1277]) and 1920×1080 (x ∈ [4, 1916]); the whole table fits a
  390×844 phone portrait (x ∈ [5, 385]); the HUD stage fills 16:9 exactly.
- **The camera director** — the full shot cycle live-sampled on the running
  page: wide table → the table → holds 1…6 → the dealer's hand → settle →
  back to the dealer.
- **Sign-in, end to end** — mint → wallet → verify restore, same-origin with
  zero preflights, and a visible preview degrade when no hub answers.
- **Real stakes through the ledger** — live-sampled rounds on the running
  page: `bj_bet` debited at the deal, a win pays `bj_prize` (stake + 1:1),
  a push returns `bj_push`, a loss keeps the stake; a double is a second
  debit. Every move carries a per-hand idempotency key — a replayed key
  returns the original result and pays nothing — and an insufficient-funds
  bet (409) leaves the hand unstaked and the pill on hub truth.
- **Clean pages** — `node --check` on every inline script, no console
  errors.

## Layout

| Path | What it is |
| --- | --- |
| `login-16x9.html` | The fullscreen 16:9 sign-in (2D canvas felt engine) |
| `table-16x9.html` | The fullscreen 16:9 table (raw WebGL 3D engine) |
| `serve.js` | Static host + same-origin `/hub` proxy (zero-dep Node) |
| `README.md` | This page |

Cloth palettes, the hub client and identity handling are vendored from
`999-bridge` (commit `5185558`) into the pages themselves — each page runs
from a single file, no imports, no build step. The cloth choice persists
under `maison21.theme` (what `maison-21/src/theme.ts` reads), with the
legacy `999.login.cloth.v1` key adopted and kept in sync.
