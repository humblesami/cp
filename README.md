# ♠ Court Piece (Rung) — Online Multiplayer

A full-stack real-time Court Piece card game with room management, social auth, and bot substitution.

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js + React | 14.2.5 / 18.3.1 |
| Real-time | Node.js + Socket.io | 20 LTS / 4.7.5 |
| Game Logic | Pure JS module | — |
| Auth | Django + DRF + SimpleJWT | 5.0.6 |
| Social Auth | next-auth + social-auth-app-django | 4.24.7 / 5.4.1 |
| Persistence | PostgreSQL | 16 |
| Live State | Redis | 7.2 |
| Animation | Framer Motion | 11.x |
| State Mgmt | Zustand | 4.5.4 |

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Docker Desktop | Latest | https://www.docker.com/get-started |
| Node.js | v20 LTS | https://nodejs.org |
| Python | 3.12 | https://python.org |

---

## Quick Start (first time)

```bash
git clone <repo-url>
cd courtpiece
bash setup.sh
```

Then open three terminals:

```bash
# Terminal 1 — Django
cd backend-django
source .venv/bin/activate
python manage.py runserver

# Terminal 2 — Node
cd backend-node
npm run dev

# Terminal 3 — Next.js
cd frontend
npm run dev
```

Or use Docker for everything:

```bash
docker compose up
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Node Server | http://localhost:3001 |
| Django API | http://localhost:8000 |
| Django Admin | http://localhost:8000/admin |

---

## Social Auth Setup (Google + Facebook)

### Google
1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Authorised redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID + Secret to `.env`

### Facebook
1. Go to https://developers.facebook.com
2. Create App → Add Facebook Login product
3. Valid OAuth Redirect: `http://localhost:3000/api/auth/callback/facebook`
4. Copy App ID + Secret to `.env`

Without credentials, users can still register/login with username+password via the Django `/api/auth/` endpoints.

---

## Project Structure

```
courtpiece/
├── docker-compose.yml
├── setup.sh                    ← run once
├── .env.example
│
├── backend-django/             ← Auth, match history, admin
│   ├── courtpiece_project/     ← Django settings, urls
│   └── apps/
│       ├── users/              ← User model, social auth pipeline, JWT
│       └── matches/            ← Match recording, stats
│
├── backend-node/               ← Real-time game server
│   └── src/
│       ├── game-engine/        ← Pure JS: deck, validator, trick, scorer, bot
│       ├── socket/             ← roomHandlers, gameHandlers
│       ├── redis/              ← rooms.js, gameState.js
│       └── middleware/         ← JWT auth for sockets
│
└── frontend/                   ← Next.js 14 app
    └── src/
        ├── app/                ← Pages: lobby, room/[id], game/[id]
        ├── components/table/   ← PlayingCard, PlayerSeat, ScoreCard, etc.
        ├── store/              ← Zustand socket store
        └── hooks/              ← useSocket
```

---

## Socket Event Reference

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `create_room` | `{ name, isPrivate }` | Create a new room |
| `join_room` | `{ roomId }` | Join existing room |
| `leave_room` | — | Leave current room |
| `send_chat` | `{ message }` | Send chat message |
| `declare_trump` | `{ trump }` | Hokm caller picks trump suit (S/H/D/C) |
| `play_card` | `{ card }` | Play a card e.g. `"AS"` |
| `continue_game` | — | Start next hand after hand_complete |
| `request_state` | — | Get full state snapshot (reconnect) |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `player_joined` | `{ room, newPlayer }` | Someone joined the room |
| `player_left` | `{ userId, username }` | Someone left voluntarily |
| `player_disconnected` | `{ userId, reconnectWindowMs }` | Disconnected — 30s window |
| `bot_substituted` | `{ seat }` | Bot took over a seat |
| `game_starting` | `{ countdown }` | 4 players seated, starting soon |
| `game_started` | `playerView` | Game began — your hand + state |
| `trump_declared` | `{ trump, callerSeat }` | Trump suit chosen |
| `card_played` | `{ seatIndex, card, turn }` | A card was played |
| `trick_won` | `{ winningSeat, coat }` | Trick resolved |
| `hand_complete` | `{ result, score }` | Hand finished |
| `match_over` | `{ winner, score }` | Match finished |
| `state_update` | `playerView` | Full state refresh after any change |
| `chat_message` | `{ username, message }` | Chat broadcast |

---

## Game Rules Implemented

- ✅ 4 players, 2 teams (Seats 0&2 = Team A, Seats 1&3 = Team B)
- ✅ Trump (Rung) declared by Hokm caller after seeing first 5 cards
- ✅ Must follow suit; can play any card if void
- ✅ No Ace on Ace rule
- ✅ Coat detection (first 7 consecutive tricks)
- ✅ Court detection (all 13 tricks)
- ✅ Match scoring (first to 7 hands)
- ✅ 30-second reconnect window before bot substitution
- ✅ Atomic room join (Redis SETNX lock — no race conditions)
- ✅ Cards never leaked to other players (filtered per socket)

---

## Running Tests

```bash
cd backend-node
npm test
```

Covers: trick resolution, legal move validation, ace-on-ace rule, coat/court detection, scoring, dealing.

---

## Adding Features (next steps)

- [ ] Private rooms with invite code
- [ ] Player profiles and match history page
- [ ] Leaderboard page
- [ ] Sound effects (Web Audio API)
- [ ] Drag-to-play cards (Framer Motion drag)
- [ ] Rematch button (replay same 4 players)
- [ ] Mobile layout optimisation
