# 3dfullscreen — 999 Casino, the fullscreen 16:9 build

The side-by-side build of the **full 3D fullscreen revamp**: new screens that
coexist with the live app so both can be compared at once. Nothing existing is
modified — every screen here is an additive, self-contained page.

## What's in here

### `login-16x9.html` — the fullscreen 16:9 sign-in

A different login page in the revamp's presentation language, kept beside the
existing sign-in (`poker/client/index.html` on the dev hub) for live comparison.

- **Fullscreen, three arrangements** — a 16:9 stage letterboxed to fit on
  desktop and iPad landscape, a compact two-column layout on phone landscape,
  and a stacked portrait layout that fits a phone with no scroll. Safe-area
  insets everywhere; `visualViewport` keeps the panel above the mobile keyboard.
- **Six table cloths, the real ones** — `classic-house`, `platinum`, `ocean`,
  `felt-noir`, `amethyst`, `black-gold`, vendored verbatim from
  `999-bridge/src/theme.js` (commit `5185558`). One palette record paints felt,
  accent, ink and the felt's printed ink together (the revamp's "one record,
  three consumers" rule). Ids are load-bearing — they travel in `?theme=<id>`
  and in saved choices — add, never rename. The two extra values this page
  wears (`deep`, the room behind the glass; UI `ink`) are derived with the
  bridge's own `shade()`, never hand-picked. The choice persists under
  `maison21.theme` (what `maison-21/src/theme.ts` reads) with the legacy
  `999.login.cloth.v1` key adopted and kept in sync.
- **The felt is the screen** — procedural canvas: weave noise, light pool,
  vignette, and the printed identity (`BLACKJACK`, `DEALER MUST DRAW ALL 17`,
  `3 : 2`, `999`). No assets, no CDN. Pixel ratio capped at 2; the light drift
  pauses when the tab is hidden and collapses under `prefers-reduced-motion`.
- **The hub's real client, vendored** — `makeHubClient` from
  `999-bridge/src/hub-client.js` (commit `5185558`): `POST /session {name}`
  mints `{token, sub, name, locked}`, `POST /session/verify` restores a warm
  session, `GET /wallet` opens the balance. The never-throws contract is kept
  exactly — every call returns `{ok, status, body, error}` and an unreachable
  hub degrades to a visible preview state, never a blank or blocked screen.
  "Continue to the floor" hands off to the existing lobby via its `?as=`
  deep-link.
- **Guest names are credentials** — vendored from `999-bridge/src/identity.js`
  (commit `5185558`): a guest handle is minted **unguessable**
  (`Guest-` + 16 random base36 chars ≈ 82 bits) replacing the enumerable
  `Guest-NNNN` space. Existing handles are **adopted, never reset** — new
  `999.*.v1` keys first, then the legacy `royale.*` keys — so every wallet a
  player already has keeps its sub, and the session mirrors to
  `sessionStorage['poker.token']` for the live app.

### `table-16x9.html` — the fullscreen 16:9 table (the screen behind the login)

A felt-filling **3D stage in raw WebGL** — no three.js, no CDN, no asset
pipeline; every texture (felt weave, card faces, backs, chips, the next-to-play
ring) is drawn in a canvas at runtime. The table owns the whole viewport.

- **The camera director is a rule, not an interpolation** (spec §4.4),
  verified live: while a box decides the camera **holds that box** with the
  pulsing "next to play" ring on the cloth; during the dealer's play the
  **dealer's hand owns the frame**; a round **ends on the dealer's hand** (the
  frame returns to the dealer after the payout walk, never the last paid box);
  and a table holding cards **never parks on the wide establishing shot** —
  during the deal the shot is the cards, not the room. Camera `CAM_PITCH = 1.0`,
  `CAM_FOV = 48`. The zoom control's label reflects the next action and user
  zoom survives every shot change.
- **The hand layout is the readable-table rule** (spec §4.3): each hand stacks
  vertically from its first card — **one card of cloth wide** — and each card
  after the first lifts `STACK_LIFT = 0.135` of its length so the visible band
  is its **top strip, where the rank prints**. The lift and the corner index
  are one decision: the index draws at y = 16 on a 448px face at
  `FACE_INDEX_PX = 62`, so its ink fits the `STACK_MIN = 0.132` strip. A ten
  prints **"10"**, never "T". The dealer keeps a **sideways fan** pitched
  `0.86` world apart (> one card width `0.749`) — no coincident quads, no
  flicker. Totals print **below** each hand and dodge clear of the thumb bar.
- **Six boxes, one dealer hand, a shoe, and the chip tray** — the deal order is
  the spec's European ceremony: one card to each box 1…6, one to the dealer,
  a second to each box 1…6, one card per ~0.7s. The dealer **always plays his
  hand out to 17** (S17) even when every box has ended.
- **Thumb action bar** — Hit / Stand / Double / Split above the safe area;
  fatter thumbs on phones, `H`/`S`/`D` keys for desktop. Split is visible but
  inert in this preview. Same six real cloth palettes as the login (shared
  `maison21.theme` + adopted `999.login.cloth.v1` keys; `?theme=<id>` wins),
  one record painting HUD and 3D felt together.
- **Arrangements mirror the login** — a 16:9 stage letterboxed on wide
  screens, full-bleed compact on phone landscape, stacked portrait primary.
  The camera **widens rather than crops** when the viewport narrows.

## Running it

Open the files directly (start at `login-16x9.html`, then "Sign in" or the
table link to reach `table-16x9.html`), or serve the folder with any static
server. The hub
base defaults to `http://localhost:8899/hub` (the poker dev hub:
`node poker/local-server.js`) and can be pointed anywhere with `?hub=<url>`.

Note: a dev hub answers `/hub/*` JSON **without CORS headers**, so a page served
from another origin sees the preview degrade path. Served from the app's own
origin — or against a hub with CORS open, as the production topology requires —
the same click mints a real session.
