# Gemstones_AI — Phase 2

A transparent, expert-reviewed gemstone recommendation platform combining
traditional astrological guidance with scientific gemology, certification
verification, and consumer-purchase protection. Full architecture: see
the orchestrator/MCP diagram this repo implements incrementally.

**Deployed today**: https://angshuman-ai-corp.web.app/gemstones (frontend,
Firebase Hosting) calling https://gemstones-ai.onrender.com (orchestrator,
Render free tier).

**Phase 1 scope**: the deterministic birth-intelligence core — birthplace
resolution, historical timezone handling, natal chart calculation,
Vimshottari dasha, and numerology. No LLM calls anywhere.

**Phase 2 scope** (this repo, today, additive on top of Phase 1): the
Rule-Graph MCP — functional benefic/malefic classification (kendra/
trikona/dusthana/yogakaraka), a Traditional Rule Agent that shortlists
candidate gemstones from two near-universal Parashari principles
(ascendant-lord strengthening, current-dasha benefic amplification), and
a Gemstone Conflict Agent (functional-malefic exclusion, natural-enmity
caution via the classical 7-graha friendship table, Rahu/Ketu
simultaneous-wear caution, existing-gemstone conflicts, mandatory
human-review flags for high-impact stones). Still no gemology data, no
certificate verification, no consumer-protection filtering, and still no
LLM calls anywhere — Phase 2 output is traditional-rule evidence only,
explicitly not a final recommendation.

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
| `@gemstones-ai/rule-graph` | Functional benefic/malefic classification, candidate gemstone generation, conflict detection | **Rule-Graph MCP** + Traditional Rule Agent + Gemstone Conflict Agent |
| `@gemstones-ai/orchestrator` | Wires the above into one pipeline, Express HTTP API, audit trail | **GEMSTONES_AI ORCHESTRATOR** (partial) |
| `frontend/` | Birth-data intake form + deterministic report + gemstone shortlist display | "1. Input" / output report (partial) |

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
- **Rule-Graph candidate generation**: only two rules implemented so far
  (ascendant-lord strengthening, current-dasha benefic amplification) —
  both chosen specifically because they're near-universal across
  Parashari schools, not because they're exhaustive. A real
  recommendation needs more candidate sources (debilitation/combustion-
  based remediation, house-specific concern targeting from the
  Situation Understanding Agent, etc.) and, per the architecture's own
  rule, those additions should come from expert-curated Rule-Graph data
  in Phase 3, not be invented here.
- **Planetary friendship table**: covers only the 7 classical grahas
  (canonical Naisargika Maitri). Rahu/Ketu conflicts are deliberately
  limited to the one near-universally-cited caution (their simultaneous
  axis relationship) rather than a fuller invented friendship table —
  different schools genuinely disagree on nodal friendships beyond that
  one point.
- **No compound/dignity-based rules yet**: combustion, retrograde
  status, and exaltation/debilitation are calculated in the ephemeris
  layer but not yet factored into functional-nature classification or
  candidate generation — a currently-debilitated functional benefic, for
  instance, isn't yet down-weighted or flagged. Planned for Phase 3.

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

## Deployment (as actually deployed today)

- **Frontend** → Firebase Hosting, served from `Gemstones_AI/frontend/`
  under the shared `angshuman-ai-corp` Firebase project's `firebase.json`
  (see the `ignore` rules there — the backend monorepo source is
  deliberately excluded from the static hosting upload). Live at
  https://angshuman-ai-corp.web.app/gemstones, also linked from the
  `india3.html` "Bharat AI Hub" tile grid.
- **Orchestrator** → deployed to **Render** (free tier), not Cloud Run —
  the GCP project this Firebase site lives under is on the Spark (free)
  plan, and Cloud Run requires a billing account even for free-tier
  usage. Render's Docker-based free web services don't have that
  requirement. A `Dockerfile` + `.dockerignore` are included at the repo
  root for this; Render auto-deploys on every push to `main` on
  https://github.com/1angshumanbiswas-ops/gemstones-ai. Live at
  https://gemstones-ai.onrender.com — note the free tier spins down
  after ~15 minutes of inactivity, so the first request after a gap
  takes 30-60s (cold start).
- **Data** → not yet used; the orchestrator's `InMemoryAuditSink` is
  per-request only and nothing persists between calls. Firestore remains
  the planned destination for the audit trail and (later) GIA knowledge-
  base vector search once persistence is actually needed — see
  `packages/orchestrator/src/audit.ts`'s `AuditSink` interface, which a
  Firestore-backed implementation can drop into without changing the
  pipeline.
- **If moving to Cloud Run later** (e.g. once the project is upgraded to
  the Blaze plan): `gcloud run deploy gemstones-ai-orchestrator --source .
  --region asia-south1 --allow-unauthenticated --port 8080` from the repo
  root — the same `Dockerfile` works there unmodified.

## What's deliberately NOT here yet

Gemology data, certificate verification, consumer-protection filtering,
human review workflow (routing/UI — the *flagging* of high-impact stones
exists in Phase 2's conflict output), explanation generation, DPDP
consent UI/storage, and any LLM call. These are Phases 3–4 per the
architecture diagram and this project's own phased build plan.
