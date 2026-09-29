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
- **Six table cloths** — `classic-house`, `platinum`, `ocean`, `felt-noir`,
  `amethyst`, `black-gold`. One palette record paints felt, accent, ink and the
  felt's printed ink together (the revamp's "one record, three consumers" rule).
  Values are stand-ins until `999-bridge/src/theme.js` is wired in.
- **The felt is the screen** — procedural canvas: weave noise, light pool,
  vignette, and the printed identity (`BLACKJACK`, `DEALER MUST DRAW ALL 17`,
  `3 : 2`, `999`). No assets, no CDN. Pixel ratio capped at 2; the light drift
  pauses when the tab is hidden and collapses under `prefers-reduced-motion`.
- **The hub's existing session contract** — `POST /session {name}` mints
  `{token, sub, name, locked}`; a guest handle (`Guest-NNNN`) is minted under
  the shared `royale.guestname.v1` key so both logins land on the same wallet.
  "Continue to the floor" hands off to the existing lobby via its `?as=`
  deep-link. A hub that cannot answer degrades to a visible preview state —
  never a blank or blocked screen.

## Running it

Open the file directly, or serve the folder with any static server. The hub
base defaults to `http://localhost:8899/hub` (the poker dev hub:
`node poker/local-server.js`) and can be pointed anywhere with `?hub=<url>`.

Note: a dev hub answers `/hub/*` JSON **without CORS headers**, so a page served
from another origin sees the preview degrade path. Served from the app's own
origin — or against a hub with CORS open, as the production topology requires —
the same click mints a real session.
