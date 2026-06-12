# Court Piece — Architecture & Codebase Guide

> **Purpose of this document**: This is a reference for an AI coding assistant (or new developer) to understand what this project is, how the pieces fit together, and where to make changes for common tasks. Read this fully before editing code.

---

## 1. What This App Is

A real-time multiplayer implementation of **Court Piece** (also called Rung/Hokm), a 4-player trick-taking card game played in 2 teams of 2 (partners sit opposite each other).

Players create or join "rooms" in a lobby. When 4 players are seated, a game begins automatically: one player declares a trump suit, then all 13 tricks are played in real time with every move broadcast instantly to the other 3 players. Match score accumulates across hands until one team reaches 7 points. Players can leave anytime; if someone disconnects mid-game, a bot takes over their seat after 30 seconds.

---

## 2. The Three Services (and why they're separate)

This is **not** a monolith. It's three independently-runnable services plus two data stores, communicating over HTTP and WebSockets.

```
┌─────────────────┐     WebSocket      ┌──────────────────┐
│   FRONTEND       │ ◄────────────────► │   NODE SERVER     │
│   (Next.js)      │                     │  (Socket.io)      │
│   Port 3000      │    HTTP (record)    │   Port 3001       │
│                  │ ◄────────────────── │                   │
└────────┬─────────┘                     └─────────┬─────────┘
         │                                          │
         │ SQL Queries (pg)                Redis (live state)
         │                                          │
         ▼                                          ▼
┌─────────────────┐                        ┌──────────────────┐
│    POSTGRES     │                        │      REDIS        │
│ (users_user,    │                        │  rooms, games,    │
│  matches_match) │                        │  join locks       │
└─────────────────┘                        └──────────────────┘
         ▲
         │ Shared DB access
┌────────┴────────┐
│     DJANGO      │
│ (Migrations &   │
│  Admin Panel)   │
│   Port 8000     │
└─────────────────┘
```

### Why split this way?

| Service | Owns | Why it's separate |
|---|---|---|
| **Django** | DB Migrations & admin dashboard (Port 8000) | Provides schema migration files and an out-of-the-box admin panel. Does NOT sit in the runtime authentication or gameplay loop. |
| **Node.js** | Live game state, WebSocket connections, turn logic (Port 3001) | Sockets stay open and push instantly. Authenticates sockets using NextAuth-issued JWTs. |
| **Redis** | Active room seats, in-progress game state, join locks | Temporary game state and locks. Avoids hammering Postgres with live state updates. |
| **Next.js** | UI, NextAuth Social Logins, Postgres DB connections (Port 3000) | Authenticates OAuth users, updates database user records directly, and exposes internal API `/api/matches/record` for Node.js. |

**Golden rule**: Node never stores permanent data. If you're tempted to query Postgres from Node mid-game, or push live card data into Node memory — stop, that's a sign you're breaking the boundary. All database updates run asynchronously via Next.js backend API endpoints.

---

## 3. Directory Structure (annotated)

