# 9993d — 999 Casino · the fullscreen 16:9 build

![The 3D table mid-round — six boxes with live bet stacks, the dealer's fan, one cloth](media/table.png)

**The table is the screen.** One cloth, one dealer, six boxes, and a camera
that holds whoever is deciding — a full 3D blackjack table rendered live in
raw WebGL, with a fullscreen sign-in in the same presentation language.
No three.js, no CDN, no asset pipeline: every texture is drawn at runtime,
every page is self-contained, and nothing here touches the live app — these
are additive screens kept beside it for side-by-side comparison.

**▶ Play it live: https://joaoalbuq.github.io/9993d/**

**▶ Watch a round:** [deal → play → the payout walk](media/round.mp4) (≈22s)

*(workspace folder: `3dfullscreen/`)*

---

## Highlights

- **A table fitted to the frame** — a 16:9 screen gets a 16:9 frustum: the
  felt spans the viewport edge to edge, undistorted, every box in frame
  (measured at 1280×720 and 1920×1080). In a narrow portrait viewport the
  camera backs off so the whole table still fits — it widens, never crops,
  and nothing is stretched to make it fit.
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
- **The hub travels with the app** — off localhost (the Pages build, the
  installed home-screen app) the pages sign in against the **public hub**:
  `poker/hub/hub-party.js` deployed on PartyKit at
  `maison-21.joaoalbuq.partykit.dev/parties/main/hub` — the one
  grandfathered hostname that still provisions in the saturated
  `partykit.dev` zone (project name, never brand). It runs the same hub
  contract as the dev hub, persists sessions and wallets in Durable
  Object storage, and answers CORS itself. Resolution order:
  `?hub=<url>` → host-declared `__HUB_BASE__` → dev hub on localhost →
  the public hub.
- **Guest names are credentials** — unguessable handles (`Guest-` + 16
  random chars, ≈82 bits) replace the enumerable `Guest-NNNN` space;
  sessions verify against the hub, and existing handles are adopted from the
  legacy keys so every wallet keeps its sub.

## The screens

### `login-16x9.html` — the fullscreen sign-in

- **Fullscreen, landscape-first** — a 16:9 stage that fills a 16:9 screen
  exactly, and a compact two-column layout on phone landscape. Phones and
  tablets are landscape-only: portrait shows a rotate gate (“turn your
  phone sideways”), and the first tap in landscape enters true fullscreen —
  browser chrome hidden, the screen locked to landscape on Android; iOS
  keeps the edge-to-edge layout. Desktop keeps the letterboxed stage and
  its portrait arrangement. Safe-area insets everywhere; `visualViewport`
  keeps the panel above the mobile keyboard.
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
  even when every box has ended. Settle is a **payout walk** (spec 4.4): the
  frame holds each box as it pays — chips fly in with the settlement's own
  `+delta` floating at the total, a losing stack flies out to the dealer —
  and the round ends back on the dealer's hand.
- **The audio ceremony (spec 4.5)** — chip clacks, card whooshes and
  snaps, the shoe's riffle and win/lose stingers, every sound Web Audio
  **synthesis** (no CDN, no bundled sample, no runtime download). Impact
  then sound: a chip clacks when it lands, a whoosh rides each card's
  flight — carrying its DISTANCE, so a card to the dealer's fan is close
  and bright while one to the far box is deeper and quieter — and its snap
  lands it, and one stinger per round marks **your**
  verdict only. **Every whoosh carries its SEAT too**: the whoosh pans
  from the shoe to the box it lands in (a StereoPannerNode ramping
  across the flight), and a **lowpass veil rides the same near model**
  (16.5kHz open at the nearest seat down to 1.3kHz behind the
  farthest), so a far seat is DARKER, not just quieter — and the box's
  pan is where the SCREEN puts it —
  the camera holds boxes close when it holds them, so the pan tracks
  what the player sees, not the felt alone; off-frame falls back to the
  felt's own geometry, pans stop 0.85 short of the rail, and a missing
  panner API leaves the whoosh centered rather than broken. Live: the
  six seats landed at −0.57 · −0.34 · −0.11 · +0.11 · +0.34 · +0.57 with
  the shoe opening at +0.48 and the dealer's card dead center. **The
  floor has air**: a room reverb synthesized in the page — no samples,
  no downloads — a 12ms pre-delay, three early reflections off the
  tables and rails, then a damped tail that reaches −60dB in its 1.35s
  RT and is normalized to 0.35 energy per channel; every voice sends
  to the room at its own level through the same 0.35-trimmed bus into
  a ConvolverNode straight to the destination — each family sends at
  its own level: the riffle leans in at **1.7×** (four decks filling
  the air), the whooshes swim at **1.5×** (they are air moving, so
  the room belongs to them), the stinger blooms at **1.4×**, the
  card snaps and the chime keep their plain share, and the chip
  clacks stay dry-ish at **0.6×** — ceramic near the cloth, with the
  room saved for what fills it, so the walk's ticks read close while
  its whooshes swim
  (stereo IR, and every send sits after its panner, so a panned deal
  keeps its direction in the reflections too; muting gates the walls
  as well as the felt). **The room has a second, larger character**:
  the Cinema toggle doesn't just stretch the flights — it slides the
  wet path from the felt's 1.35s room into a hall (2.8s tail, 26ms
  pre-delay, reflections pushed wider, the same 0.35 loudness —
  bigger, not louder), crossfaded over ~0.75s so the walls move back
  with the stretched flights and never click; a page born in cinema
  wakes in the hall. **The walls answer from the far side**: while a
  card flies, the reverb return itself leans subtly opposite its seat
  (−0.35×, ramping across the flight) and re-centers a beat after it
  lands — the far wall speaking back — and one flyer owns the walls
  at a time, so a straggler mid-flight never yanks them. **The payout
  walk speaks the cards' model too**:
  every clack measures its chips' tray-to-box flight — the tray sits
  left of center, so the ladder runs bright at the center seat to the
  1.75kHz floor at the far rail, deeper and quieter with every unit of
  cloth — while clacks without a flight keep the plain voice they have
  always had. Live: the walk's ticks landed at 2819 · 2636 · 2627 ·
  2285 ·  1832Hz across the seats. **And the walk crosses the channels**: every
  clack carries its SEAT — the fan pans from where the chips leave to
  where they land, the tray's screen seat to the box's, one step per
  chip through the same panFor the whooshes ride — so the payout walk
  moves across the stereo field the way the deal does (and the panned
  clacks keep their direction in the room's reflections, since the
  panner sits upstream of the shared send); without the panner API the
  clacks stay centered, never broken. Gated by
  the 🔊 tool toggle (a mute
  that persists), and quiet behind the rotate gate and in a hidden tab.
