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
  landing carries that seat too** — the snap lands in the box it flew to,
  at the end of the whoosh's own ramp, so the ear arrives with the card.
  **The
  floor has air**: a room reverb synthesized in the page — no samples,
  no downloads — a 12ms pre-delay, three early reflections off the
  tables and rails, then a damped tail that reaches −60dB in its 1.35s
  RT and is normalized to 0.35 energy per channel; every voice sends
  to the room at its own level through the same 0.35-trimmed bus into
  a ConvolverNode straight to the destination — each family sends at
  its own level: the riffle leans in at **1.7×** (four decks filling
  the air), the whooshes swim at **1.5×** (they are air moving, so
  the room belongs to them), the stinger blooms at **1.4×**, the
  card snaps keep their plain share, and the chip
  clacks stay dry-ish at **0.6×** — ceramic near the cloth, with the
  room saved for what fills it, so the walk's ticks read close while
  its whooshes swim
  **The three small voices each get a send of their own, sized to
  the moment they mark**: the betting chime leans in hardest of all
  at **1.6×**, because calling a round across a quiet felt *is* the
  room; the cut-card whisper takes **1.25×**, further than it looks,
  because paper has almost no body of its own and what a whisper
  borrows is air; and the shoe's new tap is the driest thing on the
  table at **0.45×**, below even the clacks, because it fires on
  *every* card — a heavier send would stack one deal into a machine
  gun. Each pays for the tail it borrows out of its own dry level,
  so the send never buys loudness (the chime's notes dropped
  0.05/0.03 → 0.038/0.022 and the whisper's 0.05/0.055 →
  0.04/0.044 to pay for theirs). **The shoe taps**: every card
  leaving the shoe now clicks once — a short dry band-passed tick
  over a low body tone, panned to where the shoe physically stands
  and sending *after* the pan so the reflection keeps that side of
  the room, exactly as the clacks do. It fires at the release
  itself, before any announcement, so the cut card's whisper still
  lands on top of a shoe that has just been heard.
  **And the tap rises with penetration.** The first card off a full
  stack speaks from the weight of everything still behind it; the last
  one off a bare stack has nothing left to push against, so it reads
  emptier. One pure mapping (`tapVoice`) turns how deep the shoe is —
  `shoeDealt / shoeCut`, 0 at the top of a fresh stack, 1 at the cut —
  into the tap's voice: the band-passed tick climbs 2100 → 3400 Hz and
  sharpens (Q 2.2 → 4.0, a tighter filter being what “empty” sounds like),
  the body tone climbs 196 → 346 Hz and stops falling so far, and the body
  GAIN drops furthest (0.028 → 0.015) — that is the emptiness, the low
  voice thinning away under the click as the stack runs down. The tick
  never gets louder, so the shoe empties rather than shouts. Clamped at
  both ends, so a nonsense depth still sounds like a shoe, and monotone
  throughout, so a run of cards is heard as one rise. Measured on the
  rendered signal through a real Web Audio graph: the spectral centroid
  climbs 1661 → 2781 Hz from first card to cut, and the energy at 200 Hz
  falls by ~74%. So the shoe wears its depletion down its own voice.
  (stereo IR, and every send sits after its panner, so a panned deal
  **The practice floor has the same room and send system.** It had the
  same voices but no room at all — every sound went straight to the
  destination, which is exactly why they read flat beside the table's.
  It now carries the table's own apparatus: a synthesized IR (no samples,
  no downloads — air, then the first reflections off the rails, then a
  tail that loses its top end), a shared bus trimmed to **0.35**, and a
  `toRoom` send per voice. The floor's room is the SMALLER one, because the
  floor is: a 1.15s tail rather than 1.35s and first answers 18/29/41ms out
  rather than 21/33/47, so it is the same room at the size of one practice
  table. It has one room where the table crossfades a felt and a hall —
  there is no cinema on the floor to slide it toward, so it does not build
  a hall it could never reach, and a pin says so.
  **The sends are the table's, value for value**: riffle **1.7** (four decks
  filling the air), whoosh **1.5** (it IS air, so it swims), stinger **1.4**
  (the verdict blooming), clacks **0.6** (dry-ish, near the cloth), and the
  coach's call at **1.5** — calling across a quiet felt IS the room. The
  card snap stays the one voice left plain, on purpose: it lands ON the cloth
  and its impact already announces itself. Sends sit AFTER the panner, so a
  panned deal keeps its direction in the reflections rather than only in the
  air. And each voice that sends pays for the tail out of its own dry level
  (the clacks 0.28/0.18 → 0.25/0.16, the cue 0.05 → 0.038, the stinger
  0.17/0.19 → 0.136/0.152), so the send never buys loudness. Verified in
  the browser: the live floor builds one convolver fed a stereo 1317ms IR,
  and a single chip clack now opens four gain nodes — its two voice envelopes
  plus two room sends, where it opened two before.
  **Both felts carry a Levels panel** — 🎹 Levels, beside the floor's
  leaks and the table's coach. Every voice a surface can sound gets a
  row: ▶ hears it on its own, no round and no deal, ▼▲ step its gain and
  its send, and ↺ puts that one voice back where it shipped. So the mix
  can be heard and dialled without playing a hand to reach the sound
  you want to change. The numbers live in `room999.js`, the one voice
  registry both pages load, and neither page keeps a copy of one.
  **The tuning is shared, and it outlives the reload.** One record under
  `999.room.tuning`: step the table's shoe tap and the floor's tap is
  that same tap, because both pages read the same registry (six voices
  are shared; the floor's cue and the table's cut, bets, tap and bonus
  belong to their own surface). Steps are quanta, not floats — 0 · 0.25
  · 0.5 · 0.75 · 1 · 1.25 · 1.5 · 2× — so the record stays legible
  ("clack send 0.75×") and two people tuning a voice land on the same
  number. A junk entry falls back to shipped on its own and the rest of
  the record rides on; a moved voice is marked tuned, and only then does
  the panel offer ↺ reset every voice.
  **The one voice that ships dry can still be tuned into the room.** The
  snap lands ON the cloth, so it ships at 0×; no multiplier can lift a
  zero, so its send ladder is absolute — untouched it reads 0×, and the
  first step up turns the room on instead of scaling a silence. The
  bottom rung of any ladder is silence and stays silence: stepping past
  it is refused, not wrapped round to the middle.
  (
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
  clacks stay centered, never broken. **And the walk MOVES, per seat**:
  stepping to a new seat per chip made a run of clacks read as N dots
  on N places, and the eye had nothing to follow between them. Each
  clack now GLIDES into its own seat from the seat before it, over
  exactly the stagger that separates them, so a payout crosses the
  felt as one continuous movement — the same two-argument ramp the
  deal's whoosh flies, so the walk and the deal share one idiom. The
  first clack starts where the chips leave (it IS the leaving), a lone
  chip or a seatless fan has no origin and holds still exactly as
  before, both ends of every glide clamp to the rails, and the clack's
  own tuning, distance model and room send are untouched — the panned
  clacks still swim upstream of the shared send. `panDur` is in
  **milliseconds**, like every other delay on the felt, so the fan can
  hand the clack the stagger it already keeps. Live: a settle produced
  walk clacks gliding **90ms** each (−0.85 → −0.355, −0.203 → +0.528,
  +0.85 → +0.316), against the deal's own 430ms whooshes.
  **And the landing keeps the
  flight's distance**: the whoosh already arrives through the flight's
  air (16.5kHz near → 1.3kHz far on the shared near model), but the
  IMPACT used to announce every card at the same brightness and level
  however far it came — a card to the far rail flew in dark and then
  snapped as if it had landed at your elbow. The snap now rides its own
  **subtler** ladder (cloth eats less air than a flight does):
  16.5kHz → 2.2kHz, tick 3000 → 1750Hz, crack 5200 → 3400Hz, level ×0.68
  at the far rail. Both deal paths compute the flight distance **once**
  and hand it to both voices, so the whoosh and the landing can never
  disagree about how far the card came. The snap stays the felt's one
  dry voice — it takes the veil but never a room send — and with no
  distance at all it is byte-for-byte the plain snap the felt always had.
  **The snap also LANDS IN A PLACE**: the whoosh walks the channels from
  the shoe to the box, and then the impact used to fire dead centre, so the
  last thing you heard contradicted where the card was. The snap now takes
  the same seat its whoosh arrived on — the box, not the shoe — so the ear
  follows the card all the way down. The panner is the snap's **tail**: it
  sits after the veil and feeds the master, still dry, still no room send.
  It is one hit, so it takes its seat and never travels (no ramp), a wild
  seat clamps, and without the panner API the snap stays centered. A
  seated snap that is not veiled still routes its voices through the seat,
  and seating alone changes no tuning — 3000/5200 at full level stands.
  Live: two flights opened at the shoe +0.85, ramped to the box at −0.29
  and −0.27, and each snap landed on exactly the seat its whoosh arrived on.
  **And every chip that LANDS on the
  felt is seated the same way**, so the wager cascade at the deal sweeps
  the same arc the payout walk sweeps at the settle: the six boxes' chips
  each clack from their own box (`placeBet` now takes the seat it landed
  on, and the bots' opening cascade seats each chip at its own), all
  projected by the same camera through the same `panFor`, measured at
  `[-0.76 -0.46 -0.16 0.15 0.45 0.75]` across the six boxes — 1.51 of
  stereo, no box sharing a place, none past the 0.85 rail. Your own
  stake, and a double's second stake, land where the camera holds your
  box. The one clack that stays centered is the bet bar's own click:
  choosing a denomination is an interface sound, not a chip on the
  cloth. Gated by
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
  panner API everything stays centered). **And the shoe's own ceremony
  sits at the shoe**: the riffle that builds the deck used to sound
  like it came from nowhere, while every card left it a beat later
  from exactly that screen seat — now all 17 bursts and 7 tones of the
  lift-riffle-square sit there together, one panner set once at the
  ceremony's start. It's paper standing still, so that seat is held
  and never slid (the *deal*'s whoosh still pans shoe to hand, because
  a card is moving). The clacks, coach cue and stinger keep the center
  — they aren't cards, and this felt has one hand. The house chip
  (inline SVG, so the brand can't
  404 offline) brands it, the card snaps and riffle sound through the app's
  own 🔊 toggle, and the page the player was bound for rides along in
  `?from=`. The moment the origin answers the pill offers the door straight
  back to exactly that page — immediately when only the shoe is running,
  never yanked out of a live hand. The **coach** lives here too: at every
  decision the book play is badged on its button ("book"), each click is
  judged — "✓ Book play" or "Book says Stand", with a soft cue — and the
  running score persists with the tray. The book is the shoe's own (two
  decks, S17, doubles degrading gracefully when they aren't legal), and
  the 🎓 pill turns the whole mentor off. **Pairs split**: a two-card
  pair turns the pair lines on — aces and eights always, 9s stand only
  to a 7, 10, or ace, 7s and 6s and 3s and 2s split low, 4s split 5–6
  (DAS), and 5s and tens fall through to their hard totals — so the book
  badges Split. DAS is on, a fresh pair may be re-split to four hands,
  and split aces take one card and stand. Each split hand draws its own
  card and stakes on its own (a split double lays the hand's stake
  again), the felt shows every hand with its own total and lights the
  one in play, and settle prices each hand by the canon against the
  same dealer hand; a split has no placed price, so the round steps out
  of the EV strip's reconciliation. The **🩹 Leaks**
  mode is where misses go to die: every priced miss lands in a persisted
  leak ledger (book cell → count + chips thrown away) through one shared
  write — `leakMiss(cell, cost)` stamps the drill clock, prices the yank
  against any graduation, feeds the sitting's map and reveals the panel,
  so a miss named anywhere is drilled the same way (the felt, the
  insurance decision, or the index quiz's own wrong answers), and
  `leakRelief` takes the same toll back when a lesson is corrected. A
  panel ranks your
  worst cells by cost, and toggling it deals those EXACT hands — the shoe
  is stacked at deal time (three cards lifted from the shoe: hand, hand,
  upcard; a spent shoe earns a fresh shuffle) so "hard 16 v 10" returns
  whole, not something like it. The panel's two tabs compare this sitting
  against the whole ledger — a ▲ marks any class bleeding worse than its
  own history, and each sitting row carries a one-tap drill-now hand-off.
  Every row also carries its **week over week in chips**: the chips leaked
  this week against last week ("▼ 20 v 40"), tinted green when the leak is
  shrinking and red when it is growing — the pill's arrow, opened up to
  the whole panel with the money behind it. **The chart's bars carry the
  same figures**, so a marker is no longer the pill's arrow alone: the
  arrow said which way a cell was moving but never how fast, and a cell
  that fell 400 to 8 and one that fell 9 to 8 both wore a green down.
  The bar's marker now reads "▼ 8 v 400" beside it, and hovers to "−8
  this week against −400 last week · bleeding less than last week" so
  the two numbers are never ambiguous. Row, bar **and the review scorecard**
  are drawn by one function off one `weekSplit` reading, so the three
  places cannot drift into disagreeing, and the marker stays small enough
  not to crowd out the bar figure it sits beside. (A cell genuinely recovering reads a
  negative this week — that is the existing row arithmetic, not a new
  one: leaked 30 fewer chips than the 40 it leaked last week.)
  Beside the chip rides a
  **trend sparkline**: the cell's leak per week, oldest to newest, drawn
  as eight steps of ink scaled to its own range and tinted by direction
  (green falling, red climbing, grey flat). Where the chip gives the
  last delta in chips, the spark gives the line behind it — a cell
  bleeding more each week climbs, one being drilled away fades — and
  both read the same weekly snapshots (`999.practice.weekbase`; a cell
  that never leaked draws no line). The eight weeks on the line are a
  **window, not a cut**: the walk keeps every week on record and the
  line shows a page of it, so a cell with a season of history keeps all
  of it and `‹` walks back a page at a time. Only the arrow that leads
  somewhere is drawn — the newest page offers no way forward, the
  oldest no way back — and a control that cannot move is a lie about
  the record. The page is kept per cell, so scrolling one ladder leaves
  every other exactly where it was, and it survives the redraw: the
  line, the week-by-week figures and the weekly chip are all read from
  that one window, so a scrolled-back line can never sit beside the
  newest figures. The scroll is checked before the bar's own drill on
  both felts, so reaching for an older week is never handed a hand,
  and it answers Enter and Space as well as a tap.
  On the **live table the ladder is a control too**, the way the floor's
  has always been: each week is its own button naming its own chips,
  and a tap opens that cell's week-by-week figures on that week — one
  figure per week plus the window's total, the chosen one marked on the
  strip *and* on the ladder. The line itself opens every figure it was
  drawn from, and tapping the chosen week again clears the choice. One
  deliberate difference from the floor: a week's tap here opens the
  figures and **never** seeds a drill. On the floor a week tap is also
  the way to drill, but on the table the bar row is that gesture, and
  a player asking "which week was that?" should not have a hand dealt at
  the other felt as the price of asking. Both surfaces name a week in
  the same words and read it through the shared `leakFig`, so a
  recovering week prints its own single minus on either. The chip itself
  now **counts up** on the live table, as the practice floor's does: the
  bar's chips ride the same 550ms cubic ease-out, one 70ms stagger per
  bar so a figure arrives with the bar it belongs to, and `tabular-nums`
  so the number does not jitter sideways while it climbs. It carries the
  floor's two guards with it — a player who asks for reduced motion is
  handed the figures outright, and the landing is also armed on a timer,
  so a tab that is not painting (its frames throttled to nothing) still
  gets its number rather than freezing on a 0. Previously the table grew
  every bar from zero while the figure beside it sat at its final value
  from the first frame: the bar climbed and the number stood still, and a
  number that does not move while the thing it counts does reads as
  pasted on. The week-over-week mark beside the cost was the last bar of
  the row still behind the floor: the table drew the direction glyph
  alone, so it said which way a cell was bleeding and never by how much.
  It now prints the figures the floor prints — "▼ 35 v 55" — from the same shared `weekPillHtml`, so neither felt can drift into a different reading of one cell.
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
  "quiz me — a fresh count" tap that deals a true count (−6 to +10),
  the player taps every play they believe is LIVE at it — nine classes
  plus insurance by name — and the lock grades against the canon both
  ways ("missed: hard 10 v 10" or "a clean card"). **It also asks what
  the count is worth.** The card used to print the stake ("· 4 units
  riding on it"), which handed over the answer it was meant to test; now
  it asks instead: "which plays are LIVE, and what is the count worth?"
  with a tappable ladder of units beside it, 1 through the top rung the
  spread ever lays (`SPREAD_TOP`, read off `spreadUnits` itself rather
  than written twice). **And the card asks the conversion too, at a
  depth**: the true-count half of the skill — running count ÷ decks
  left — was taught on the sheet but never tested, so the division
  every count play rides went un-drilled. Each card now states a
  running count and a deck depth ("Running count +31 with 3 decks
  left — what is the true count?") and the player answers on the same
  −6…+10 ladder the plays are read at, tapping it like the units
  ladder. **The ask is deliberately not the card's own count** — the
  card prints that in full, so a division whose answer were already on
  the page would be a reading, not a conversion; the quotient is drawn
  separately and carries its own truth, so a wrong one is a division
  missed ("-6 named as the true count"). Depth comes from a menu
  (3–6 decks) and always carries a remainder, sized so the floor's own
  rule — `Math.round(rc / dk)`, the one `trueCount` uses — lands on
  the stated truth every time, at either sign. It counts as an answer
  like the rest: an unanswered conversion cannot grade clean, and a
  clean card says so ("…, the spread right, the conversion right").
  Neither the ask nor its wrongness is a class, so it feeds no ledger.
  **And the wrong spread is priced in chips, not
  only named**: the ladder says what the count is worth, so anything
  else puts chips up or leaves them down, and the grade says how many —
  `stakeCost` is the gap in units times the floor's own unit price (25,
  the same flat figure a wrong class costs, so the quiz still never
  out-shouts the felt). At true +5, where the spread lays four, staking
  six reads "+ 6 units staked −50" and staking one reads
  "1 unit staked −75", because chips left down are chips too. A right
  spread and an unanswered one both price at zero. It feeds no ledger
  — there is no class to hang a wrong spread on, and `quizCellOf`
  still returns null for a priced stake, so the grade's drill line
  lists classes only. Both halves ride the grade — naming every live
  play and staking a unit at true +5 is still a miss ("1 unit
  staked −75"), staking six at true +3 — where the spread lays two — is
  an over-name ("+ 6 units staked −100"), and
  saying nothing is neither right nor wrong but never clean ("every live
  play named — the spread left unanswered"). The grade then reveals what
  the spread would have laid. **And a blown card drills itself**: every
  cell the card named wrong — over-named or missed alike — lands in the
  leak ledgers at the floor's smallest bet (25 chips, flat by design so
  the quiz never out-shouts the felt's own misses), through the same
  `leakMiss` path a hand miss uses, so the toll is stamped by the drill
  clock, priced against any graduation, and the drill queue rebuilds to
  serve it. A wrong *stake* feeds nothing — there is no hand to deal for
  it. The card remembers what it has already fed, so grading twice never
  double-charges, and a re-lock that fixes the picks takes the old tolls
  back out and prunes them from the queue; a class new to the sitting
  opens the leak panel on its own, exactly as a first felt miss does.
  **And the blown cell is dealt at once** (`quizAutoDrill`): a card is not
  a hand, so the lesson used to sit in the queue waiting for the next
  felt hand to come round — now the first class the card named wrong is
  the forced hand right there, through the same `drillNow(cell, true)`
  the leak rows use: free and unbooked while betting is open ("the house
  staked this one, it costs nothing"), armed for the next hand when it
  is not, and declined outright when the quiz is not a feed source
  today or the replay reel owns the box. A wrong stake still deals
  nothing. **And the grade names its own drills**: every class the
  card marked wrong is its own tap on a `Drill it now:` line under the
  answers — over-named cells and missed ones alike, the count's own
  insurance bet among them, a wrong stake never listed — so a miss
  leads into the queue where it is read instead of having to be found
  again later; one press deals it at once while betting is open, or
  arms it for the next hand when one is already out. A card can be
  fixed and re-locked (the card
  scores once, the re-lock replaces its grade), the score rides the sheet
  as clean cards over cards graded, and "a fresh count" deals again.
  **That score is
  remembered**: it persists in `999.practice.quizscore` beside the coach's
  and the count's, so the record of what you KNOW survives the reload
  rather than resetting to whatever card happens to be open. Every card
  holds that same score object rather than a copy, so a graded card (and
  a re-lock that breaks it again) writes straight through, and the
  teaching footer names it whenever the sheet is not mid-quiz ("· quiz
  0/3 clean (0%)"). On the teach sheet
  itself the flips announce themselves: each row goes gold with a ▸
  the count it crosses — the live rows read gold beside the footer's
  live line, refreshed with every dealt card. **Index discipline is
  judged apart**: every decision where the count play stood against
  the chart — the nine hand flips, plus the count's own insurance bet
  against the chart's decline — asks the player, and the follow rate
  rides the ♠ pill ("· ix 5/7") and the sheet's footer ("count plays
  followed 5/7"), persisted apart from the coach score: the chart's
  easy answers never pad it. **And that rate is split by cell**: each
  index row carries your own record for that flip ("hard 16 v 10 — stand
  at true +1 · … · 3/3", green when you take every offer it gave you,
  red when you never did, plain in between), the count's insurance ask
  included, and the footer tallies the split ("· you take 3 · never 2")
  — so a cell you always take beside one you always miss no longer
  cancel in the total. Kept in the same `999.practice.ixstats`, one
  counter pair per cell. **And the never record drills from the sheet**:
  the red 0/N chip is itself the tap — one press hands that cell to the
  same forced hand the leak rows serve ("Drill: hard 15 v 10 · place any
  bet, the shoe stacks it"), so the count play you always miss is drilled
  right where the record names it, by tap or by Enter. A mastered cell's
  record reads but does not tap, and a ledger emptied by a fixed quiz
  pick says so instead of vanishing. **And the count cell you drilled
  last is waiting when you come back**: any count play handed to the
  forced hand is remembered (`999.practice.lastix` — count plays only,
  insurance included, never a leak row's class), and the next visit
  opens the drill straight into it ("Drill: hard 15 v 10 — where you left
  it last visit, place any bet"), the panel already ranked and the shoe
  set to serve it. It is one hand, not a standing order — the queue is
  built at the same moment and resumes the hand after, so the drill is
  never pinned to one class — and it never fires over a live hand or a
  stake already down. A name the ledger has lost, a class the count has
  no opinion about, or one that has retired takes its name with it and
  the visit opens exactly as it would have. Live: a remembered
  `hard 15 v 10` dealt 5 + 10 against a 10 at true +1 (now −1) with the
  panel open; the same key pointed at a cell the ledger had lost left
  the visit bare ("Place your bet", no panel, key dropped).
  **And the refused ask comes straight
  back**: the recent-asks line makes every refused entry its own tap —
  one press deals the play just let pass as the forced hand, before the
  miss cools (a taken ask and a mastered cell's refusal read only).
  **The quiz aims itself at those
  blind spots**:
  the fresh count is drawn from the same −6 to +10 ladder but weighted,
  not uniform — each rung is scored by the live cells it puts on the
  card and how weak each of those cells is, so a true count that lights
  up a cell you always get wrong is dealt far more often. Every rung
  keeps a flat floor weight so a cold shoe's lone 13 v 2 and a flat zero
  are never starved. **Weakness is the worse of two signals, not their
  sum**: the discipline you have shown on a cell (how often you refused
  the count's play there) and the tolls that cell has taken off the felt
  and off earlier cards (`leakRatios`, the leak ledger's own decayed
  ranking folded to 0–1 against the worst leak — so a cell you take
  every single time but keep losing still pulls the draw, and a cell
  that has cooled or been mastered out of the drill stops pulling it).
  A 0/4 record on hard 15 v 10, or 120 chips of ledger on the same cell,
  each sends ~70% of cards to +4 and above. **And the card says why it
  was dealt that count**: the rung it actually landed on gets its own
  reading, printed above the picks it explains — every play live at
  that count, how hard each one pulls on this player, and which record
  is pulling. It is the sampler's own `quizWeak`, read at the dealt rung
  rather than across the whole ladder, so the card cannot flatter its
  own draw: live on a card dealt at true +7, "Why this count: hard 15 v
  10 100% — you took it 0 of 3 times it offered · hard 12 v 2 100% — it
  has cost you −90 chips · insurance v ace 100% — you took it 0 of 2
  times it offered · hard 12 v 3 67% — you took it 1 of 3 times it
  offered · and 1 more leaning on you." Shares below a third read calm
  rather than red, a play the count does not light up is never borrowed
  from another rung (13 v 2 belongs to a card at −1 or lower, and to no
  card above +1), insurance is listed whenever the count turns it on,
  the aim decides which record speaks (aimed at the refusals, the
  ledger stays quiet, and the other way round), and the two honest
  silences are said outright — a fair sample says it is one, and a rung
  nothing leans says "nothing leans it — no refusals, no tolls. An
  honest rung" rather than inventing a motive.
  **And the aim is the
  player's, both signals apart**: the sheet's footer carries the switch
  ("· the draw leans to your weak cells — tap to the refuse · to the
  ledger · to a fair sample"), and each tap walks the four: **both**
  (the old default, whichever signal bites harder), **refuse** (the
  discipline half only — the plays you let pass, a reading habit to
  fix), **ledger** (the bleeding half only — the classes you keep
  getting wrong, a hand to relearn), and **off** (a fair sample: every
  rung of the −6…+10 ladder equal, no cell named as the aim, so a clean
  session measures what the chart actually gives). The choice persists
  in `999.practice.quizlean` — an older on/off save still reads back
  whole. The status line names the
  aim: "the count's quiz — true +5 on the card; name the live plays ·
  drills hard 15 v 10". **And the weighting is on the sheet, live**:
  between the recent asks and the conversion explainer, one grey line
  reads out what the draw is actually made of right now — the four
  strongest pulls, each with the cell, how hard it pulls, and the band
  of the ladder it pulls over ("The draw is pulled by: hard 15 v 10 100%
  (+4…) · hard 13 v 2 100% (−6…−1) · hard 16 v 10 50% (+1…) · hard 12 v 3
  50% (+2…)"), with the remainder counted rather than listed ("· and 1
  weaker"). It reads the sampler's own `quizWeak` and `leakRatios`, not a
  re-derivation, so the sheet cannot flatter the draw it describes, and
  it moves as the records and the ledger move; the ladder it measures is
  the draw's own `QUIZ_LADDER_LO/HI` (−6…+10), shared with `quizPickTc`
  so the two cannot drift apart. The three quiet cases say so outright:
  a fair sample reads "The draw: a fair sample — nothing pulls it, every
  rung equally.", an untouched ledger reads "The draw: nothing pulls it
  yet — no refusals, no tolls.", and the aim decides which half shows —
  under **refuse** a ledger-only bleed drops out of the line entirely.
  **And the strength of the pull is the player's too**: five rungs from a
  flat uniform draw to a brutal lean, walked by a second chip beside the
  aim ("· the pull leans — tap for one that leans hard"), each tap naming
  the rung after it in words that hold in either direction so the wrap
  cannot lie, and each dealing at once so the pull is heard on the very
  next draw. The ladder is `QUIZ_BIASES` — **flat** 0 (a uniform draw,
  every rung equal), **soft** 0.6, **even** 1.5, **hard** 3, **brutal** 6
  — with the shipped 1.5 left in the middle as the default, so a save
  that predates the control behaves exactly as it did. It persists
  beside the aim as `{aim, bias}` in `999.practice.quizlean`, and an
  older save with no strength of its own reads back whole. Only the pull
  above the floor is tuned, never the floor: every rung keeps weight 1
  at every strength, so the ends of the ladder stay reachable even at a
  brutal lean. **A flat pull is a fair sample whatever the aim says**:
  the pick reads the whole table as one, no cell is named as the aim,
  and the sheet says "The draw: a fair sample — nothing pulls it, every
  rung equally." The readout names the strength in force on the same
  line the pulls are on ("… hard 12 v 3 50% (+2…) — leans hard"), so the
  tuning is visible where the pull is read. **And the last few asks are named**: the sheet
  keeps the most recent five (`999.practice.ixlog`, newest first) — the
  cell, the true count it fired at, and whether you took it or refused,
  tinted green taken / red refused ("Recent asks: hard 16 v 10 at true
  +2 taken · hard 15 v 10 at true +4 refused"). The panels read and
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
- **Four engines, one file each, both pages load them** — `shoe999.js`,
  `ev999.js`, `index999.js` and `luck999.js` are plain `<script>` modules
  (window + `module.exports`, no build step, no imports) that BOTH pages
  load by tag. They used to be three canon blocks pasted into each page
  and kept honest by a byte-equality guard plus two splice scripts —
  duplication with paperwork. There is now no second copy to drift, so
  the guard flipped sense: `test/engines.test.js` pins that each page
  loads the file, that no page has quietly grown an inline copy of the
  engine again, and that every engine tag precedes the page's own script.
  `test/shoe999.test.js` and `test/index999.test.js` are now behavior
  only, `require`-ing the shipped file.
  **SHOE999** is the stack builder (composition-exact, Fisher-Yates),
  the draw, the cut-card draw, hand value (total AND soft flag), the floor's
  one settlement (bust 0, natural 3:2, win 2:1, push returns; a dealer's
  natural takes the stake — European), and the money-edge rounding. Pages
  keep their own flavors (4 decks vs 2, ledger chips vs a cosmetic bank)
  but every rule runs from the same code. `node test/shoe999.test.js`
  pins the math: composition
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
- **The index plays (INDEX999)** — the shipped module both pages load, and
  driven at every exact threshold: each
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
  then deal the felt's worst cell on purpose. **And the ledger wears
  the felt's share**: every hand-off stamps its cell with how many of
  its misses crossed over, so the all-time rows read their provenance
  at a glance ("hard 16 v 10 ×7 · −34 · 🎰 3 of 7 from the felt";
  "🎰 all 4 from the felt" when the felt owns the whole record) while
  the floor's own misses stay unstamped — and a master keeps its
  honours even when the felt misses on it. **And the ledger now wears
  the recall share too**: a blown quiz card stamps its cell the same
  way, so a class drilled by remembering is distinguishable from one the
  felt caught on instinct — "hard 15 v 10 ×2 · −50 · 📝 all 2 by recall"
  for a cell only the cards ever caught, "📝 1 of 3 by recall" beside a
  felt share on a mixed cell, and no badge at all when the felt owns the
  record. The share travels with the toll: a re-lock that takes a quiz
  toll back takes its share back (floored at zero, and gone with the
  cell when the last toll stands), and the sitting's own ledger carries
  it too, so both tabs read their provenance. **And the reel keeps the
  whole hands**: the settle hands the felt's misses to the practice
  shoe's replay reel — cards, suits, upcard, the hole dealt in, the
  chosen play against the book's, priced at the box's own stake — so
  the review replays the live table's mistakes on the practice felt
  with the side-by-side fork, rows badged "🎰 the felt" and the footer
  counting the crossings ("🎰 1 crossed over from the live table"),
  the reel holding the last twelve across both tables. The overlay's score
  line carries the luck gap too — the first decision prices the
  round's book with the same EV999 (at the box's own stake), the
  settle banks it against the player box's felt movement, and the score line reads
  "Coach 83% · 19/23 · −2.9/dev · −13.1 luck · even · −0.1σ" — the same
  word, band and sigma the practice pill reads, persisted in the trainstats
  and silent on a stakeless round. **And that same round hands off to the
  practice book**: at settle the round's price, felt movement and spread are
  read-merge-written into the floor's reconciliation
  (`999.practice.evsession`) — the same merge the leak ledger and reel
  already use, one settle at a time — so a night at the felt and a sitting
  at the shoe read one running ledger, every staked round adding while the
  floor's own rounds stay untouched. **And the settle line carries the
  round's own gap**: the payout-walk status reads the misses handed over
  and this round's luck in one sentence — "Round settles — the payout walk
  · 1 miss to the practice shoe · −8.5 luck, both felts reconcile" — the
  felt against the engine, the one number both books now bank, so the
  table's felt and the floor's book reconcile in the same breath.
  **And the practice floor's own settle line says the same thing**: its
  verdict line ends on the round's own gap in the table's exact words —
  "You win · +31.3 luck, both felts reconcile" — built from the floor's
  own legs (insurance riding both), only when the round was priced, so
  a review replay or a free drill narrates nothing it cannot stand
  behind. Live, over a two-round sitting: round 2's felt was `50 − 25
  = 25` against an engine `−6.8 − (−0.5) = −6.3`, and the line printed
  `+31.3` — the same arithmetic the strip's session total reads.
  **And the measured strip rides the
  overlay too**: beneath the score the practice floor's reconciliation
  runs off the table's own books — "EV −2.0 engine · +400 felt · +402.0
  luck · 3 rounds · +2.0σ hot" — the gap divided by the session's
  accumulated spread (each settled round banks the player box's stake at
  1.15 units, a double riding as a wider stake), signed and banded, the
  σ kept lowercase against the overlay's uppercasing; the table banks
  no insurance leg, so only the hand widens it, and a book from before
  the spread keeps its totals with the band waiting.
  **The overlay’s archived sessions speak that same scale.** The rows under
  the strip ("Sessions · luck vs the engine", the last six books) used to
  be scored on raw chips against the worst row — good/bad/even on a ±0.05
  chip threshold. That cannot rank a run: a −1 over three rounds and a −10
  over thirty are not the same luck, and one chip axis calls them alike. Each
  row now measures its own gap in its own accumulated spread, through the
  same `LUCK999` band the strip reads, and prints the band word and the
  signed sigma: "−2.1σ cold", "+3.2σ freak hot", "+0.0σ even". The bar
  rides that sigma too, three spreads filling the row, so a freak visibly
  fills it and a merely-cold session does not — the length means the same
  thing on an archived row as on the live strip. An outlier still wears the
  glow, from the same `out` test, so a freak sitting in the history looks
  like the freak it was. A session archived before the spread was banked
  has no scale of its own and says "no spread" rather than borrowing
  another’s. So both felts read luck the one way: even / cool / warm /
  cold / hot / freak, signed, in sigma. **And the overlay
  folds the felt's own recoverable money**: the same EV-left chart the
  review draws — the sitting's miss cells cut to the few behind most of
  the loss (Pareto, at most three rows), each bar the chips fixing that
  cell wins back, scaled to the worst, with the recovery tail ("Fix it:
  +5 back · 3 still behind the rest.") — rides under the strip, its
  bars growing in red as the score redraws. **And every EV bar names
  itself on hover**, on both surfaces: the chips behind *that* bar, the
  miss count the cell carries, and the running recovery if you fix
  every bar down to there — "hard 16 v 10 · −336 chips behind this bar ·
  9 misses in this cell · 336 back if you fix every bar down to here".
  The row already named the cell and the money; this is the arithmetic
  behind the picture, reachable without reading the line twice. That
  meant threading the miss count through both folds (`evLeft` and the
  table's `scoreT` kept only cell and cost), and escaping the cell name
  for an attribute — it is ledger data, and the reel is readable by any
  script on the origin. Live on the practice floor: two bars drawing
  "−120 / 6 misses / 120 back" and "−70 / 5 misses / 190 back", widths
  100% and 58%. The table keeps its own
  sitting in memory (wiped on reload), apart from the ledger and reel
  it hands to the practice shoe. **And the table's chart draws the way
  the review's does**: its bars **sweep in worst-first, 70 ms apart**,
  so the chart settles as one read instead of popping row by row, and
  each bar carries the cell's **week-over-week direction** as a small
  marker — ▼ green when the class is bleeding less than last week, ▲
  red when it bleeds more, `·` when it bleeds the same. The marker is
  measured against the **same Monday-midnight week split and the same
  opening snapshots** the practice floor uses, read from the shared
  `999.practice.weekbase`, so a marker here means what a marker there
  means. **That sameness is now structural, not a promise**: the whole
  reading — `weekStart`, `prevWeek`, `nextWeek`, `leakedIn`, `weekSplit`
  and `weekDir` — lives in `luck999.js`, which both pages load. It used
  to be written twice, as the floor's `leakedIn` over its own ledger
  and the table's `leakedInT` over the same one handed in, and the two
  copies were the same arithmetic under two names: `prevWeek` and
  `prevWeekT` line for line. A week that ran to a different boundary on
  one surface would have disagreed with the other in silence. The module
  version is **pure** — the ledger and the snapshot map are arguments,
  never storage — so the floor binds its own and the table binds the
  floor's read back, and neither can reach the other's bookkeeping.
  What stays on each page is only *where* the snapshots are stored and
  *when* they are written: policy, not arithmetic. A pin now fails the
  build if a page grows its own copy, and if a page keeps one it must be
  a pure `return LUCK999.…` binding and nothing else.
  **It says nothing when nothing can be weighed**: no last week
  to compare against, or no closing snapshot for it, and the row wears
  no marker at all rather than inventing a direction. Live on the
  table: three bars drawing at 0/70/140 ms, and a `hard 16 v 10` bar
  wearing ▲ red for a cell that leaked 30 this week against 0 last
  week. **And the felt has a session review of its own**: a `⏪ Review`
  beside the coach toggle opens a report rather than the live strip —
  the sitting's **scorecard** (every cell it missed, costliest first,
  with the miss count, the chips and each cell's share of the loss:
  "the whole −100 sits in 2 cells"), the **hands taken off the book's
  line** read back off the reel the felt already hands the practice
  shoe (you played X, book Y, and what it cost), and **the same
  recoverable-money chart** the overlay carries. The chart repeats, so
  the report draws it under its own ids rather than sharing the
  overlay's — two elements with one id is a fault the DOM will not
  report — and a bar named in the report names the cell exactly as a
  bar named in the overlay would. The report **rides the overlay's
  redraw**, so it can never disagree with the strip it repeats, and a
  sitting with no miss says so plainly and draws no chart rather than
  inventing an empty one.
  **And the table's own chart is a way
  in**: a bar there is a button, the way the practice floor's bars
  already were, and a tap hands that cell to the floor's drill. The
  loss itself is already in the ledger — the settle flushed this very
  cell to it with its chips — so a tap adds **no money and no miss**.
  It writes a request stamp (`qs`) on the row the floor already holds,
  and the floor forces that cell to its next leak hand, ahead of the
  queue's own order, exactly as a divergent fork does. The stamp rides
  through `leakMerge`, or the very next settle would merge over the
  tapped cell and eat the tap the player had just made. **And the
  report's scorecard rows are the same way in**: the rows above the
  chart name the same cells for the same money, so a tap on a row
  lands in the same drill as a tap on the bar beneath it — otherwise
  the top of the report is a dead end the player can see the bottom of
  is not. Same `evtap` + `data-cell`, same gold underline on hover,
  same two refusals drawn in the markup (`evno`, dimmed): a mastered
  cell keeps no tap, and neither does a quiz-only floor, because a row
  must never offer what the tap under it would refuse. A row already
  named to the floor wears the same `evseeded` mark the bar does, and
  its title says its own chips, misses, share of the sitting and the
  way in — the running-recovery figure belongs to the chart's
  cumulative, so the row names what the row actually knows. Live on
  the table: a tap on `hard 15 v K` stamped `qs` on that cell with
  `n` untouched at 1, and both the row and the bar turned `evseeded`.
  Every stamp is
  spent on the way in, so one tap is one drill and a reload never
  forces the same cell twice; several taps land newest-first, the
  freshest dealt at once and the rest behind it.
  **The chart holds back exactly what the drill would refuse**: a
  mastered cell and a floor drilled quiz-only both render their rows as
  plain names, with no tap and no way-in clause in the hover, so the
  picture never offers a button that would turn the tap down — and the
  refusal is said in words when it is tried anyway. The cell name
  rides into the attribute escaped, as ledger data must. Live on the
  table: a real felt miss at `hard 13 v 2`, its bar drawn and tappable,
  tapped to `qs` on a row still reading `n 1 · cost 0.375`, the note
  "hard 13 v 2 · named to the practice floor" under the chart; andon the floor a moment later the stamp gone and the row re-stamped fresh.
  **And the chart can start over on one tap**: a `↺ fresh
  sitting` at the foot of the chart clears this sitting's own fold —
  the bars and the chips behind them — on demand, instead of waiting
  for the reload that would otherwise do it. One tap, not two,
  because it reaches nothing worth losing: the fold is in memory and
  dies with the page anyway. **What it must not touch is the
  practice floor's ledger.** Those chips were handed over at each
  settle, and a view of them starting over cannot un-teach a drill
  the player has earned; the coach's decisions, the reconciliation
  and the whole persisted book stay exactly where they are. It
  lives under the chart it resets rather than beside `⌫ clear the
  book`, because the two have very different reach and must not read
  as one control. Live on the table: a bar at `hard 19 v 3` reading
  "−28 · Fix it: +28 back", tapped once to a bare coach line with
  the ledger's two cells untouched, the decisions still counted,
  and a decision taken afterwards still landing.
  Live on the practice floor: the stacked "insurance v ace"
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
  and the footer explains the glyph. **The all-time tab wears its own
  ▲, and reads the record rather than the sitting**: a cell's last
  CLOSED week is weighed against the average week its whole lifetime
  has run — the total toll divided by the weeks the snapshots can
  actually measure, so a first week is never judged against a total it
  did not live through ("▲280 last week v 120 a week"). The open week
  is never the read: a week in progress is part-run and would wear the
  glyph on every cell by Tuesday, so a class that ran up a fortune
  since Monday still reads on last week. Flat stays quiet, and where
  there are too few weeks to judge the sitting's own flag speaks
  instead, so a row never wears two flags. **And every session row is a
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
  −139" ranked first. **And it is rationed, because a panel that
  nags is a panel nobody reads**: one opening per new class is a
  lesson, but a streak of them is an interruption, so the opening is
  capped at one every six hands (`LEAK_OPEN_EVERY`), counted on the
  round clock — which ticks whether the panel is open or shut, so the
  cap cannot wedge itself shut. What the cap never suppresses is the
  work: the drill stillarms, the 🩹 pill still appears, the ledger still grows. Only the
  telling is held — and the holding is itself visible: the pill badges
  what the panel is not showing, quietly. It names the class rather
  than the figure ("🩹 Leaks · 12 v 9 +2" — the newest found, and how
  many more are behind it), because "−120 new" says how much and nothing
  about where to look; the whole list waits in the button's title
  ("found while this was shut: −120 chips over 3 classes (12 v 9,
  13 v 2, 9 v 7)"), and the button is kept on screen even when the
  ledger would otherwise leave it nothing to say. It is a note, not a
  demand — muted white on a hairline border, never the house gold,
  which is reserved for the panel's own open state. The names live in
  `999.practice.unseen` beside the counts, six at most and newest
  first, a class named once however often it is met; the weight is
  still the chips the miss threw away, so a −180 miss and a −2 miss do
  not read the same. The count is spent once, naming itself in the
  session footer the next time the panel is read ("· 3 more classes
  found while this was shut — the drill has them all"), and spent
  news takes its names with it, so the badge never nags twice for the
  same discovery, never leads with a class already read, and nothing is
  lost, only
  delayed. **The drill now
  graduates its students**:  a cell that answers with the book three
  times running retires from the queue — the pill carries the roster
  ("· 🎓2 · 4 drilling"), honours beside the cells still at it — and
  shown muted on the panel with
  its honours ("🎓1 · back in 6") — and returns with spacing for a
  refresher (six served hands, doubling each re-graduation, capped at
  twenty-four, the clock persisted in `999.practice.grad`); any miss on
  the cell, at the drill or on the felt, yanks a graduate straight back
  and zeroes its streak — **and the yank's price trims the next rest**:
  the miss is recorded with the chips it threw away, and re-retirement
  scales the ladder by it (full from 25 chips up, floored at 0.4×), so
  a cheap yank is a lesson nearly held and soft cells come back sooner
  than expensive ones, each generation measuring its own refresher —
  and the panel's graduate row names the FACTOR, not just the fact
  ("🎓1 · back in 3 · 0.5× rest"), so a shortened return explains
  itself rather than looking arbitrary — and says how short, which the
  countdown alone never could. The factor reads at one decimal (a
  stored 0.6288 is a 0.6× rest to a player; the tenth carries the
  meaning, the hundredth is bookkeeping), a full-price yank stamps no
  factor at all, and an untrimmed graduate wears none.
  **And the queue bends by the same price**: a trimmed cell — a lesson
  nearly held — serves AHEAD of the full-ladder ones when it returns,
  the softer (cheaper the yank) the sooner; the drill's schedule weighs
  the refresher price, while the panel's ranking stays the honest leak
  size. **And the roster watches how the re-yanks come**: every yanked
  generation logs its softness (`yk`, the last six kept per cell, the
  log riding the felt's merge as its own copy), so the pill reads how
  many re-yanks came cheap across the whole ledger and which way each
  cell's latest moved against its own run — "· ↻ 2/5 cheap ↘" softening,
  "↗" hardening, read quietly with the rate when the two tie. The panel
  shows the live streak meanwhile
  ("clean 1/3"). **And there is a top of the ladder**: a cell that
  survives two spaced refreshers — the third graduation — is a MASTER
  with honours, 🏅 on the panel in gold, gone from the drill for good;
  no miss, drill or felt, drags it back, no drill-now tap offers it,
  the pill counts it first ("· 🏅1 · 🎓1 · 5 drilling"), and the
  footer says so ("🏅 1 mastered — out of the drill for good").
  **And the gold rows remember WHEN**: the mastery write stamps the day
  it happened, so each gold row reads "🏅 master · 4 Oct", and the
  mastered rows sit in their own gold block under the ranking, newest
  mastery first ("Mastered · newest first") — the ranking cannot say
  that, since a master's toll has cooled for months and would otherwise
  sink it off the panel or below rows still worth chasing. The block
  holds five and then says how many more are further down the ledger;
  the live rows keep their own five, so a gold row never takes a leaking
  one's place. A master stamped before the ledger dated them shows no
  day rather than an invented one, and sorts last. The stamp rides
  every path that rebuilds a row, `leakMerge` included, so a felt miss
  cannot quietly un-date a gold row. An
  all-done ledger falls back to the classic
  16 v 10 so the drill never runs dry. Live end to end: hard 12 v 2
  retired at clock 3 ("back in 6"), the countdown ticked down on the
  classic hands, and the woken cell was dealt again the moment its rest
  was up — with the wake starving nothing when the classic loop held
  the queue (found live, fixed at the serve). **And the queue follows
  this week's leaks, not last month's — decaying by age *and* by the
  drill itself**: a cell's pull on the ranking is its toll decayed
  twice and capped, so neither one distant disaster nor a stale leak
  can sit at the top for good. The first factor is
  the wall clock — a week's half-life (`LEAK_HALF`). The second is the
  drill: every drill hand served ticks the graduation clock
  (`gradClock`, `999.practice.grad`), and the pull halves every
  `LEAK_DRILL_HALF` (250) hands served since the cell was last
  stamped — so heavy drilling retires its own stale leaks with no
  wall-clock wait. Every miss stamps both clocks: `ts` (date) and `d`
  (the drill clock at the miss), at the felt's settle, the fork
  queue, and the insurance side bet. The felt keeps no drill clock,
  so its hand-off carries `ts`/`d` for *untouched* cells through
  `leakMerge` and clears only the cell it missed — the floor's load
  then backfills any cell with no `d` to the current clock, so the new
  decay never retires a cell for drilling it never saw. The panel
  keeps the honest all-time `−cost` and only the order cools ("Ranks
  by the freshest tolls — age and the drill both cool a leak."), and
  the drill's queue and "Next hand" read that same decayed ranking.
  Live: a fresh −30 leapt a month-old −120 ("soft 18 v 9 ×2 · −30"
  first), and a live miss on the fresh cell re-dated it while the
  stale one kept its old stamp. **And the cooling is visible**: the
  all-time rows carry the share of the toll the queue still weighs
  ("❄ 25%"), so a stale heavy cell reads as fading rather than merely
  ranking lower — and EVERY memory wears one, fresh included, because
  ❄ 100% is the row the others are read against. A cooled one then
  says which memory took it: "❄ 35% age 50% · drill 71%", the two
  shares being the ranking's own factors — age against the fade
  window, drilling against `LEAK_DRILL_HALF` — so the figures beside
  the chip multiply out to the chip's own number. They are set
  SEPARATELY (see below), so one unsplit number is a number nobody
  can act on: the split names the memory to shorten. A cell cooled
  past half its toll (`COOL_AT`) fades entire, its ❄ chip in cool
  grey. The queue weighs no row past `LEAK_CAP`, so a heavy toll can
  read low on the cap alone, and those rows say `cap` rather than
  letting age and the drill take a blame neither earned. The felt's
  hand-off leaves the ratio intact because cost and
  weight ride the same merge; only the all-time ranking weighs a row,
  so only it shows the cooling. **And the pull itself sits beside the
  honest cost**: every all-time row now prints the ranking's own weight
  next to what the cell actually cost ("hard 15 v 10 ×4 · **−200** ·
  pulls 71 ❄ 35%"), not only the rows that have cooled — the two numbers
  together are what make the order legible, so a −200 row can be seen
  falling below a −60 one instead of merely appearing to. Hovering the
  pull names the two halves that produced it (age in half-lives against
  the chosen fade window, and hands served since the drill against
  `LEAK_DRILL_HALF`), and both are read from the same instant the
  ranking weighed, so the row never disagrees with its own order. The
  ❄ rides with the pull; the footer teaches it ("The pull beside each
  cost is what the queue weighs it at — age and the drill halve it, so a
  heavier row can rank below a lighter one."). **And the window is the player's**:
  the age half-life is a preset menu — 3d · 1w · 2w · 1m, a week by
  default — picked on the all-time panel's "Fade window:" row, where
  the live pick reads gold; the choice persists
  (`999.practice.leakhalf`) and the ranking, the cooling read and the
  drill's queue all follow it, so a grind-heavy stretch can keep a
  short memory and a long-running ledger a long one (an off-menu value
  still names itself in days). **And the drill's memory is set in the
  same row**: hands served since the stamp is the second decay — each
  `LEAK_DRILL_HALF` of them halving the pull — and it is a preset menu
  too (`off · 100 · 250 · 500 · 1k`, 250 by default), sitting in the fade
  window's own row as `Drill hands:` so both memories are set together
  rather than one picked and the other forgotten. It persists
  separately (`999.practice.drillhalf`), an off-menu value names
  itself as a raw count, and the two picks never touch each other's
  stored value. **And the drill's memory can be switched off
  entirely.** `off` is a pick, not a hole: a player who wants a class
  retired by age alone — a long ledger where nothing should be
  forgotten merely for having been drilled — sets it and hands served
  stop counting against a leak, while the fade window goes on doing
  the whole cooling. Because a setting that forgot itself on the next
  load would be no setting at all, `off` is stored as the number 0 and
  read back as an answer, not as junk; the setter takes 0 and refuses
  only what is not a finite number. Nothing divides by the half-life
  any more: `drillCool()` is the one place hands served become a
  factor, it answers `off` before the divide, and both the ranking and
  the retention chip read it — so neither can divide by nothing and
  neither can be right about the other. The panel says so too: the
  footer switches to "the drill is off, so age alone cools a leak",
  and a chip's drill share reads `off` rather than a `100%` that would
  claim a memory did something when the player had thrown the switch.
  The cap is untouched — off is not a licence for a heavy toll to weigh
  more than any other. **A third pick sits in that same row: which mistake
  source feeds the drill at all.** The felt (a hand played against the
  book) and the quiz (a card blown) both pour into the one ledger, and
  a player may want only one of them in it — `Drill feeds: both ·
  felt only · quiz only`, a quiz-only ledger drills what the cards
  catch, a felt-only one what the shoe catches, without the other
  source's noise. The switch only shuts the taps: tolls already in the
  ledger stay, the drill queue and the quiz's ledger-half follow what
  is actually in it. It persists (`999.practice.drillfeed`) and never
  touches the two memories beside it. Live: with `felt only` chosen a
  blown card graded and fed nothing; with `quiz only` the same card
  landed its classes. Live, two cells with different drill-clock stamps
  (300 hands served v 50): at a 1000-hand half-life the heavily
  served cell still led at `❄ 81%` v `❄ 97%`; at 100 hands the order
  **flipped** — `❄ 12%` v `❄ 71%` — and the panel re-ranked on the
  tap, with the age pick left untouched.
  **And the pill watches the trend, not just the
  toll**: a snapshot of the ledger's cumulative costs at each week's
  first sighting (`999.practice.weekbase`, Monday-to-Monday, the last
  eight kept) gives each week's leak by subtraction — the felt's
  hand-offs riding in untouched — so the week's worst leaker is weighed
  against its own last week and the pill wears the direction ("· 🩹
  hard 16 v 10 ▼" shrinking, "▲" growing, and quiet until a second
  week exists to compare), the same Pareto headline the scorecard
  names. Live: a 5-chip week against a 30-chip one read ▼, the same
  cell tripled read ▲, and a lone week drew nothing.
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
  as the rounds pile up. **And the book is restored the lenient way,
  field by field** — in the replay reel's own spirit, where one stored
  entry that cannot be used is dropped alone and the rest of the record
  rides on. All four restore sites (the floor's boot, the table's own
  `trainstats` boot, the hand-off's read-merge and the table-book read
  behind the two felts) go through one shared `LUCK999.evRestore`, so
  a stored field that is missing, `NaN`, `Infinity` or impossible is
  started at zero by itself and nothing else is touched. **And every
  OTHER stored record is read the same way** — an audit of all 47
  `localStorage` reads across both pages found the same fault in ten of
  them, on the floor: `coachstats`, `ixstats`, `luckrange`, `lucklast`,
  `forks`, `quizscore`, `counts`, `spread`, `speedstats` and `speedtrue`
  each threw the WHOLE record away when one field failed its type check,
  so a discipline record saved with one counter as a string lost months
  of discipline with it. They now go through `LUCK999.numInto(raw,
  seed)`, which keeps every finite number the seed says is a number,
  repairs only the field that failed, and drops keys this build does not
  know. The table had none of the fault — its books already read through
  `plainNum`/`evRestore` and its lists through per-entry filters. The
  clamps that justified those guards survive as clamps (`clean` can
  never exceed `asked`, a score from before the price still derives its
  own base, and no closing stored still reads as no closing), and the
  floor's reel now filters its entries the way the table's copy of that
  same key always did. `test/storeread.test.js` keeps the audit honest:
  it sweeps every read in both pages and fails on any all-or-nothing
  guard that comes back. Live: an `ixstats` record stored as
  `{asked: 9, followed: 'oops'}` still reads "0/3" beside its never-taken
  cell and "count plays followed 0/9" on the sheet, where before the fix
  the record — the nine asks and the per-cell split with them — was gone. A book written
  before the spread existed is **migrated, not thrown away**: a
  `{rounds: 12, ev: −3.1, felt: −25}` from an older build still reads
  "−21.9 luck · 12 rounds" on load, its band simply claims nothing until
  the next round banks a width — and the very next hand-off makes it 13
  rounds, not 1. `LUCK999.evMigrated` names the case when a surface
  wants to say so. **And after a hand-off the shoe names both
  felts**: once a priced table round hands over, the strip lays the live
  table's own book (`999.table.trainstats`) beside the shoe's own — the
  combined reconciliation less the table's rounds — each read the pill's
  way, the signed gap in its own sign's colour banded by ITS OWN
  accumulated spread with the sigma that measures it ("… +2.0σ hot · 🎰
  the table +36.0 even +0.8σ · the shoe +44.0 even +0.8σ luck"), so the
  table's hot and cold are sizes too, not just a sign. It reads as one
  felt until a hand-off, and a reset on either side (the counts
  disagreeing, or a shoe holding no rounds of its own) falls back
  quietly to the single line.
  **The live overlay's strip now splits its felt the same way**, which it
  could not do before: it priced only its own book, so it drew one felt
  and every round learned on the practice floor sat outside its luck
  entirely. The duel runs the same way round — the overlay's own book
  (`999.table.trainstats`) beside the floor's own, each read the pill's
  way and banded against its OWN spread ("… +3.4σ freak hot · 🎰 the
  table +44.0 freak hot +7.0σ · the floor −14.0 cold −2.2σ luck"), and
  **the duel crosses per side** on the overlay too, one mark banked per
  felt so one side crossing never re-arms the other, both returned to
  nothing by a new book or a wipe. The whole it divides is the practice
  book *alone*: this page already writes every settled round into that
  same key so the floor's entries are never clobbered, so a night at the
  felt and a sitting at the shoe already read as one running book —
  adding the overlay's own book to it would count those rounds twice,
  and the split is a subtraction, not an addition. `splitFelt` and
  `feltTag` themselves moved into `luck999.js`, so the floor and the
  overlay cannot describe one reconciliation two different ways.
  **And the math itself lives in one file**
  both surfaces load (`luck999.js`, `window.LUCK999`): the word, the
  band, the sigma, the sign-only colour, the crossing, the strip
  markup, the week-over-week reading and the lenient book restore are a
  single source, so the floor and the live overlay read the same
  measured gap by construction rather than by copy-paste.
  **The gap rides the coach pill too**: after each settle the score line
  carries it ("Coach 83% · 19/23 · −2.9/dev · −9.0 luck · even · −0.1σ"),
  the strip and the pill reading one source for the word, the band and the
  sigma,  live-verified against
  a stood 17 v A (engine −16.0 · felt −25 · −9.0 both places). **And
  the pill remembers the band's far ends**: the best (highest) and
  worst (lowest) signed gap the reconciliation has EVER read, kept as
  z-scores across sessions (`999.practice.luckrange` — a new book does
  not erase what luck has already shown), named beside where the gap
  stands now ("… even · −0.1σ · best freak hot +3.4σ · worst freak cold
  −4.1σ"), each end's band read from the z alone by the shared module.
  **And each end says WHEN**: setting an extreme stamps the round it
  happened on beside it (`hiAt`/`loAt`), so the pill reads
  "best freak hot +4.0σ (round 42) · worst cold −2.1σ (round 9)" — a
  hot run means more beside the round that made it. The two ends are
  stamped independently, so a record from before the stamps still
  reads: an end that has since moved names its new round, and one
  that has not keeps its silence rather than claiming a round it
  never said. Live: a book restored at round 42 folded itself in on
  boot and re-stamped the ceiling to 42, while the seeded floor kept
  round 9; a legacy range with no stamps rendered the moved end with
  a round and the untouched one without. **And the stamp is the
  LEDGER's round, not the book's.** The extremes outlive a new book by
  design — `↺ new book` zeroes the reconciliation and leaves what luck
  has already shown alone — but the book's own count starts again at 1,
  so it cannot say where an old extreme happened: "round 9" would name
  two different books, and the older one's banked figures would be read
  against the newer one's. So every priced round is counted once into
  `evLedgerRounds` (`999.practice.evrounds`, read through the shared
  field reader, one plain number), it rides the same commit as the
  book and the extremes, and **no wipe restarts it** — not the new
  book, and not the fresh shoe, because the extremes ride that wipe
  untouched and a counter restarted beside them would hand out the
  same stamp twice. It is lifted, never lowered, when the book is ahead
  of it: a hand-off from the table adds a round to the practice key
  while the player is away, and a store saved before the counter
  existed has none of its own, so boot takes whichever is later. The
  hover says so plainly — *the ledger's round 42, and the book as it
  stood then — engine −12.4 · …* — because a number that used to mean
  the book's round must not go on reading as if it still did. Live: a
  book one freak hot on round 9 kept that stamp through a new book,
  whose own fourth round (ledger 13) re-stamped the floor at 13 where
  the book alone would have said 4.
  was made of.** A round number is a position, not a figure: round 42
  is worth a different thing on a different ledger, so the engine's
  leg, the felt's own and the spread the σ was measured against are
  banked WITH the stamp (`hiEv`/`hiFelt`/`hiSd2` and the `lo` twins) and
  ride the title of the extreme itself — hover `best freak hot +4.0σ
  (round 42)` and read *engine −12.4 · felt −240 · the gap that read
  −227.6 · in 115 of spread*. Every figure there is the strip's own:
  the engine quoted to one decimal and the felt in chips by the
  `signed()` helper `stripLine` itself now uses, and the gap by the
  shared `word()` — so the hover cannot describe a gap the σ was not
  measured on. The two ends ride the pill as real nodes (a title needs
  an element; a string pasted into the score line would print its own
  angle brackets) built from the same `luckEndTxt`/`luckEndTitle` pair
  the session's closing line prints with, so the live pill and the
  review can never describe one extreme two ways. A record from before
  the legs were banked carries none, and is then printed exactly as it
  always was — plain words, no title, nothing invented after the fact.
  **And an extreme says what it
  **And
  the luck is banded by its own spread**: each round banks a width —
  1.15 betting units of stake, doubled riding twice, insurance riding
  the ten density — so the gap reads as a distance in spreads: even
  inside one, cool or warm inside two, cold or hot inside three, freak
  past that ("−13.1 luck · even" on one small hand; a 500 double losing
  flat is a different animal). Hot and cold are sizes, not moods.
  **And the size is printed, not just named**: the strip ends in the
  signed distance itself — `+2.0σ hot` on a rich shoe, `−0.1σ
  even` when twelve rounds have widened the spread — the gap divided
  by the session's accumulated standard deviation, so a hot streak
  knows HOW hot; the σ stays lowercase against the strip's
  uppercasing (a sum's Σ would confuse the read), the band still
  naming the size beside it, and sessions banked without a spread
  read exactly as before. **And the luck number is coloured by its
  sign, not its distance**: run-good — a felt above the engine —
  always prints green (`#43c98a`), however far it runs; only a COLD
  gap, the felt behind the engine, prints red (`#e2705f`); dead even
  is no call, and with no spread yet it keeps the strip's gold. Live,
  on the two cases where distance and sign would disagree: a `−0.6`
  gap — `−0.1σ`, deep inside `even` and nowhere near an outlier —
  still printed **red**, while a `+900` gap at `+90.0σ freak hot`
  printed **green** and glowed. A `+236.0` runaway over two rounds read
  green while a `−120` cold gap read red, on the practice strip and
  the table overlay both. The four CSS comments beside those two rules
  once described the older behaviour ("inside one spread", "past one"),
  and said so long after the code stopped doing it — the classes are
  chosen by sign alone and never by band, so a comment claiming
  otherwise is the only place the old rule could still be read.
  **And the crossing catches the eye without a word**: the moment the
  gap tops its first spread — the band leaving `even` — the number
  gives one soft bloom in its own colour (green run-good, red cold),
  a `1.2s` glow keyed on the `crossed` class the strip wears for that
  one draw; a steady outlier never pulses again, and a book restored
  already past a spread sets its mark quietly on load, so the pulse
  fires on the crossing itself, on the practice strip and the table
  overlay both. **And once it IS out, it stays lit**: the flash lasts
  1.2 s and then the outlier wears nothing at all, so a session sitting
  at `+2.1σ` could only be known by reading the word `hot` beside it —
  and a word is exactly what the eye skips. The number now carries it
  instead: while the gap is past a spread it wears `over` and holds a
  soft bloom, settling into a slow `2.6s` breath so it reads as alive
  without moving the layout. **The resting shadow is the real signal
  and the breath only keeps it alive**, so a player who asks for
  reduced motion keeps the glow and loses only the movement — an
  outlier still catches the eye. `over` is the same test as the band
  edge (`LUCK999.out`), checked against the band across a spread of
  books, so the glow and the word can never disagree about a session.
  It rides every number that shows a band — the strip, the coach pill,
  the duel's two sides, the table's score line and the closing luck —
  and the decision lives in `luck999.js`, the module both pages load,
  so the two surfaces cannot drift. On the strip the bloom is the
  number's own green or red, so it carries the sign too; inside the
  two tappable clauses it takes that clause's own gold, because those
  are controls and keep their control colour. Live: a seeded `+2.0σ`
  book showed `luck ok over` on the practice strip with `luckglow`
  running and a `rgb(67, 201, 138)` shadow, the table strip the same,
  the table score line `span.luck.over`, and with the animation
  forced off the glow stayed at `5.6px` green — the signal survives
  the motion being taken away. **And the duel crosses per side**: once a hand-off has
  split the book, the strip names two felts — `🎰 the table … · the
  shoe …` — and each carries its OWN accumulated spread, so each gets
  its OWN mark and its OWN bloom. A felt flashes on the draw it first
  tops *its own* spread, not a round later when the combined gap
  happens to cross; the two marks are banked apart, so one side's
  crossing neither fires nor re-arms the other, and a side that stays
  a steady outlier never pulses again. Live, over eleven seeded
  rounds: the table sat at `+440.0 freak hot +7.0σ` from boot and
  never pulsed, while the shoe — seeded with a zero spread, so any
  winning hand must top it — bloomed `luck out crossed` on the draw it
  first went cool, and then both stayed quiet on the next draw. Under
  `prefers-reduced-motion` the bloom stands still; the colour and the
  band remain the fact, the glow is only emphasis. **And the crossing
  reaches the ear on that same draw.** A felt that has just topped its
  OWN accumulated spread rings one soft chime — G4 → D5, a fifth, on
  triangles at **0.045** with the deepest send in the registry
  (**2.0**), so it arrives from the room instead of snapping at the ear.
  It is the one event the eye and the ear share: the chime is keyed to
  the same `fire` the bloom is keyed to, not to a near-miss of it, and
  it carries no panner — a crossing is a property of a book, not of a
  seat, so it sits where the strip sits. It says rather than
  celebrates: an outlier is not a win, so it never grows into a fanfare
  however far past a spread the book has run. Both felts sound it from
  the one registry voice, where the Levels panel can ▶ it before any
  round earns one. It rings **once per redraw** however many sides
  crossed on that draw — three felts at once is a chord, and a bell
  struck three times at once is a mistake, not an event — and it stays
  quiet exactly where the pulse does: a steady outlier never rings
  twice, and a book restored already past a spread sets its mark
  silently, so a reload does not announce anything the player was
  never shown.
  **And each side
  says how many spreads it has run**: the sigma sits beside the band
  on both felts — `the table +440.0 freak hot +7.0σ · the shoe +80.0
  warm +1.1σ` — each against its own width, so the duel reads as two
  measured runs, not two bare signs. A book from before the spread
  banked no width, so its sigma is genuinely unknown, and the side
  says so rather than standing there as a number a player could read
  as "no spreads run": `the table +440.0 no spread yet · the shoe
  +80.0 even +0.8σ` — the absence in quieter ink, the other side
  keeping its own sigma. The duel reads its table book the way the
  page does, leniently through `evRestore`, so a pre-spread book
  arrives complete and the arithmetic never sees a missing field.
  **And the closing gap is folded into the review scorecard**: the strip
  reads the gap live and it moves every hand, so the session's FINAL
  reading is graded and kept in `999.practice.lucklast` — the raw book
  (`rounds`, `ev`, `felt`, `sd2`) rather than a copy of the grade, so
  the band and sigma are always read from `LUCK999` and can never drift
  from what the pill said. Opening the review closes the book: the same
  one twice is one closing, not two; an unpriced session closes on
  nothing and overwrites nothing; and each closing keeps the one before
  it beside it (one link deep, never a chain). It lands between the
  scorecard and the sitting's discipline, graded in the strip's own
  vocabulary plus a sentence from the same z the bands come from —
  "Closing luck: **−37.9** · cool · −1.3σ · 9 rounds priced — the book
  ran against you. Best freak hot +5.5σ (round 9) · worst cold −2.1σ
  (round 4). The closing before it read −170.0 · freak cold." — with the
  far ends carried along, since a closing gap means nothing without the
  run that produced it. **The reel empties, the report does not**: with
  nothing to replay the review used to render nothing at all, which is
  exactly what a fresh shoe leaves behind; it now shows the stored
  closing alone, so a run-good or cold finish stays readable after the
  hands that made it are gone. An ungraded session says so rather than
  sitting blank.
  **And the gap is a way in, not just a readout**: on both score lines
  that report it — the coach pill's session score and the settle note —
  the luck clause is its own control rather than a run of text, so a tap
  (or Enter, it carries `role="button"` and a tab stop) opens the
  reconciliation strip that explains the number it just stated. The
  clause stops the pill's own coach toggle from firing behind it, the
  strip is redrawn before it is opened (never blank, and honest when
  nothing has crossed: "The reconciliation opens with the first priced
  decision"), and it blooms once (`luckopen`, 1.4s) so the eye lands on
  it rather than hunting. Built as DOM nodes by `setScore(score, luck,
  rest)`, which is why the clause survives being a control at all — a
  pill is a `<button>`, so the gap rides beside its score inside it and
  everything else on the line keeps reading as plain text. Live: the
  pill reads "Coach 75% · 9/12 · −1.3/dev · **· +42.0 luck · even ·
  +0.4σ** · best freak hot +5.5σ (round 9) · worst cold −2.1σ", the
  clause alone is focusable and announced as a button, tapping it
  flashed the strip open without toggling the coach, and a settled hand
  rendered "Dealer takes it · **· −68.5 luck, both felts reconcile**"
  with the clause as its own node — clicked the instant it appeared, it
  opened the strip without disturbing the settle line, and it lives
  **2313 ms** before the round-end status replaces it, so it is a target
  a hand can actually reach.
  **And the drill stacks the fork, not the class**: a divergence queues
  the misplayed hand, and the class name is only how the ledger files it
  — so the drill now replays **that hand**, the two cards and the
  dealer it was actually dealt, **suit for suit**, instead of any hand
  of that class. A class constrains only the total, so hard 16 as 7+9
  is a real hand the floor's canonical build would never have chosen,
  and that is exactly the hand the player needs to meet again. The
  dealer's stored hole card rides with them, so the dealer hand is the
  one that was played. A cell queued **without** a hand behind it — a
  plain miss, or a bar tapped on the felt, which carries a class name
  and nothing else — keeps the canonical build, and a later fork that
  arrives without its own hand drops the stale one rather than leaving
  it to outrank the fork that replaced it. **Suits are indices, and
  clubs is index 0**, so every suit is tested against null and never
  against truth: a clubs hand read as "any suit" would quietly drift
  off the hand it was given. The stacker falls back to a fresh shoe
  when the exact cards are gone, as it always did. Verified against
  the shipped `leakDeal`: six forked cells over fourteen fresh shoes
  each, every stack the same hand by rank and suit, each still landing
  in its own class — and for the same cell the canonical build dealt
  `6,10,10` where the fork's hand was `7,9,10`, so the two answers
  cannot be confused.
  **And the sessions are kept, so they can be compared**: a reset
  throws the reconciliation away, and the reconciliation is the only
  place that night's luck was ever recorded. So every reset **banks it
  first** — the engine's price, the felt's own, the gap between them,
  how many rounds it took, and which reset ended it — into a rolling
  history of the last six, newest first. The overlay draws them **side
  by side**, one row each, every bar drawn to the same scale as the
  others, so a run of luck is a shape rather than a list of numbers:
  green where the felt finished ahead of the engine, red behind it,
  gold level. Hovering a row names what ended it and what it cost.
  **An unpriced book archives nothing** — a wipe of an untouched
  session adds no row and says nothing, because there was no gap to
  grade. Six is deliberate: long enough to see a run, short enough
  that each row is still a sitting rather than a career.
  **And the reconciliation starts over on demand**: a small
  `↺ new book` tap sits at the end of the strip — one tap
  zeroes the rounds, the engine's expectation, the felt and the
  accumulated spread, so the luck band and its sigma fall back to
  nothing (gold) and the pill drops its gap, without touching the
  coach's own decisions; it is drawn inside the strip's rebuilt line
  and caught by delegation on the felt (and the table overlay's box),
  lifted above the shoe that overlays a narrow floor, and live on both
  strips a seeded “−21.9 luck · even” wiped back to an empty book.
  **And the practice can start over completely**: a `↺ fresh shoe` line
  sits under the strip — reshuffles the shoe, zeroes the Hi-Lo count,
  and wipes every ledger the session built: the chip tray (back to the
  boot 1000), the leak ledger with its week baselines and drill clock,
  the replay and its fork tally, the coach's record, the count's own
  guesses, the index discipline and its recent asks, the quiz score and
  any open card, and the strip's own reconciliation, with every panel
  closed and the drill queue refilled from nothing. **The settings are
  not the session and stay put**: the quiz aim and its strength, the
  drill feeds, the fade and drill windows, the count and coach switches,
  the speed, the luck band and the sound all survive. Two taps, never
  one — the first arms the chip (“↺ tap again to wipe it all”) and it
  disarms itself after six seconds, because a stray click must never
  cost a training record. It lives in its own line rather than inside
  the strip on purpose: the strip hides itself when nothing has crossed,
  and a reset a player cannot reach on a fresh page is no reset at all.
  Live, a seeded bank of 640 with an 8-ask index record, a 6-ask quiz
  score and a 20-decision coach wiped to `1000`, `{asked:0}`,
  `{clock:0}`, `leaks {}` — with the saved aim and strength and the
  count switch exactly as they were.
  **And the overlay wipes the whole book on tap**: a small
  `⌫ clear the book` control sits at the foot of the training overlay —
  one tap zeroes the ENTIRE persisted book (the coach's decisions, the
  chips they cost and the reconciliation, plus this sitting's own
  chart), where the strip's `↺ new book` keeps the decisions and clears
  only the gap; live, a seeded `19/23 · −891.0 luck · cold` overlay
  clicked down to a bare `Coach` with `999.table.trainstats` back to all
  zeros.
  **And beside it, the whole sitting**: a `↺ whole sitting` tap ends
  the sitting outright — the coach's accuracy, the reconciliation, this
  sitting's chart, **and the practice floor's leak ledger** — all in
  one. That ledger is what `clear the book` deliberately leaves alone:
  those chips already left the felt at each settle, and a page-level
  wipe cannot take them back. `whole sitting` says otherwise, because a
  sitting that is over should take the drills that read it with it. It
  reaches **no further than that** — not the reel, not the forks, not
  the running reconciliation book, each pinned by a test. **Two taps,
  six seconds**, in the house red while armed: this is the one control
  in the overlay that destroys a training record rather than a view, and
  a stray click must never be one tap from it. The first tap arms
  ("↺ tap again to wipe it all") and disarms itself if the second never
  comes, so a half-formed intent cannot fire a minute later on a tap
  that meant something else. It sits in the always-present wipe group
  rather than under the strip, because the strip only exists once
  something has crossed it — and a player with a ledger to clear is
  most likely still below it.
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
  stakes twice and draws its second card, a split book separates the
  pair and plays each hand out by the chart on that same dealer hand —
  DAS, resplit to four, aces one card) — and the settle line names
  the divergence ("— the book's hit would have won +50"); the review
  panel files the hand under "Same hand, both plays: yours (stand) lost
  −25 · book ('hit') lost −25", with `forkYou`/`forkBook` persisted on
  the entry so the both-ways verdict survives reloads. **And the
  divergence feeds the drill**: the ♠ pill carries the book's win-rate
  across those forks (`fork 75%`), and every divergent hand is queued
  back — its cell merged into the ledger, a graduate woken, a master
  left alone — then forced ahead of the queue, so the next leak hand
  deals that exact class and the coach expects the book's line; the
  settle line names it ("— the book's hit would have lost −25 · queued
  for the drill: hard 16 v 9") and the panel names the hand it will
  serve ("Next hand: hard 16 v 9") even when a heavier leak outranks
  it. Live: a replayed stand against the book's hit on hard 16 v 9
  queued that cell and the drill dealt 6+10 against the 9 ahead of a
  −90 hard 12 v 2. **The review
  ends on a scorecard**: the reel folds into the few cells behind
  most of the loss — cells named exactly like the ledger so the
  drills can aim at them, the walk stopping once it has passed
  sixty percent of the money (at most three rows, an honest share
  when the loss is spread thin) — and the panel closes on
  "Scorecard: hard 16 v 10 ×2 −50 (59%) · hard 12 v 2 ×1 −25 (29%)
  — 2 of 3 cells carry 88% of the −85. Tap a cell to drill it first."
  **And each named row wears its week over week too** ("hard 16 v 10 ×2
  −70 (100%) ▼ 10 v 20"): the review is where a sitting is actually read
  back, often a day later, and the leak panel's direction is exactly the
  question asked then — is this cell healing or still bleeding? The
  scorecard asked the same two helpers the rows and the bars ask, so all
  three print the same figures in the same tints for the same cell; a
  cell with no week to compare wears nothing at all, and one born this
  week reads honestly against a zero last week ("▲ 30 v 0").
  **And each named cell is a tap**: it jumps straight into the leak drill
  on that cell — a one-click "drill now" from the review, accepting cells
  the ledger holds (the felt's hand-offs too, not only this sitting's
  misses) while a mastered cell keeps its name and loses the tap; the
  drill fires immediately ("Drill: hard 16 v 10 — place any bet, the shoe
  stacks it"), live-verified end to end (tapped from the scorecard, the
  shoe dealt 6+10 against the 10). **And an EV-left chart closes the
  panel**: under the scorecard each named cell draws a bar — the chips
  that fixing it wins back, scaled to the worst leak — with the recovery
  tail ("Fix all 2: +55 back · 10 still behind the rest. Tap a bar to
  drill it."), so the money on the table is read at a glance, not summed
  in the head; the bars wear the house red beside the gold drill taps,
  and — like the scorecard's names — every bar is its own tap: one click
  drops straight into drilling that cell (a mastered cell keeps its bar
  and loses the tap). **And a bar tap needs no second question**: you
  read the chart and chose a cell, so making you place a bet first would
  be asking again after you had already answered. The tap stacks that
  cell at once — the house stakes the hand itself (the floor's cosmetic
  25 if the tray is empty, nothing added if you had already staked
  one) — and the panel comes back by itself on the next hand, unsuppressed
  by the six-hand rationing that holds an *unsolicited* opening back. That
  hand is a **free practice hand**: `evRound` is closed for it, so no
  chips, no luck figure and no EV-left entry are invented for a round
  nobody bet on, while a wrong play still lands in the ledger — the whole
  point of the drill. A named cell elsewhere (the scorecard, the row's
  "drill now") keeps the older bet-gated path, and a mid-round tap arms
  the cell and the panel and waits its turn rather than dealing over a
  live hand. Live: tapping "hard 16 v 10" at **Bet 0** dealt 6 + 10 vs 10
  with the bar reading "Bet 25" and the status "the house staked this one,
  it costs nothing"; hitting it wrong (bust) booked the miss into the
  ledger (`s: 1`) and left `999.practice.evsession` **null** with an empty
  EV strip; the next hand came back to the panel on its session view,
  reading "Drill: hard 16 v 10 — place any bet, or tap another bar".
  **And the tap is reversible while it is still undecided**: dealing at
  once left no way back, so a player who tapped a bar and then read it
  twice was locked into a cell they never chose — the only honest way
  out was to play a hand they did not want. Tapping **the same bar
  again** now takes the auto-stake back: `token++` cancels the round
  before it can settle or book, the house's chip comes straight off the
  tray, the count is put back what the cancelled cards moved, and betting
  reopens so any *other* bar may be stacked instead. Only a hand nobody
  acted on may be taken back — `hit`, `stand` and `doubleDown` all shut
  it, as does the settle and the full reset — so a hand the player
  actually played can never be un-played. The one honest concession is
  the shoe: the cancelled cards stay spent, because they really were
  dealt off it; it is a practice shoe and it reshuffles, but a card
  cannot be un-drawn. Ordering matters here and is pinned: `clearBet`
  only pays out while `phase` is betting, so the phase must reopen
  **before** it is called or the chip silently stays on the tray and the
  bank comes up short by exactly the house's stake. **And the tap drills
  the whole column, not one cell**: the chart's corrections are not
  scattered singles but columns of one shape — every hard total that
  turns at a 10 turns because tens left make the draw bust too often,
  and that reason belongs to the *deck*, not to the total. Drilling
  "hard 16 v 10" alone taught a fifth of the lesson and left 15 and 10
  standing beside it untaught. `INDEX999.cellFamily()` now widens a tap
  to every total that flips at the same upcard, the tapped cell first
  and then up the column, each its own hand. The family is read from
  `INDICES` itself and never a hand-written list, so a total the chart
  does not carry cannot be drilled as though it did; a family may never
  cross an upcard or a hardness (a soft cell and a hard cell at the same
  upcard are different lessons); a column of one stays one cell; and a
  cell the chart does not carry — a soft total, a plain class, the
  insurance drill — widens to itself alone. The tapped cell is always
  present, so **a tap never drills less than it used to**, and only a
  *bar* tap widens: a named cell elsewhere (the scorecard, a row's "drill
  now") keeps its single-cell path. The column walks itself — each
  served hand steps to the next member, a retired or mastered member is
  skipped rather than revived, and the **last member empties the column
  as it is served**, or it would be dealt a second time.
  **And the drill says what it actually recovered**: because that hand
  is free, nothing books — no luck figure, no EV entry, no bar moves —
  which would leave the exact moment the chart promises progress showing
  no number at all. So the panel now carries a scoreboard line for the
  hand the bar asked for: the cell's toll going in, what one correct
  answer of it keeps, and where it stands now. A book play **keeps one
  miss' share of the toll and adds nothing** ("hard 16 v 10 · ✓ book play
  (Hit) · +17.1 kept — one miss' share of its −120, nothing added · it
  now stands at −120 across 7 misses", green); a deviation **adds its
  cost again and keeps nothing** ("✗ Hit against the book's Stand ·
  −8.2 added, nothing kept", red). A deviation the book simply cannot
  price says so rather than printing a fake "−0.0". The baseline is read
  *before* the ledger takes the miss, and the panel redraws the moment
  the verdict lands — a correct play books nothing, so nothing else
  would have redrawn it. Live on a fresh session with the cell at −120
  over 7 misses: standing (and hence the share) read correctly after the
  miss landed, and `999.practice.evsession` stayed null throughout.
  **And every bar wears its own cell's trend**: the same eight-week
  sparkline the leak rows draw, in the same row, so a bar answers *how
  much* and the line beside it answers *whether that is getting worse*.
  It is the one series, not a second one — the file already insisted the
  sparkline and the weekly chip read the same snapshots so they can never
  disagree, and two different window lengths of the same series would be
  two answers. So `SPARK_WEEKS` went from 6 to 8 **everywhere** it is
  drawn (the rows lengthened with it), and it  truncates the kept weeks
  rather than padding them. Live, twelve seeded weeks on a climbing
  cell: the bar reads `−120` beside `▁▁▁▁▁▁▁█` in red (`up`), capped at
  exactly eight points, and the same three cells in the all-time leak
  rows draw the identical glyphs. **And the line opens**: it is a
  button, not a picture — a tap unrolls the shape into the very
  figures it was drawn from, one per step, oldest first, plus the
  window's own total: `10 Aug −40 · 17 Aug −50 · … · 28 Sep −0 ·
  −490 over 8 weeks`. The shape and the numbers come from **one** key
  walk (`sparkWeeks`, which `sparkValues` now reads too), so the
  figures a player is shown can never be a second series from the
  shape beside them, and the ladder is exactly as long as the line —
  no week padded in, none quietly dropped. **The line now belongs to
  the live table too, and to both felts at once.** It lived on the
  floor alone, which meant the table could show a cell's *direction*
  (this week against last, the ▲/▼ beside each bar) but never its
  *line* — two answers to "how has this cell been bleeding", drawn
  from the one ledger both surfaces read. So the walk, the glyph
  ladder and the direction all moved into `luck999.js`, the floor now
  calls them there, and **each EV bar on the table wears the same
  shape** beside its cost, in the floor's three states (green falling,
  red climbing, grey level) with the week's count and the window's own
  total on hover. One series, drawn twice: the glyphs, the eight-week
  window and the scaling all come from the shared module, so the shape
  beside a bar is the shape beside its cell on the floor and neither
  is a second opinion about it. It is drawn, not tapped — the bar
  itself is the way into the drill, and a second control inside one
  row would answer two questions with one tap. A cell with one week on
  record, or a ledger that never saw it bleed, draws nothing at all on
  either felt: a zero-filled ladder would read as a reading the line
  itself refused to draw. Both surfaces open their
  own cell, only one stays open at a time, and tapping the open line
  closes it. On an EV row the line sits *inside* the bar, and the bar
  is the tap that drills — so the line's branch is tested **first**,
  or a player asking "how much did this bleed?" would be dealt a hand
  instead. It answers Enter and Space, not just the mouse, and carries
  `role="button"` + `aria-expanded`. A cell that never bled draws no
  shape, so it opens nothing rather than a ladder of `−0`. The ladder
  is the row's own next line (a sibling after the bar, not a wrapped
  flex child — wrapping pushed the row's ▲ marker onto a line of its
  own). Live: tapping the climbing bar's line printed all eight weeks
  and `−490 over 8 weeks`, switching to the other cell closed the
  first and left exactly one open, and `evsession.rounds` stayed at 1
  throughout — the figures opened, no hand was dealt.
  The bars grow in as the panel opens (a 0.55s
  width sweep), **and the chips count themselves up on exactly that
  beat** — the same 550ms, the same ease-out curve, replayed every time
  the panel is drawn, so the numbers and the bars they belong to grow
  together. CSS cannot count, so the scorecard line, its percentages
  and the bar figures carry their own target (`data-count`) and a small
  frame loop runs the ramp; each figure is `tabular-nums` so the line
  doesn't twitch as digits swap. Two rules keep it honest: it always
  **lands on the number the markup carries**, so a player who never
  looks mid-count reads the same figure either way, and the landing is
  **also armed on a timer**, because a tab that is not painting has its
  frames throttled to nothing — and a frozen "0" where a chip count
  belongs is worse than no animation at all. A redraw cancels any tween
  in flight, and under `prefers-reduced-motion` the bars and the numbers
  beside them hold still together. Live: `0 → 55 → 90 → 109 → 118 → 120`
  across the 550ms, landing on exactly `120 / 53% / 70 / 31% / 120 / 70`.
  **The sweep goes left to right, worst leak first.** The scorecard's
  cut is already sorted worst leak first, and that ordering *is* the
  bar order, so the delay is simply the row's own index
  (`EV_BAR_STAGGER = 70`) · nothing to invent, nothing to keep in
  sync. A chart that says "fix the worst first" should move the eye
  there first instead of presenting three equal bars and trusting the
  reader. Each figure rides **its own** bar · it holds at `0` until
  that bar's delay has passed and then ramps on the same 550ms ·
  and the landing timer is armed past the *last* delay, so the last
  figure still arrives. Live, on a cut of three cells: delays
  `0ms / 70ms / 140ms` on widths `100% / 90% / 80%`, bar 2 first
  moving at ~105ms and bar 3 at ~157ms, mid-sweep figures
  `89 / 70 / 49`, landing on exactly `100 / 90 / 80`.
  Each carries the cell's week over week as a small
  marker — ▼ green when the leak is bleeding less than last week, ▲ red
  when it is bleeding more, · when it is flat — **with the chips behind
  each arrow** ("▼ 8 v 400"), the same figures and the same renderer the
  panel's leak rows use, so the chart shows which fixes are actually
  holding and how fast they are holding. **And every bar names itself on
  hover**:
  the chips behind *that* bar, the miss count the cell carries, and the
  running recovery if you fix every bar down to there — "hard 16 v 10 ·
  −336 chips behind this bar · 9 misses in this cell · 336 back if you
  fix every bar down to here". Live: two bars reading "−120 / 6 misses
  / 120 back" and "−70 / 5 misses / 190 back", widths 100% and 58%. The
  cell name is escaped for the attribute — it comes out of the ledger,
  and the reel is readable by any script on the origin. The live table's
  copy of the same chart names its bars identically.

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
| `luck999.js` | The measured-gap module both pages load as `window.LUCK999` — the luck word, band, sigma, sign-only colour, crossing mark, strip markup **and the week-over-week reading** (weekStart, prevWeek, nextWeek, leakedIn, weekSplit, weekDir) in one source, so the two surfaces cannot drift |
| `shoe999.js` | The shoe + settlement engine both pages load as `window.SHOE999` — one source, no page copy |
| `ev999.js` | The infinite-deck pricing engine both pages load as `window.EV999` — stand/hit/double as expected chips per unit staked |
| `index999.js` | The count's corrections both pages load as `window.INDEX999` — the flips that are right only at a count, and insurance at +3 |
| `room999.js` | The voice registry both pages load as `window.ROOM999` — all eleven voices either felt can sound, the gain and room send each ships with, which surface owns it, the stepped ladder a Levels panel dials in, and the one persisted record (`999.room.tuning`) both felts read, so neither page holds a send or gain of its own |
| `test/roomtune.test.js` | The registry against its own rules: the shipped vocabulary and levels, untouched means untouched, both ladders climbing/falling and clamping (a muted rung stays muted), the dry voice tunable into the room, the lenient restore, reset one or all, and both pages loading, mounting and handling every tap on the panel |
| `test/ledgerround.test.js` | The ledger's own round counter: read leniently through `numInto` and lifted (never lowered) to the book it counts into, counted once per priced round at the commit beside the extremes, restarted by no wipe (new book or fresh shoe), two books unable to hand out one stamp, and the hover naming the ledger round rather than the book's |
| `test/extremehover.test.js` | The extremes' hover: the engine, felt and spread banked with each stamp and kept per end (a moved end re-stamps its own, an untouched end keeps the round it was), `signed()` speaking the strip's own spelling for both the title and the strip line, the title's gap being the shared `word()` of the very book the z was measured on, the visible words unchanged inside the span, and a legacy or half-stamped record printed plain with nothing invented |
| `test/drilloff.test.js` | The drill's off switch: `drillCool` returns 1 for every count of hands served when off (off is not a half-life, it is the absence of one), the shipped ranking obeys it while age still cools and the cap still caps, `off` leads the drill menu and survives a reload as a stored 0, exactly one divide by the half-life exists and it sits behind the guard inside `drillCool`, and the chip reads `off` instead of a `100%` no memory earned |
| `test/keepchip.test.js` | Each memory's retention and its split: the two shares are the ranking's own factors (so the chip can never disagree with the pull beside it), age × drill is the retention it is printed beside, the cap is named when it holds a heavy row, junk clocks cool nothing, the chip's own words (age against drill, raw halves on the title), and every memory wearing one on the all-time ranking only |
| `test/crosschime.test.js` | The crossing chime: one shared voice both felts can sound, both pages bound and gated on `ready()`, the sound itself (a fifth, triangles, quiet, unpanned, in the room), and the shipped fire block on each page run as shipped over six book scenarios — the strip alone, either duel side alone, three felts at once ringing once, nothing ringing when nothing tops its spread, a steady outlier ringing nothing, and a restored outlier banking its mark in silence |
| `test/engines.test.js` | Single-source guard: both pages load each engine, no inline copy survives, tags load in order |
| `test/shoe999.test.js` | Settlement/shoe math against the shipped module |
| `test/ev999.mc.js` | Monte-Carlo + exact-recursion ground truth for the EV999 pricing engine |
| `test/ev999.crosscheck.js` | Book-vs-engine agreement sweep over every hand × upcard × double state |
| `test/leakdrill.test.js` | The stacked-shoe drill: every forced deal must land in its target cell |
| `test/truecount.test.js` | Decks-left, true count and the bet spread, against real shoes |
| `test/quizmc.js` | Monte-Carlo of the quiz draw: 30000 counts x 9 discipline/ledger fixtures, each empirical share held to the intended weights (2% band) and the structural claims (uniform floor, a refusal pulling the rich band, a cold bleed pulling the cold one, each aim reading only its half, a flat pull landing where a fair sample lands, a brutal one bending harder without starving a rung) — seeded, ~1.9s, mutation-checked |
| `test/storeread.test.js` | The storage audit, made permanent: every `localStorage` read in both pages swept for the all-or-nothing restore, the shared `numInto` reader run against every way a field can be unreadable, the ten rewired records pinned, and the clamps that outlived the guards still clamping |
| `README.md` | This page |

Cloth palettes, the hub client and identity handling are vendored from
`999-bridge` (commit `5185558`) into the pages themselves — each page runs
from a single file, no imports, no build step. The cloth choice persists
under `maison21.theme` (what `maison-21/src/theme.ts` reads), with the
legacy `999.login.cloth.v1` key adopted and kept in sync.