```
courtpiece/
├── docker-compose.yml          # Spins up all 5 services for local dev
├── setup.sh                    # One-time setup script
├── .env.example                # OAuth credentials template
│
├── backend-django/
│   ├── courtpiece_project/
│   │   ├── settings.py         # ALL config: DB, Redis, JWT, OAuth, CORS
│   │   └── urls.py             # Top-level URL routing
│   └── apps/
│       ├── users/
│       │   ├── models.py       # User model (extends AbstractUser, adds avatar/wins/losses)
│       │   ├── views.py         # /api/auth/register, /me, /leaderboard
│       │   ├── pipeline.py      # Runs AFTER Google/FB login: saves avatar, issues JWT
│       │   └── urls.py
│       └── matches/
│           ├── models.py        # Match model: who played, who won, score, court/coat flags
│           ├── views.py         # POST /api/matches/record/ ← called by Node when game ends
│           └── urls.py
│
├── backend-node/
│   └── src/
│       ├── index.js             # Entry point: Express + Socket.io setup
│       ├── middleware/
│       │   └── auth.js          # Verifies JWT on socket connection
│       ├── redis/
│       │   ├── client.js        # Redis connection singleton
│       │   ├── rooms.js         # Room CRUD + ATOMIC JOIN (the race condition fix)
│       │   └── gameState.js     # Save/load/delete live game state JSON
│       ├── game-engine/         # ⭐ PURE LOGIC, NO I/O — the actual rules of the game
│       │   ├── deck.js          # Card representation, shuffle, deal
│       │   ├── validator.js     # "Is this card legal to play right now?"
│       │   ├── trick.js         # "Who wins this trick?"
│       │   ├── scorer.js        # Coat/Court detection, hand & match scoring
│       │   ├── engine.js         # Orchestrates state transitions (the state machine)
│       │   └── bot.js            # Rule-based AI for disconnected players
│       ├── socket/
│       │   ├── index.js          # Registers all socket handlers on connection
│       │   ├── roomHandlers.js   # create_room, join_room, leave_room, chat, disconnect
│       │   └── gameHandlers.js   # declare_trump, play_card, continue_game
│       └── routes/
│           └── rooms.js          # REST: GET /api/rooms (lobby room list)
│   └── tests/
│       └── engine.test.js        # Unit tests for game-engine/* (run with `npm test`)
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.jsx                  # Landing/login page (Google/FB buttons)
        │   ├── lobby/page.jsx            # Room list + create room
        │   ├── room/[id]/page.jsx        # Waiting room (seats, chat, countdown)
        │   ├── game/[id]/page.jsx        # ⭐ THE MAIN GAME TABLE
        │   └── api/auth/[...nextauth]/route.js  # NextAuth config (Google/FB OAuth)
        ├── components/table/
        │   ├── PlayingCard.jsx           # Single card (face up/down, playable highlight)
        │   ├── PlayerSeat.jsx            # One player's avatar/name/turn indicator
        │   ├── ScoreCard.jsx             # Top-left scorecard (matches screenshot)
        │   ├── TrumpIndicator.jsx        # Top-right Rung display
        │   ├── TrumpSelector.jsx         # Modal: Hokm caller picks trump suit
        │   ├── HandCompleteModal.jsx     # "Continue or Quit" after each hand
        │   ├── MatchOverModal.jsx        # Final win/lose screen
        │   └── ChatPanel.jsx
        ├── store/
        │   └── socketStore.js            # ⭐ ZUSTAND STORE — single source of truth for all live state
        └── hooks/
            └── useSocket.js               # Connects socket using session JWT
```

---

## 4. Data Model Reference

### 4.1 Postgres (permanent — via Django)

```python
User (extends Django's AbstractUser)
  - username, email, password
  - avatar_url          # from Google/FB profile picture
  - total_matches, wins, losses

Match
  - room_id             # links back to the Redis room ID that existed during play
  - team_a (M2M User), team_b (M2M User)
  - winning_team        # "A" or "B"
  - score_a, score_b    # final match points
  - court_achieved, coat_achieved   # booleans, true if EITHER hand in the match had one
  - started_at, ended_at
```

### 4.2 Redis (temporary — via Node)

**Room hash** — `room:{roomId}`, exists from creation until last player leaves:
```json
{
  "id": "ABC12345",
  "name": "Sami's Table",
  "status": "waiting | ready | in_progress",
  "isPrivate": "0",
  "createdBy": 42,
  "seats": {
    "0": { "userId": 42, "username": "Sami", "isBot": false, "connected": true },
    "1": null,
    "2": null,
    "3": null
  }
}
```
- **Seat 0 & 2 = Team A. Seat 1 & 3 = Team B.** This is hardcoded everywhere (`seat % 2 === 0` → Team A).

**Game state** — `game:{roomId}`, created when the 4th player joins, deleted when the match ends:
```json
{
  "phase": "trump_selection | playing | hand_complete | match_over",
  "dealerSeat": 0,
  "trumpCallerSeat": 1,
  "trump": "H",                          // null until declared
  "turn": 1,                             // seat index whose turn it is
  "seats": [ {userId, username, isBot}, ... ],   // 4 entries
  "hands": [ ["AS","2H",...13 cards], [...], [...], [...] ],  // ALL 4 hands — never sent in full to clients!
  "currentTrick": {
    "ledBy": 1,
    "cards": { "0": null, "1": "QS", "2": null, "3": null }
  },
  "trickWinners": [0, 2, 1, ...],        // seat index that won each completed trick, in order
  "score": { "A": 2, "B": 1 },           // MATCH score (hands won), not trick count
  "handResults": [ {winningTeam, tricksA, tricksB, isCourt, isCoat, pointsA, pointsB}, ... ],
  "startedAt": 1718000000000
}
```

