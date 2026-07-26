# Gemstones_AI — Phase 1

A transparent, expert-reviewed gemstone recommendation platform combining
traditional astrological guidance with scientific gemology, certification
verification, and consumer-purchase protection. Full architecture: see
the orchestrator/MCP diagram this repo implements incrementally.

**Phase 1 scope** (this repo, today): the deterministic birth-intelligence
core only — birthplace resolution, historical timezone handling, natal
chart calculation, Vimshottari dasha, and numerology. No gemstone rule
engine, no gemology data, no certificate verification, no LLM calls
anywhere. That is deliberate: later phases build *on top of* this layer,
never around it.

## Why phase it this way

The architecture's own decision-engine design draws a hard line between:

1. **Deterministic layer** — pure math (ephemeris, dasha, numerology).
   Zero hallucination risk because there is no model in the loop.
2. **Rule-engine layer** (Phase 2) — expert-curated traditional rules.
3. **AI explanation layer** (Phase 4) — explains/translates, never
   invents a chart position or a rule.

Phase 1 builds and proves layer 1 in isolation, with real astronomical
calculations validated against known reference points (equinox/solstice
Sun position, historical Indian timezone standards, Rahu-Ketu opposition,
etc. — see each package's test suite). Everything after this is additive.

## Packages

| Package | Role | Maps to architecture diagram |
|---|---|---|
| `@gemstones-ai/shared` | Common TypeScript types (BirthInput, NatalChart, ConfidenceIndicators, AuditEntry, ...) | cross-cutting |
| `@gemstones-ai/ephemeris-mcp` | Sidereal (Lahiri) chart calculation — planets, houses, nakshatras, D9/D10 | **Ephemeris MCP** |
| `@gemstones-ai/geo-timezone-mcp` | Birthplace geocoding + historical IANA timezone resolution | **Geolocation MCP** + **Timezone MCP** |
| `@gemstones-ai/numerology` | Mulank, Bhagyank, personal year/month | Numerology Agent (pre-Rule-Graph) |
| `@gemstones-ai/dasha` | Vimshottari mahadasha/antardasha, Sade Sati | Dasha & Transit Agent |
| `@gemstones-ai/orchestrator` | Wires the above into one pipeline, Express HTTP API, audit trail | **GEMSTONES_AI ORCHESTRATOR** (partial) |
| `frontend/` | Birth-data intake form + deterministic report display | "1. Input" / output report (partial) |

## Architectural note: in-process vs. networked MCP

Each of `ephemeris-mcp` and `geo-timezone-mcp` is built as **both**:

- a standalone MCP server (`createEphemerisMcpServer()` /
  `createGeoTimezoneMcpServer()`, using `@modelcontextprotocol/sdk`,
  runnable over stdio today and swappable to Streamable HTTP transport
  for a standalone Cloud Run deployment), **and**
- a plain exported function (`buildNatalChart`, `resolveHistoricalTimezone`)
  that the orchestrator calls in-process.

Phase 1's orchestrator uses the in-process functions directly — it's
faster to develop and test, and avoids running 5+ separate network
services for a deterministic-only slice. When Phase 2+ adds enough
agents that independent scaling/deployment of each MCP server matters,
switch the orchestrator to call them over the MCP protocol (HTTP
transport) instead of importing them — the server wrapper is already
there waiting for that swap.

## Known limitations (read before using outside a demo)

- **Planetary model**: Mercury–Saturn use simplified two-body Keplerian
  elements (Standish 1992 J2000 mean elements), not a full numerical
  ephemeris. Accuracy is roughly arcminute-level near J2000, degrading
  slowly outside ~1800–2050. Good enough for sign/nakshatra-level Vedic
  astrology in almost all cases; **not** good enough for tight orb work
  or professional publication. Replace with Swiss Ephemeris (native
  binding or WASM) before any production use — see
  `packages/ephemeris-mcp/src/astro-math/planets.ts`.
- **Ayanamsa**: linear precession approximation, not the official Indian
  Astronomical Ephemeris polynomial. Sign boundaries are only at risk
  for births within about a day of an exact sign-change transit — those
  should already carry low `birthDataConfidence`.
- **Sade Sati phase dates**: Phase 1 reports which phase is active
  *today*, not exact phase start/end dates (that needs an iterative
  transit-boundary search — a Phase 2 feature).
- **Numerology compatibility table**: explicitly marked in code as an
  unreviewed placeholder. Per the project's own rule (traditional
  content must be expert-approved, not model-invented), replace it with
  real astrologer/numerologist-curated data before this reaches a user.
- **Geocoding provider**: wired to the public Nominatim endpoint by
  default, which has a restrictive usage policy for anything beyond
  light testing. Set `GEOCODING_BASE_URL` / `GEOCODING_API_KEY` to a
  compliant hosted provider (or a self-hosted Nominatim instance)
  before any real traffic.

None of these are hidden — every one is called out in the code where it
matters, and several are also surfaced live in the `ConfidenceIndicators`
the orchestrator returns.

## Running locally

```bash
npm install
npm run build   # builds shared -> ephemeris-mcp/geo-timezone-mcp/numerology/dasha -> orchestrator
npm test         # runs every package's test suite

# start the orchestrator API
PORT=8080 npm run dev:orchestrator
# then open frontend/index.html in a browser (point "Orchestrator endpoint" at http://localhost:8080)
```

## Deployment plan (GCP, matching your existing Firebase setup)

- **Frontend** → Firebase Hosting (same as your other projects), calling
  the orchestrator's Cloud Run URL instead of the Anthropic API directly.
- **Orchestrator** → Cloud Run service. Reads `PORT` from the environment
  already (Cloud Run's convention). Add `GEOCODING_BASE_URL`,
  `GEOCODING_API_KEY`, `GEOCODING_USER_AGENT` as environment variables /
  Secret Manager references for a compliant geocoding provider.
- **Data** → Firestore for both relational data (user profiles, consent
  records, audit trail — see `AuditEntry` in shared types) and, later,
  vector search over the GIA knowledge base (Phase 3) via Firestore's
  native `findNearest` vector index. `packages/orchestrator/src/audit.ts`
  currently ships an `InMemoryAuditSink`; swap in a Firestore-backed
  `AuditSink` implementation (same interface) when persistence is needed
  — `firebase-admin` is already a declared dependency for that step.
- **Secrets** → Secret Manager for the geocoding API key and (in later
  phases) the GIA Report Check integration and the Anthropic API key
  used by the explanation layer.

## What's deliberately NOT here yet

Gemstone rules, gemology data, certificates, consumer-protection
filtering, human review routing, explanation generation, DPDP consent
UI/storage, and any LLM call. These are Phases 2–4 per the architecture
diagram and this project's own phased build plan.