- **The shoe ceremony (spec 4.5)** — a four-deck shoe with a **cut card at
  75–85% penetration**, drawn fresh every shoe: cards are counted as they
  leave, and when the cut card surfaces mid-round the round plays out to
  its end and the next one opens the ceremony — no metronome, the shoe's
  own rhythm. The deck splits in two at the shoe, the halves riffle back
  together and the stack squares up while the camera holds "The shoe" —
  twelve card backs and nothing else moving, a paper slide and fourteen
  card snaps sounding with the riffle and two taps as the deck squares.
  The deal draws from a **true 208-card stack** — four decks built and
  Fisher-Yates-shuffled whole, dealt from the top, so depletion is real:
  ten-density exactly 30.77% with no weighting, and every card keeps the
  suit it was printed with. The visible cut card surfaces 20 cards before
  the cut, stands at the shoe through its last rounds, and is gone with
  the riffle that renews the shoe. An optional **training overlay** (the
  🎓 tool, off by default, persisted) rides the live table: the Hi-Lo
  count tags every card the shoe releases — the panel reads running,
  true and decks left — and at your decision the book play badges its
  button and the click is judged in one line ("book says Hit"). The
  count tags every card regardless, so switching on mid-shoe is exact;
  a fresh shoe resets the count. **Index plays ride both floors**: the
  true count flips the chart where composition pays — hard 16 v 10 stands
  at +1, 15 v 10 at +4, 12 v 2 at +1, 12 v 3 at +2, 11 v A doubles at +1,
  10 v 10 at +4, 9 v 2 at +1, and 13 v 2 runs the other way (a chart
  stand that turns into a hit once the shoe goes cold at −1) — with the
  coach naming the flip ("the count play (hard 16 v 10 flips at +1 ·
  now +1) — tens left make a draw bust too often to chase", "✓ book
  play — the count play") and insurance, the count's own bet, taught
  at the felt when an ace shows — both the turn ("it pays only past a
  third tens — true +3 is that rich") and the decline.
- **Furniture in 3D (spec 4.2)** — the shoe, the discard rack and the
  chip tray are stacked geometry on the dealer's side, not flat quads:
  the shoe is a stack of card backs on an inner mat that SINKS as the
  shoe deals and refills whole at the riffle (stilled mid-ceremony —
  the riffle owns the cards then); the discard rack is its mirror on
  the left, GROWING with every card that played, emptied by the next
  shoe; the tray is five chip columns on a plate behind the payout
  lane that RISE when the house takes a stack and SINK when it pays
  one out — and the whole tray drifts a whisper along the money's
  direction (heavy rides right, paid down eases left) so the furniture
  breathes with the ledger. The chip flights still land exactly on the
  lane the distance model measures (traySpot untouched), and the dealer
  reads the print between the pieces: DISCARD · TRAY · SHOE. The +delta
  lives in the scene now too: at settle a plank of light bearing the
  settlement's own number rises from the box's total, projected by the
  same camera as the cards — the DOM pill is retired. Stack heights,
  the tray ledger (take − give, clamped to 25 chips) and the float's
  rise-and-fade are the properties under test in
  `test/furniture3d.test.js`.
- **The betting interlude, every round** — the floor opens for the oldest
  ritual there is before every deal, not only when the shoe changes: the
  status line reads **"New shoe — place your bets"** when the shoe is fresh
  and plain **"Place your bets"** the rest of the time, the bar swaps its
  actions for a chip picker (25 / 100 / 500), the betting circle breathes at
  your box with the picked stake previewed in felt, and a soft two-note
  chime opens the window. The picked stake rides the next bet — and its
  double — into the ledger; the deal follows the 3.8-second window or the
  Deal tap. A shoe at its cut riffles FIRST — ceremony, then the window.
  When the daily wheel is waiting, the window also carries a **🎡 Bonus**
  button — signed-in players claim the streak prize right where they bet:
  the button shows only when the hub says ready (no grey nagging), the
  claim credits through the hub's one grant door (its own `wheel_claim`
  row, labelled '🎡 Streak wheel'), the pill and the button render the
  hub's answer (+6,250 sampled: 5,000 base + 1,250 gold VIP), a two-note
  chime marks the claim, and the wheel closes until tomorrow — a replay
  gets the hub's 429 and a reload shows no button. Not signed in, or not
  ready? The window looks exactly as it did before.