⚠️ **Critical security rule**: `hands` contains all 4 players' cards. This object **lives only in Redis** and is **never broadcast as-is**. Every time it's sent to a client, it goes through `getPlayerView(state, seatIndex)` in `engine.js`, which strips it down to just that player's hand + everyone's card *counts*.

---

## 5. Card & Game Vocabulary (used throughout the code)

- **Card string format**: `"AS"` = Ace of Spades. First char = rank (`2-9,T,J,Q,K,A`), second char = suit (`S,H,D,C`).
- **Seat index**: 0-3. Seats 0 & 2 are Team A (partners), seats 1 & 3 are Team B (partners).
- **Trump / Rung**: the suit declared by the "Hokm caller" that beats all other suits.
- **Hokm caller / trumpCallerSeat**: the player to the dealer's right (`(dealerSeat + 1) % 4`), who sees their 5 cards first and declares trump. They also lead the first trick.
- **Trick**: one round where all 4 players play one card each; highest card (or highest trump) wins.
- **Hand**: a full round of 13 tricks. Winning 7+ tricks wins the hand (1 point). Winning all 13 = **Court** (2 points, opponent goes to -2). Winning the first 7 consecutively = **Coat** (instant hand win).
- **Match**: multiple hands, first team to 7 points wins.
- **No Ace on Ace**: if the led card is an Ace, the next player (if they have other cards of that suit) cannot play their Ace of that suit.

---

## 6. End-to-End Flows (read these to understand "how does X work")

### 6.1 User logs in

1. User clicks "Continue with Google" on `frontend/src/app/page.jsx`
2. NextAuth (`app/api/auth/[...nextauth]/route.js`) handles the OAuth redirect
3. NextAuth `signIn` callback queries PostgreSQL directly using `pg` to insert or update the user in the `users_user` table.
4. NextAuth's `jwt` callback signs a custom JWT containing `{ user_id, username }` using a shared `JWT_SECRET` and stores it in `session.djangoAccess`.
5. `useSocket.js` reads `session.djangoAccess` and passes it as `auth.token` when connecting to Socket.io
6. Node's `middleware/auth.js` verifies this JWT against the shared `JWT_SECRET` on every socket connection and attaches `socket.user = { id, username }`


### 6.2 Creating a room

1. Frontend: user types a name on `/lobby`, clicks Create → `useSocketStore().createRoom(name)`
2. This emits `create_room` to Node
3. `socket/roomHandlers.js` → `createRoom()` in `redis/rooms.js` writes a new `room:{id}` hash to Redis with the creator in seat 0
4. Returns `roomId` via the socket ack callback; frontend redirects to `/room/{roomId}`

### 6.3 Joining a room — THE RACE CONDITION FIX

This is the most important flow to understand if extending room logic.

1. Frontend emits `join_room` with `roomId`
2. `roomHandlers.js` calls `joinRoom(roomId, userId, username)` in `redis/rooms.js`
3. **Lock acquisition**: `redis.set('lock:room:{roomId}', userId, { NX: true, EX: 5 })`
   - `NX` = only set if key doesn't exist. Only ONE concurrent request can acquire this.
   - If two players hit "Join" at the same instant, one gets the lock immediately; the other's `set` returns `null` → it sleeps 150ms and **recursively retries** `joinRoom()`.
