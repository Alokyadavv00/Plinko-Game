# Plinko — Provably Fair Game

A full-stack interactive Plinko game with provably-fair commit-reveal RNG, deterministic seed-replayable outcomes, polished UI/UX, and a public verifier page.

> **Engineering exercise only — no real money involved.**

## Quick Start

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
cd plinko-game
npm install
```

### Environment Variables

The `.env` file is pre-configured:
```
DATABASE_URL="file:d:/Plinko Game/plinko-game/prisma/dev.db"
```

For a different machine, update the path:
```bash
# Create .env with your absolute path (SQLite)
echo 'DATABASE_URL="file:./dev.db"' > .env
```

### Database Setup

```bash
npx prisma db push
```

### Development

```bash
npm run dev     # Start dev server (http://localhost:3000)
npm test        # Run unit tests
npm run build   # Production build
npm start       # Start production server
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm test` | Run vitest unit tests |
| `npm run db:push` | Push schema to SQLite |
| `npm run db:studio` | Open Prisma Studio |

---

## Architecture

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── rounds/
│   │   │   ├── commit/route.ts  # POST: create round
│   │   │   ├── [id]/
│   │   │   │   ├── start/route.ts  # POST: compute outcome
│   │   │   │   ├── reveal/route.ts # POST: reveal server seed
│   │   │   │   └── route.ts        # GET: round details
│   │   │   └── route.ts         # GET: list rounds
│   │   └── verify/route.ts      # GET: deterministic verification
│   ├── components/
│   │   ├── Game.tsx             # Main game orchestrator
│   │   ├── PlinkoBoard.tsx      # Canvas board renderer
│   │   ├── PayoutTable.tsx      # Multiplier display
│   │   ├── FairnessInfo.tsx     # Fairness proof panel
│   │   └── SessionLog.tsx       # Recent rounds sidebar
│   ├── verify/page.tsx          # Public verifier page
│   ├── page.tsx                 # Main game page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Design system
├── lib/
│   ├── prng.ts                  # xorshift32 PRNG
│   ├── hash.ts                  # SHA-256 utilities
│   ├── engine.ts                # Deterministic Plinko engine
│   ├── payouts.ts               # Paytable
│   ├── audio.ts                 # Web Audio API sounds
│   ├── confetti.ts              # Confetti particle system
│   └── prisma.ts                # Database client singleton
├── __tests__/
│   ├── prng.test.ts             # PRNG test vectors
│   ├── hash.test.ts             # Hash test vectors
│   └── engine.test.ts           # Engine determinism tests
└── generated/                   # Prisma generated client
```

---

## Fairness Specification

### Protocol: Commit-Reveal with Client Contribution

1. **Commit Phase**: Server generates `serverSeed` (64 hex chars) and `nonce`, publishes `commitHex = SHA256(serverSeed:nonce)` to the client.

2. **Start Phase**: Client provides `clientSeed`, `dropColumn`, and `betCents`. Server computes:
   - `combinedSeed = SHA256(serverSeed:clientSeed:nonce)`
   - Uses `combinedSeed` to seed PRNG and determine outcome
   - Returns `binIndex` and `path` without revealing `serverSeed`

3. **Reveal Phase**: After animation, server reveals `serverSeed`. Client can verify.

### PRNG: xorshift32

- **Algorithm**: Marsaglia's xorshift32 with shift constants (13, 17, 5)
- **Seed**: First 4 bytes of `combinedSeed`, interpreted as big-endian 32-bit unsigned int
- **Output**: `state / 2^32` produces float in [0, 1)
- **State constraint**: never zero (falls back to 1)

### Deterministic Engine

**PRNG stream order** (critical for reproducibility):
1. **Peg map generation**: For each row r (0-11), generate (r+1) bias values
   - `leftBias = 0.5 + (rand() - 0.5) * 0.2`, rounded to 6 decimal places
2. **Row decisions**: For each row, one `rand()` call
   - `pegMapHash = SHA256(JSON.stringify(biases))`

**Drop column influence**:
- `adj = (dropColumn - floor(rows/2)) * 0.01`
- `bias' = clamp(leftBias + adj, 0, 1)`

**Decision**: If `rand() < bias'` then Left, else Right (pos += 1). Final `binIndex = pos`.

### Hash Functions
- SHA-256 via Node.js `crypto.createHash('sha256')`
- All rounding to 6 decimal places via `Math.round(x * 1e6) / 1e6`

---

## Test Vectors

```
Inputs:
  serverSeed = "b2a5f3f32a4d9c6ee7a8c1d33456677890abcdeffedcba0987654321ffeeddcc"
  nonce = "42"
  clientSeed = "candidate-hello"
  dropColumn = 6

Derived:
  commitHex    = bb9acdc67f3f18f3345236a01f0e5072596657a9005c7d8a22cff061451a6b34
  combinedSeed = e1dddf77de27d395ea2be2ed49aa2a59bd6bf12ee8d350c16c008abd406c07e0
  PRNG seed    = 0xe1dddf77 (big-endian, first 4 bytes)

  First 5 rand() values:
    0.1106166649, 0.7625129214, 0.0439292176, 0.4578678815, 0.3438999297

  Peg map (first 3 rows):
    Row 0: [0.422123]
    Row 1: [0.552503, 0.408786]
    Row 2: [0.491574, 0.468780, 0.436540]

  binIndex = 6 (center drop, adj = 0)
```

All test vectors verified with 24 passing unit tests.

---

## Paytable

| Bin | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|-----|---|---|---|---|---|---|---|---|---|---|----|----|-----|
| Mult | 16x | 9x | 5x | 3x | 1.5x | 1x | 0.5x | 1x | 1.5x | 3x | 5x | 9x | 16x |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/rounds/commit` | Create round, get commitHex + nonce |
| `POST` | `/api/rounds/:id/start` | Submit clientSeed + dropColumn, get outcome |
| `POST` | `/api/rounds/:id/reveal` | Reveal serverSeed |
| `GET`  | `/api/rounds/:id` | Get full round details |
| `GET`  | `/api/rounds?limit=20` | List recent rounds |
| `GET`  | `/api/verify?serverSeed&clientSeed&nonce&dropColumn` | Verify any round |

---

## Easter Eggs

1. **TILT Mode** (press `T`): Board rotates 3 degrees with CRT scanline filter
2. **open sesame**: Type these words to toggle dungeon/torchlight theme for one round
3. **Golden Ball**: If last 3 landings were center bin (6), next ball glows gold

---

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, HTML5 Canvas
- **Backend**: Next.js API Routes
- **Database**: SQLite via Prisma
- **Hash**: SHA-256 (Node.js crypto)
- **PRNG**: xorshift32 (custom implementation)
- **Sound**: Web Audio API (procedural synthesis)
- **Testing**: Vitest

---

## AI Usage

This project was built with AI assistance. Key areas where AI was used:
- Architecture planning and file structure design
- xorshift32 PRNG implementation with exact test vector matching
- Canvas rendering and ball animation logic
- Provably-fair commit-reveal protocol implementation
- All code was reviewed and adjusted for correctness against the spec test vectors

---

## What I Would Do Next

With more time:
- **Matter.js physics**: Real physics simulation (keeping discrete decisions authoritative)
- **Animation polish**: More particle effects, screen shake on big wins
- **Downloadable CSV**: Export round hashes for audit
- **Database**: Migrate to Postgres for production
- **Auth**: User sessions for balance tracking
- **Rate limiting**: Prevent API abuse
- **WebSocket**: Real-time updates for live session log
- **Deploy**: Vercel/Fly with Postgres