- **The cinematic deal** — a slow-motion mode (the 🎬 tool, key `C`) where
  card flights and their sounds stretch **together**: the flight duration
  is the one knob, so the whoosh swells over the stretched flight, the
  snap lands at its end, and the gaps between cards breathe in the same
  tempo. The **payout walk breathes in that tempo too**: the walk beats,
  the chip flights and their clacks all read the same `pace` — a clack
  lands when its chip lands, just later — so a cinematic settle takes
  ~12s instead of ~5s, and the +delta plank rides the stretched beat.
  The shoe ceremony keeps real time.
- **Thumb action bar** — Hit / Stand / Double / Split above the safe area,
  `H`/`S`/`D` keys on desktop. The 3D zoom control's label reflects the next
  action and user zoom survives every shot change.

  ![The payout walk holds each box as it pays — chips land and the +delta floats at its total](media/payout-walk.png)

### `serve.js` — the preview host with the hub on one origin

`node serve.js` serves both pages **and proxies `/hub/*` to the dev hub**, so
the pages fetch their own origin and the browser never enters CORS — no
preflight, no `Access-Control-*` needed on any answer. The host injects
`window.__HUB_BASE__` into the pages it serves so they know the route.

### `manifest.webmanifest` + `sw.js` — the home-screen app

- **Landscape, fullscreen, installed** — the manifest locks the display to
  `orientation: landscape` and `display: fullscreen`, so the installed app
  IS the sideways 16:9 build, opening straight on the table. The icons are
  drawn at build time by `make-icons.js` — the table's own chip texture in
  logo form (gold ring, eight notches, 999 at the center), encoded as real
  PNGs by a minimal zlib encoder; `icon-512-maskable.png` scales the mark
  into the maskable safe circle.
- **An install prompt that respects the platform** — a ⤓ button (portal,
  sign-in strip, table tools) appears only when the browser fires
  `beforeinstallprompt`, and owns the prompt when it does. iOS never fires
  it — so the portal points at Share → Add to Home Screen instead, with
  `apple-touch-icon` and the `apple-mobile-web-app-*` metas covering the
  home-screen chrome.
- **`sw.js` is a pass-through** — Chrome's installability criteria still
  require a registered fetch handler, so the worker is a network-first
  shell cache that never touches `/hub/`: the ledger always goes to the
  network. Connectivity probes (`cache: 'no-store'`) are never cached and
  never rescued from cache, so the offline page can tell the line is down.