4. Lock holder: reads seats, finds first `null` seat. If none found → throws `ROOM_FULL` (this is what the *second* player will see if they retry after the room fills).
5. Writes updated seats back, **then releases the lock in a `finally` block** (so a crash doesn't leave the room permanently locked).
6. If this was the 4th player (`playerCount === 4`), broadcasts `game_starting` with a 3-second countdown, then calls `startGame()`.

**If you need to modify join logic**: always keep the lock/finally pattern. Never read-then-write seats without holding the lock.

### 6.4 Game starts (4th player joins)

1. `startGame()` in `roomHandlers.js` calls `createGameState(seats)` from `game-engine/engine.js`
2. This calls `deal()` from `deck.js` (shuffles 52 cards, deals 13 to each of 4 hands)
3. Sets `phase: "trump_selection"`, `trumpCallerSeat = (dealerSeat + 1) % 4`, `turn = trumpCallerSeat`
4. Saves to Redis via `saveGameState()`
5. For **each connected socket** in the room, finds their seat index and emits `game_started` with `getPlayerView(state, seatIndex)` — so each player only ever receives their own 13 cards
6. Frontend: `socketStore.js` listens for `game_started`, calls `flattenView()` to populate the Zustand state, sets `gamePhase`

### 6.5 Trump declaration

1. Frontend: if `trumpCallerSeat === yourSeat` and `gamePhase === "trump_selection"`, `TrumpSelector.jsx` modal appears
2. User picks a suit → emits `declare_trump` with `{ trump: "H" }`
3. `socket/gameHandlers.js` → `declareTrump(state, seatIndex, trumpSuit)` in `engine.js`
   - Validates it's actually the trump caller's turn and phase is correct
   - Sets `state.trump`, `state.phase = "playing"`, `state.turn = trumpCallerSeat` (they lead first)
4. Broadcasts `trump_declared` to everyone, then `broadcastPlayerViews()` sends `state_update` to each player

### 6.6 Playing a card — THE CORE LOOP

This is `processCardPlay()` in `gameHandlers.js`, called for both human AND bot plays:

1. `playCard(state, seatIndex, card)` in `engine.js`:
   - Checks `state.turn === seatIndex` (must be your turn)
   - Checks `isLegalPlay(card, hand, currentTrick, trump)` in `validator.js`:
     - If leading: anything is legal
     - If following: must match led suit if you have it
     - **No Ace on Ace**: if led card is an Ace and you have non-ace cards of that suit, your Ace of that suit is removed from legal options
   - Removes card from that seat's hand, adds it to `currentTrick.cards[seatIndex]`
   - If not all 4 seats have played yet → advance `turn` to `(seatIndex + 1) % 4`, return early
   - If all 4 played → **trick complete**:
     - `resolveTrick()` in `trick.js` determines winner (highest trump, else highest card of led suit)
     - Push winner to `trickWinners[]`
     - `detectCoat()` checks if first 7 tricks all went to one team → ends hand early
     - If 13 tricks done OR coat → **hand complete**: `scoreHand()` in `scorer.js` computes points, updates `state.score`
     - `checkMatchOver()`: if either team's score ≥ 7 → `phase = "match_over"`
     - Winner of the trick leads the next one (`turn = trickWinner`)
2. Save new state to Redis
3. Broadcast `card_played` (everyone sees the card immediately — this is the "as soon as a player plays a card, all others see it" requirement)
4. If trick complete → broadcast `trick_won` after a 500ms delay (for animation pacing)
5. If hand complete → broadcast `hand_complete` after 1.5s, with `result` and updated `score`
6. If match over → broadcast `match_over`, call `recordMatchToNextjs()` (POSTs to Next.js `/api/matches/record`), delete the Redis game state
7. Otherwise, `broadcastPlayerViews()` sends each player their updated `state_update`
8. **Bot check**: if the next `turn` belongs to a seat where `isBot: true`, schedule `triggerBotPlay()` after 1.2s — which calls `botChooseCard()` from `bot.js` and recursively calls `processCardPlay()` again

### 6.7 Player disconnects → bot substitution

1. Socket `disconnect` event fires in `roomHandlers.js`
2. `markDisconnected()` flags the seat in the Redis room hash
3. Broadcasts `player_disconnected` with a 30-second window
4. Starts a `setTimeout` (stored in `disconnectTimers` Map, keyed by `{roomId}:{userId}`)
5. **If they reconnect** within 30s (via `join_room` again): the timer is found and `clearTimeout()`'d, `markReconnected()` runs, and `game_state_snapshot` is sent to restore their view
6. **If timer fires**: `gameState.seats[seat].isBot = true` is set, saved, and `bot_substituted` is broadcast. From this point, whenever `turn` lands on this seat, `triggerBotPlay()` runs automatically (see 6.6 step 8)

### 6.8 Hand complete → Continue or Quit

1. `HandCompleteModal.jsx` appears when `gamePhase === "hand_complete"`, showing `lastHandResult` and current `score`
2. **Continue**: emits `continue_game` → `startNewHand()` in `engine.js` rotates the dealer, re-deals, resets `phase` to `trump_selection`
3. **Quit**: calls `leaveRoom()` then routes to `/lobby`. Note: this removes the player from the room entirely — the remaining 3 players would need a new 4th player or bot to continue (this edge case is a known gap, see Section 8)

---

## 7. Frontend State Management (Zustand)

**Everything live-game-related lives in `frontend/src/store/socketStore.js`.** There is exactly one socket connection per session, created in `connect()`.

Key principle: **the store is a thin reflection of server-pushed events.** Components don't compute game logic — they just render whatever `socketStore` currently holds, and call action methods (`playCard()`, `declareTrump()`, etc.) which emit socket events and wait for the server's authoritative response via `state_update`.

```
Server event          → Store handler           → State fields updated
─────────────────────────────────────────────────────────────────────
game_started           flattenView()             gamePhase, yourHand, yourSeat, trump, turn, seats, score...
state_update           flattenView()             (same fields, refreshed after every action)
card_played            inline                    lastPlayedCard, turn
trick_won               inline                    lastTrickWinner, notification (if coat)
hand_complete           inline                    score, lastHandResult, gamePhase="hand_complete"
match_over               inline                    score, gamePhase="match_over"
trump_declared           inline                    trump, notification
chat_message              inline                   chatMessages[]
player_joined/left       inline                    roomPlayers[]
player_disconnected       inline                   notification
bot_substituted           inline                   notification
```

`emitWithAck()` wraps socket emits in a Promise so action methods can be `await`ed and checked for `{ ok, error }` — used for things like showing "Room is full" alerts.

---

## 8. Known Gaps / Things an AI Assistant Should Flag or Ask About

These are intentional simplifications in the skeleton — not bugs, but incomplete:

1. **NextAuth direct-to-Postgres auth** has been implemented. User entries are saved/updated automatically in the `users_user` table.
2. **Player quits during `hand_complete`**: room ends up with 3 players and no mechanism to add a 4th or convert to bot. Needs a decision: auto-bot the empty seat, or close the room.
3. **Match Recording Endpoint**: Expose an API route `/api/matches/record` in Next.js. The Node.js server calls this endpoint directly to persist match records using raw SQL transactions.
4. **No private room join-by-code UI** — backend supports `isPrivate` flag but frontend always creates public rooms and there's no "join by code" input.
5. **Reconnect flow** re-sends `game_state_snapshot` but the frontend's `room/[id]/page.jsx` doesn't yet handle resuming directly into `/game/[id]` if a game is already in progress when the page loads (it only redirects on the `gamePhase` socket event firing *after* mount).
6. **Bot logic** is a simple heuristic (`game-engine/bot.js`) — it doesn't account for counting/memory of played cards beyond the current trick. Fine for v1, but a "smarter bot" task should start here.

---

## 9. Where to Make Common Changes

| Task | Files to touch |
|---|---|
| Change scoring rules (e.g. target score, court points) | `backend-node/src/game-engine/scorer.js` |
| Change/add a card rule (e.g. revoke No-Ace-on-Ace) | `backend-node/src/game-engine/validator.js` |
| Add a new socket event | `backend-node/src/socket/{room,game}Handlers.js` + corresponding listener in `frontend/src/store/socketStore.js` |
| Change table layout / card positions | `frontend/src/app/game/[id]/page.jsx` + `components/table/PlayerSeat.jsx` |
| Add a new Django model/endpoint | `backend-django/apps/{users,matches}/` |
| Change room/seat data structure | `backend-node/src/redis/rooms.js` — remember to update `getPlayerView()` in `engine.js` if it affects what's sent to clients |
| Improve bot strategy | `backend-node/src/game-engine/bot.js` (pure function — easy to unit test) |
| Add tests | `backend-node/tests/engine.test.js` (Jest, run via `npm test`) |

---

## 10. Mental Model Summary (TL;DR for the AI assistant)

- **Redis is the live truth. Postgres is the historical truth. Never mix them mid-game.**
- **`game-engine/` is pure functions — no Redis, no sockets, no side effects.** This is where game rules live and where tests should target. `engine.js` is the state machine; everything else is a helper it calls.
- **A "player view" is always derived, never stored** — `getPlayerView()` is the only thing allowed to leave the server with hand data, and it only includes the requesting player's own cards.
- **Every state change follows the same pattern**: mutate state → save to Redis → broadcast relevant event(s) → broadcast full `state_update` to each player individually.
- **The frontend never computes game logic** — it reflects `socketStore` and sends intents (`play_card`, `declare_trump`) to the server, which is the sole authority.