- **The offline state is a table, never a waiting room** — a navigation
  that can't reach the network lands on `offline.html`: a playable
  **practice shoe** (two decks, a cut card at 75% penetration, the riffle
  ceremony between shoes) with cosmetic chips and **no ledger** — bet, hit,
  stand, double, and the floor's own settlement (blackjack 3:2, win 1:1,
  push returns the stake). **The card sounds carry their seat**: the
  deal's whoosh pans from the shoe's live screen position to the hand
  it lands in and the snap lands at that hand — read live from the
  layout, so center stays center on any width and a narrow phone never
  invents stereo it doesn't have (rails stop at ±0.85, and without the
  panner API everything stays centered) — while the clacks, riffle,
  coach cue and stinger keep the center, because this felt has one
  seat. The house chip (inline SVG, so the brand can't
  404 offline) brands it, the card snaps and riffle sound through the app's
  own 🔊 toggle, and the page the player was bound for rides along in
  `?from=`. The moment the origin answers the pill offers the door straight
  back to exactly that page — immediately when only the shoe is running,
  never yanked out of a live hand. The **coach** lives here too: at every
  decision the book play is badged on its button ("book"), each click is
  judged — "✓ Book play" or "Book says Stand", with a soft cue — and the
  running score persists with the tray. The book is the shoe's own (two
  decks, S17, no split, doubles degrading gracefully when they aren't
  legal), and the 🎓 pill turns the whole mentor off. The **🩹 Leaks**
  mode is where misses go to die: every priced miss lands in a persisted
  leak ledger (book cell → count + chips thrown away), a panel ranks your
  worst cells by cost, and toggling it deals those EXACT hands — the shoe
  is stacked at deal time (three cards lifted from the shoe: hand, hand,
  upcard; a spent shoe earns a fresh shuffle) so "hard 16 v 10" returns
  whole, not something like it. The panel's two tabs compare this sitting
  against the whole ledger — a ▲ marks any class bleeding worse than its
  own history, and each sitting row carries a one-tap drill-now hand-off.
  A class's FIRST miss of the sitting opens the panel by itself, ranked
  on the session tab — a leak you didn't know you make is seen, not
  hunted for. With an empty ledger it teaches the
  classic — hard 16 v 10, the costliest stand in the book. The **⏪
  Review** mode goes deeper: the last misses are kept as they HAPPENED
  (cards and suits, the click, the book's answer, the price) and replayed
  onto the felt costliest-first — the house stakes the replay, so a win
  is pure upside and the second try costs nothing. Live: a stand on soft
  13 v Q came back as exactly A♥ 2♦ v Q, price and all. The shoe's meter
  keeps **Hi-Lo** too — 2-6 +1, 7-9 0, 10-A −1, the running count under
  the shoe bar (green plus, red minus) reset with every riffle. Between
  rounds a **count drill** holds the deal until the player steps the count
  in and locks it — recall, never recognition — or asks for it outright;
  the ♠ pill keeps the score (right % and the average miss) and turns the
  whole drill off.  The **Index sheet quizzes too**: the sheet's live line carries a
  "quiz me — a fresh count" tap that deals a random true count (−6 to +10,
  spread riding on the card), the player taps every play they believe is
  LIVE at it — nine classes plus insurance by name — and the lock grades
  against the canon both ways ("missed: hard 10 v 10" or "a clean card").
  A card can be fixed and re-locked (the card scores once, the re-lock
  replaces its grade), the score rides the sheet as clean cards over
  cards graded, and "a fresh count" deals again. On the teach sheet
  itself the flips announce themselves: each row goes gold with a ▸
  the count it crosses — the live rows read gold beside the footer's
  live line, refreshed with every dealt card. **Index discipline is
  judged apart**: every decision where the count play stood against
  the chart — the nine hand flips, plus the count's own insurance bet
  against the chart's decline — asks the player, and the follow rate
  rides the ♠ pill ("· ix 5/7") and the sheet's footer ("count plays
  followed 5/7"), persisted apart from the coach score: the chart's
  easy answers never pad it. The panels read and
  take taps above the shoe's right edge, which used to swallow clicks.
  The drill teaches the **true count** too: the meter
  reads out decks left ("Shoe 99% · 2.0 dk"), questions ALTERNATE running →
  true → running, the true verdict shows its own division ("✓ True +2 ·
  RC +4 over 2.0 dk"), and while you bet a hint translates the count into
  money — "True +3 — the spread says 2 units" (the old count−1 rule,
  capped at 6, held at 1 until the edge shows). The pill splits the
  scores: "Count 60% · ±0.8 · TC 13%". And the **⚡ Speed** drill trains
  recall against the clock: a fresh single deck flashes at a set cadence
  (Slow / Normal / Fast), you keep the running count in your head, then
  step it in and lock it while a live timer runs — streak, best time and
  runs persist, the stream is independent of the table shoe, and a deal
  always kills a running drill.

## Play it

**https://joaoalbuq.github.io/9993d/** — GitHub Pages, no install: the portal
opens onto the sign-in and the 3D table. On a phone it installs as a
home-screen app — landscape, fullscreen, straight to the table. The table
is fully playable there
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
  a 390×844 portrait viewport (x ∈ [5, 385]); the HUD stage fills 16:9
  exactly. Phones and tablets in portrait now meet the rotate gate.
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
- **The felt keeps the ledger** — bet stacks are live chips, not decoration:
  a stack drops at your box the moment the `bj_bet` debit lands (nothing
  while the wallet says no), a double doubles it, and at settle the **payout
  walk** pays each box on its beat: chips arc out of the house tray to the
  winner with the settlement's own `+delta` (`+50` / `+25` / `+100` sampled
  at the totals) floating at its total, a losing stack flies to the dealer,
  and the frame returns to the dealer's hand. Sampled chip-by-chip against
  the ledger: win brings 2× the stake in, a push returns 1×, a loss sends
  the stack to the tray, and an unstaked hand moves no chips either way.
- **The audio ceremony** — live-sampled on the running page: 13 card
  flights in the deal, each a whoosh at the shoe and its snap landing
  420ms later at the cloth (128 flights sampled, every whoosh paired with
  exactly one snap), chip clacks landing with the bet debits and each
  payout-walk flight, a rising triad at a won hand and a falling sigh at a
  lost one; the 🔊 toggle silences and restores it all mid-round.
- **Distance-aware flight whooshes** — 1,347 flights sampled: the deal's
  13-card sequence sweeps monotonically from the far box (1299Hz) to the
  near (2009Hz) with the dealer's card brightest at 2100Hz, second-card
  landings shifting +15–32Hz as the stack climbs toward the shoe, and the
  swell falling from 0.055 to 0.036 across the table.
- **The cinematic deal** — the flight duration is the single knob and the
  audio rides it: at 2.5× the measured whoosh swell is 1.045s and the snap
  lands at 1.065s (exactly (flight−30ms)/1000 and (flight−10ms)/1000 for
  the 1075ms flight), inter-card gaps stretch 700→1750ms (85–92ms measured
  under test compression), and toggling mid-round snaps the sound back at
  once while the in-flight cascade keeps its own tempo. The payout walk
  stretches the same way — beats 760→1900ms, flights 560→1400ms, clacks
  at the stretched landings: the same multiplier on render and audio.
- **The shoe ceremony** — live-sampled across 40+ ceremonies on the running
  page: the cut card surfacing mid-final-round and the round playing out
  (cards-before-final-round < cut ≤ cards-dealt verified on every measured
  shoe; forced boundary cuts of 156 and 177 of the 208-card shoe landed to
  the card, natural draws spanned 159–174), the status line on "Shuffling
  the shoe…", the camera holding "The shoe", twelve card backs splitting
  (x-spread 0.28 world) and squaring up (0.006) over exactly 2400ms. The
  riffle sounds with the cards — a paper slide at +60ms, fourteen snaps at
  +550…1356ms (a body tone every third), two square-up taps at +1580 and
  +1800ms — 65 synthesis nodes per ceremony, and **zero** under the 🔊
  mute while the animation still plays.
- **The betting interlude, every round** — sampled across 30+ shoe cycles on
  the running page: "Shuffling the shoe…" → "New shoe — place your bets" →
  the deal, the window measuring exactly 3800ms, the camera holding "Place
  your bets", and the picker moving the REAL stake — `bj_bet -25` ledger
  rows after picking 25, `bj_bet -100` after picking 100 (32 and 36
  consecutive rows sampled), settlements scaling with the stake. The chime
  sounds once per window (4 nodes), **zero** under mute across three full
  ceremonies while the ceremony plays on, and returns on unmute; the Deal
  tap collapses the window instantly. Re-driven after the window moved to
  EVERY round: two windows in real time measured 3649 / 3801 ms, the window
  opening after every "Next hand" with no skipped round, and both shoe
  crossings ran riffle → "New shoe — place your bets" — ceremony first,
  bets after, with the cut card surfacing mid-deal on the way in.
- **The practice shoe under the floor** — 45 hands driven live against the
  offline page: every settlement exact against the rules recomputed from
  the rendered cards (blackjack 3:2 — `+37.5` sampled on a 25 stake, win
  1:1, push returns, a double takes its second stake), the riffle ceremony
  riffling between shoes at the cut card, and a whoosh+snap pair on every
  flight (1:1 live-sampled) with the 🔊 mute silencing the table mid-round.
  The return door: a failed navigation lands carrying the exact URL in
  `?from=`, an idle table returns to it automatically, a hand in play is
  **never** yanked (the pill waits with "Return to the floor"), and the door
  lands on exactly the page — queries included — that was left.
- **The coach** — 26 decisions marked live and checked against an
  INDEPENDENT table-driven implementation of the book: 26/26 exact (hard
  12–16, soft 13–18, doubles and post-hit decisions included), verdicts
  and score arithmetic exact (50% under deliberate alternating play),
  marks and cue nodes zero with the coach off and under 🔊 mute while the
  scoring kept counting, and the score surviving reloads. The driver also
  caught two real bugs: a verdict cleanup that wiped the NEXT decision's
  badge at any speed, and a stranded tray — 3:2 payouts leave half-chips
  and a bank of 12.5 could never bet or refill again; the tray now refills
  whenever the minimum bet can't be covered. The coach now also scores
  **what mistakes cost**: the EV999 engine prices every decision in
  expected chips (infinite deck, S17, this floor's no-peek flavor) and a
  deviation is charged `(evBook − evChoice) × bet` — the pill reads
  "Coach 44% · 3453/7894 · **−5.6/dev**" under an always-stand drive, and
  the miss hint names the price ("Book says Hit · −12.5"). The engine is
  itself verified: its dealer distributions match independent exact
  recursion to 1e-9, all sampled prices land inside Monte-Carlo noise at
  120k trials/action, and a hand-level cross-check keeps book and engine
  united — where this floor's flavor convicts the chart (hard 11 v A/10:
  the peek-game double that no-peek turns into a hit), the book FLIPS to
  the engine's play, so badge, verdict and price can never disagree
  (chart knife-edges under 0.004 stay chart).
- **The Hi-Lo drills** — the running count recomputed from the cards the
  DOM actually showed matched the meter to the card (`3 7 8 6 8` = +2
  against "Hi-Lo +2" in green, "Hi-Lo -1" wearing red), the drill opening
  between rounds and holding the Deal button hostage until it is answered,
  a wrong lock reporting "It was +2 — off by 2" and scoring `0% · ±2.0`,
  an exact lock "✓ The count is +2" scoring `50% · ±1.0`, and "Tell me"
  revealing the count without touching the score. The ♠ pill closes a live
  drill and hides the meter ("Count off"), the count dies with the shoe —
  a cut-card shuffle resets the meter to zero at 100% — and the score
  survives reloads. Under 🔊 mute a whole round — chips, flights, snaps and
  the drill's own cue — constructs zero audio nodes, while one unmuted
  chip clack immediately constructs one.
- **Sign-in outside localhost** — the live Pages build drives the public hub
  end to end, cross-origin: guest mint → verify → wallet (opening + starter
  grant) → a live round's `bj_bet` debit landing in the hub's own ledger
  (10,200 → 10,175 sampled), idempotent replays inert, 409
  `insufficient_funds` on an empty wallet, and the CORS preflight echoes the
  Pages origin with the ledger headers.
- **Offline, end to end** — with the host stopped for real, an offline
  navigation lands on the branded offline state carrying the exact URL in
  `?from=` (queries included); the line probe fails honestly through the
  worker (~2s), "Try now" falls back to waiting, and when the host returns
  the page flips to **Back online** and deals the player into exactly the
  page they wanted. The ledger still passes through untouched.
- **Clean pages** — `node --check` on every inline script, no console
  errors.
- **One shoe + settlement for both pages** — the **SHOE999 canon**
  (`test/shoe999.canon.js`) is spliced byte-identical into `table-16x9.html`
  and `offline.html`: the stack builder (composition-exact, Fisher-Yates),
  the draw, the cut-card draw, hand value (total AND soft flag), the floor's
  one settlement (bust 0, natural 3:2, win 2:1, push returns; a dealer's
  natural takes the stake — European), and the money-edge rounding. Pages
  keep their own flavors (4 decks vs 2, ledger chips vs a cosmetic bank)
  but every rule runs from the same code. `node test/shoe999.test.js`
  fails the moment the two copies drift, and pins the math: composition
  exact at 1/2/4/6 decks, totals and soft flags on the ace-boundary hands,
  all settlement kinds, 62.5 → 63 at the money edge, 5,000 cut draws in
  bounds. Re-unifying surfaced a real divergence: the live table had been
  paying naturals 1:1 — the canon pays **3:2 everywhere** (the table
  quantizes to whole chips at its money edge,  25 → 63, verified live
  through the hub's ledger; the practice bank keeps exact halves).
- **The leak drill** — the stacked shoe verified cell by cell: the
  shipped `leakDeal` extracted and driven through deal()'s real pop
  order for 17 cells (hard 4–20, the no-peek 11s, softs 13–19), every
  forced deal landing in its target class against its target upcard,
  soft 12 (A+A, a pair) correctly refused, and a first draft's retry
  loop — which restored the same two cards forever and could never hit
  its guard — caught by the harness and replaced with lift-and-stack
  (no draws churned). Live end to end: the forced hand landed 6,10 v 10
  exactly, a deliberate stand-on-15-v-7 miss persisted as `hard 15 v 7 ·
  n=1 · cost 2.64` (the hint said −2.6; the engine's own price), and the
  panel re-ranked with the fresh miss on top of 28 legacy 16-v-10 misses
  costing 0.4 apiece — the coach now aims the shoe at whatever leaks
  most.
- **The true-count training** — decksLeft/trueCount/spreadUnits extracted
  exactly as shipped and driven through real shoes: 52-of-104 division
  exact, the 0.25-deck rack floor firing only below 13 cards (rc 5 → tc 20
  at the empty rack), the spread table pinned (1 unit below tc 2, tc−1
  above, capped at 6), and 200 full-shoe exhaustion runs holding the
  sums. Live: 17 drills alternating run/true perfectly, TC stats counted
  separately from running stats, the meter carrying the deck readout, and
  the betting hint ladder sampled across its whole range from "True −4 —
  bet 1 unit" to "True +7 — the spread says 6 units".
- **The index plays (INDEX999)** — the canon shared byte-identical across
  both pages (drift guard) and driven at every exact threshold: each
  index silent below, firing at its number, doubles gated by canDouble,
  soft hands and non-index cells never firing; ten-density exact on
  built stacks, insurance edge positive only past 33.3% ten-density with
  a fresh shoe at 30.77% and 300-shoe Monte-Carlo holding 16/52; the
  chart extracted from the page and composed exactly as bookPlay does —
  flips land above the indices, charts survive below, 13 v 2 running
  both ways. **The coach now teaches the indices in the open**: the
  📖 Index pill opens the count's sheet — every flip with its number
  and its why ("hard 16 v 10 — stand at true +1 · tens left make a
  draw bust too often to chase"), the insurance turn, the running→true
  conversion and the spread ladder spelled out, and a live line that
  follows the shoe ("True +4 now — bet 3 units · live: hard 16 v 10 →
  stand · hard 15 v 10 → stand · hard 11 v A → double · hard 9 v 2 →
  double · insurance on") — liveness matching the canon at both edges
  in the suite. And before a flip ever fires, the mark teaches it: a
  hand whose cell has an index says so in the hint ("Book: Hit — its
  index stands at true +4 (now +2)"), non-index cells staying plain,
  so the numbers are learned long before they're needed. **The live
  table's overlay keeps its own session score** —
  accuracy and the chips each deviation threw away, priced by EV999 at
  the moment the book is marked and costed at the box's own stake;
  persisted separately from the practice shoe (`999.table.trainstats`
  vs the practice keys), so a night at the felt never muddies the
  drills — except on purpose: **the felt's mistakes hand themselves to
  the practice shoe.** At every settled round the overlay's misses
  ride into the practice floor's leak ledger (`999.practice.leaks`),
  cell for cell with the same names ("hard 20 v 10"), each priced at
  the  box's own stake; the ledger is read-merge-written one settle at
  a time so the floor's own entries are never clobbered, a hand
  abandoned mid-round teaches nothing, and the settle line says what
  crossed over ("· 1 miss to the practice shoe") — the drills there
  then deal the felt's worst cell on purpose. The overlay's score
  line carries the luck gap too — the first decision prices the
  round's book with the same EV999 (at the box's own stake), the
  settle banks it against the player box's felt movement, and the
  score line reads "Coach 83% · 19/23 · −2.9/dev · −13.1 luck" —
  the same word the practice pill reads, persisted in the trainstats
  and silent on a stakeless round. Live on the practice floor: the stacked "insurance v ace"
  cell dealt 10,7 v A with a ten waiting as the hole card — offer
  "Book: Decline — insurance turns at true +3 (now true −1)", decline
  "✓ Book play", an insured miss showing "Bet 25 + 12 ins" on the tray
  and the honest miss verdict; the settle line paying insurance 2:1
  exactly (bank 999 = 1000 − 25 − 12 + 36). Live on the table: a
  restored 16 v 10 at true +1 showing "Book: Stand —  the count play (hard 16 v 10 flips at +1 · now +1)", the stand judged "✓ book play —
  the count play", and the book line re-marking the hand after the
  insurance beat. Live scoring: a deliberate stand against the book's
  Hit showed "book says Hit · −6.0" and the score line "Coach 64% ·
  7/11 · −12.0/dev" — accuracy, decisions, and chips per deviation,
  all persisted. The leak drill now seeds its queue from the ledger's
  weakest cells, so "Next hand: <cell> — the shoe deals it to you" is
  a promise kept; insurance misses land in the ledger as "insurance v
  ace" and replay from the reel like any other miss. **The panel
  keeps two ledgers, one tab apart**: "this session" ranks the
  sitting's own miss classes by expected chips lost — every miss
  (hand and insurance) lands in both maps, the session one wiped by a
  reload — and totals it ("This sitting: −9 in 1 miss"), while "all
  time" shows the persistent ledger with its graduation states
  ("insurance v ace ×4 · −8 · clean 1/3"); the drill's queue stays
  on the all-time cells. Live: a deliberate stand on 9 v 10 against
  the book's hit landed as "hard 9 v 10 ×1 · −9" on the session tab
  while the all-time cell read ×2, the tabs toggling both ways. **The
  session tab reads its ranking against history**: a class can top the
  sitting without getting worse, so each row is priced against its own
  all-time average — bleeding more per miss than it ever has wears the
  flag ("▲144 a miss v 25 all time"), matching or better stays quiet,
  and the footer explains the glyph. **And every session row is a
  hand-off**: a "drill now" tap forces that cell past the all-time
  queue — the queue keeps its order, a retired cell tapped by name wakes
  at once, and the shoe stacks it the moment a bet lands ("Drill: hard
  16 v 10 — place any bet, the shoe stacks it"). Live: a stand-then-double
  on the drilled 16 v 10 (−0.3, then −288) flagged "×2 · −288 · ▲144 a
  miss v 25 all time", the tap announcing the hand-off before the next
  stacked deal. **The panel opens itself on a new class**: the first miss
  of a class this sitting — hand or insurance — flips the 🩹 pill on and
  swings the panel to the session tab mid-hand, ranked and tap-ready,
  without clobbering the hand's status; an open panel re-ranks instead,
  and the review reel keeps its box. Live: a hit against the book's
  Stand on 16 v 6 opened the panel on the spot with "hard 16 v 6 ×1 ·
  −139" ranked first. **The drill now
  graduates its students**: a cell that answers with the book three
  times running retires from the queue — shown muted on the panel with
  its honours ("🎓1 · back in 6") — and returns with spacing for a
  refresher (six served hands, doubling each re-graduation, capped at
  twenty-four, the clock persisted in `999.practice.grad`); any miss on
  the cell, at the drill or on the felt, yanks a graduate straight back
  and zeroes its streak, the panel showing the live streak meanwhile
  ("clean 1/3"), and an all-graduated ledger falls back to the classic
  16 v 10 so the drill never runs dry. Live end to end: hard 12 v 2
  retired at clock 3 ("back in 6"), the countdown ticked down on the
  classic hands, and the woken cell was dealt again the moment its rest
  was up — with the wake starving nothing when the classic loop held
  the queue (found live, fixed at the serve).
- **The speed-counting drill** — the full loop driven live both compressed
  and in REAL time: the flash phase held its wall clock (4651ms for 15
  cards at Fast ≈ 0.3s each), the recall timer ticked live (1.2s sampled),
  a counted run locked the exact target ("✓ +5 — best!", streak 1), a
  deliberate miss showed the honest two-sided verdict ("It was +4 — you
  said +3 · 1.2s") and reset the streak, stats persisted across reloads,
  and the session shoe never moved (100% · 2.0 dk before and after) — the
  stream draws from its own fresh deck.  **The cadence is adaptive and chases a personal edge**:
  after each run the pace tightens 6% on a hit (never less than 20ms)
  and eases back 12% on a miss (never less than 40ms) — but a streak
  of three presses harder (8%, min 25ms) and the miss that breaks a
  long streak eases gently (8%, min 20ms), so the drill rides the best
  run without punishing the collapse; bounded at 0.18s and 0.75s, the
  verdict telling the story ("cadence up → 0.28s", "eased to 0.32s",
  "at the floor/ceiling" at the bounds). **Each drill keeps its own
  tuned pace** (the running and true-count drills evolve separately,
  persisted per mode) and the stats line shows the edge the player has
  proven: fastest hit to slowest miss ("edge 0.28–0.35s", converging to
  "edge ≈0.34s" when the band closes). The Adaptive toggle (persisted,
  `999.practice.speedadapt`) turns it off, and the pace buttons reset
  the base the engine evolves from. The ♠ Count pill carries the drill's
  progress onto the main floor — best time ("⚡0.2s") and the live
  streak right beside the counting accuracy, refreshed the moment a
  run locks in, visible even with counting toggled off. **The true-count
  drill** — a second mode beside the pace row: the same flashing stream
  but a variable slice (15–35 cards of a fresh deck), a live decks-left
  readout ("0.69 dk left") ticking under the cards, recall of the TRUE
  count to one decimal (a ±0.1 stepper beside the ±1s), the lock graded
  on the exact tenth, misses showing the honest division ("RC −1 over
  0.65 dk"), the adaptive cadence riding both modes, per-mode books
  (`999.practice.speedtrue`), and the ♠ pill carrying whichever book is
  active. **The between-rounds drill now cycles three asks** — running,
  true (rounded), and TC-precision: the true count to one decimal
  against the precise two-decimal divisor shown in the question
  ("count ÷ 1.73 dk"), answered on a ±0.1 stepper beside the ±1s and
  graded on the exact tenth, with its own TCp accuracy on the ♠ pill
  and a legacy-safe slot in the persisted counting score. **The bet
  spread is scored too**: at every settle the stake laid is judged
  against the count's advice — spreadUnits at the DEAL-time true count
  — and a shortfall is priced like a strategy miss (half a percent of
  the stake per unplayed unit, capped where the spread caps), shown in
  the settle line ("the spread wanted 4 units (true +5): −0.5
  unplayed") and accumulated into the ♠ pill's betting hint as a
  Spread % and a −unplayed total (`999.practice.spread`). Over-betting
  is never punished; flat shoes cost nothing. **The felt keeps the
  engine's books too**: every decided round prices its expectation at
  the first click (the chosen play's EV999 price × stake, the
  insurance edge riding along when the ace shows) and the settle
  commits both legs once — a strip under the status line reads "EV
  −27.0 engine · −75 felt · −48.0 luck · 2 rounds", the gap being the
  luck the shoe dealt. Naturals (no decision to price) stay out of
  both sides, so the two always reconcile over the hands the engine
  can see; the book persists beside the reel (`999.practice.evsession`),
  so the pill's luck and the strip survive reloads and the band widens
  as the rounds pile up. **The
  gap rides the coach pill too**: after each settle the score line
  carries it ("Coach 83% · 19/23 · −2.9/dev · −9.0 luck"), the strip
  and the pill reading one source for the word, live-verified against
  a stood 17 v A (engine −16.0 · felt −25 · −9.0 both places). **And
  the luck is banded by its own spread**: each round banks a width —
  1.15 betting units of stake, doubled riding twice, insurance riding
  the ten density — so the gap reads as a distance in spreads: even
  inside one, cool or warm inside two, cold or hot inside three, freak
  past that ("−13.1 luck · even" on one small hand; a 500 double losing
  flat is a different animal). Hot and cold are sizes, not moods.
  **The replay reel keeps the
  dealer's hole card**: the European deal holds it in the shoe through
  the player's decision, so each stored miss is back-filled at settle
  with the card the dealer actually held, and the review stacks it
  fourth — first, up, second, hole — replaying the EXACT dealer hand
  you misplayed against (hole-less legacy entries replay as before).
- **The session review** — the reel verified end to end: a deliberate
  stand-on-soft-13-v-Q miss stocked the reel (`yc:['A','2'], ys:[1,2]`,
  cost 10.05 — the hint's −10.1), Review mode restacked the shoe with the
  ORIGINAL cards, and the felt dealt A♥ 2♦ against the Q exactly, suits
  included; the panel lists the reel costliest-first with a cursor on the
  hand in play, the house's stake refund lands at deal (a won replay is
  pure upside, a lost one free), one mode at a time is enforced with
  Leaks, and the reel holds the last twelve misses across reloads.
  **Same hand, two answers**: a replayed miss whose book play differs
  from the one you made now deals BOTH — first as you played it, then
  the book's way against the SAME dealer hand, the book leg popping the
  very card the shoe was holding (a stand book draws nothing, a double
  stakes twice and draws its second card) — and the settle line names
  the divergence ("— the book's hit would have won +50"); the review
  panel files the hand under "Same hand, both plays: yours (stand) lost
  −25 · book ('hit') lost −25", with `forkYou`/`forkBook` persisted on
  the entry so the both-ways verdict survives reloads. **The review
  ends on a scorecard**: the reel folds into the few cells behind
  most of the loss — cells named exactly like the ledger so the
  drills can aim at them, the walk stopping once it has passed
  sixty percent of the money (at most three rows, an honest share
  when the loss is spread thin) — and the panel closes on
  "Scorecard: hard 16 v 10 ×2 −50 (59%) · hard 12 v 2 ×1 −25 (29%)
  — 2 of 3 cells carry 88% of the −85. Drill these first."

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | The portal entry |
| `login-16x9.html` | The fullscreen 16:9 sign-in (2D canvas felt engine) |
| `table-16x9.html` | The fullscreen 16:9 table (raw WebGL 3D engine) |
| `offline.html` | The offline state IS a table — a playable practice shoe (cosmetic chips, no ledger), with the door back to the page you wanted |
| `manifest.webmanifest` | The PWA manifest — landscape fullscreen, home-screen install |
| `sw.js` | Installability service worker (network-first, `/hub/` untouched) |
| `make-icons.js` | Draws the PWA icons procedurally → `media/icon-*.png` |
| `serve.js` | Static host + same-origin `/hub` proxy (zero-dep Node) |
| `test/shoe999.canon.js` | The SHOE999 canon — one shoe + settlement module, byte-identical in both pages |
| `test/shoe999.test.js` | Drift guard (byte-equality against both pages) + settlement/shoe math |
| `test/ev999.mc.js` | Monte-Carlo + exact-recursion ground truth for the EV999 pricing engine |
| `test/ev999.crosscheck.js` | Book-vs-engine agreement sweep over every hand × upcard × double state |
| `test/leakdrill.test.js` | The stacked-shoe drill: every forced deal must land in its target cell |
| `test/truecount.test.js` | Decks-left, true count and the bet spread, against real shoes |
| `README.md` | This page |

Cloth palettes, the hub client and identity handling are vendored from
`999-bridge` (commit `5185558`) into the pages themselves — each page runs
from a single file, no imports, no build step. The cloth choice persists
under `maison21.theme` (what `maison-21/src/theme.ts` reads), with the
legacy `999.login.cloth.v1` key adopted and kept in sync.
