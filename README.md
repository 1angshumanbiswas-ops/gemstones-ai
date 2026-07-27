# Gemstones_AI — Phase 4 (in progress)

A transparent, expert-reviewed gemstone recommendation platform combining
traditional astrological guidance with scientific gemology, certification
verification, and consumer-purchase protection. Full architecture: see
the orchestrator/MCP diagram this repo implements incrementally.

**Deployed today**: https://angshuman-ai-corp.web.app/gemstones (frontend,
Firebase Hosting) calling https://gemstones-ai.onrender.com (orchestrator,
Render free tier).

**Phase 1**: deterministic birth-intelligence core. **Phase 2**: Rule-Graph
MCP (traditional candidates + conflict detection) + downloadable Word report.
**Phase 3**: Gemology Knowledge, Certificate Verification (format + deep
link, never fake-verifies), Consumer Protection (banned-phrase filter,
budget advisory).

**Phase 4 scope** (this repo, today — first slice, more to come): the
**Explanation Agent** — the only place in the entire pipeline an LLM is
allowed to run, and strictly to narrate data already computed by the
deterministic/rule-graph/gemology layers, never to generate or alter it.
Also adds Situation Understanding (the original spec's 6 concern
categories: Career/Finance/Health/Marriage/Litigation/Education) and
classical Navagraha remedy data (deity/mantra/donation/fasting day per
planet — settled traditional content, same category as the gemstone-planet
mapping, not LLM-invented). The Consumer Protection banned-phrase filter
from Phase 3 is now load-bearing for the first time: every LLM output
section is scanned and redacted before being shown.

**Still ahead for Phase 4**: North Indian square chart + Avakahada Chakra
table (requested but not yet built), Firebase Auth for astrologer accounts,
Razorpay subscription billing (real replacement for the interim access-code
gate below), a persistent Outcome Journal (needs Firestore — first real
database this project will have), and a Human Review dashboard.

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
| `@gemstones-ai/gemology` | Gemstone hardness/treatment/care data, certificate format check + Report Check deep links, banned-phrase filter, budget advisory, remedy data | **GIA Knowledge MCP** + **GIA Report MCP** + Gemology Knowledge Agent + Certificate Verification Agent + Consumer Protection Agent |
| `@gemstones-ai/explanation` | Explanation Agent — the only LLM call in the pipeline, strictly narrates already-computed data | **Explanation Agent** |
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
  transit-boundary search — not yet built).
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
- **Certificate verification never verifies**: `/api/certificate/check`
  validates report-number format and links to the issuing lab's own
  public Report Check page — it does not call any authenticated lab API
  and cannot confirm a certificate is real. This is intentional (the
  architecture explicitly rules out unauthorised scraping for the MVP),
  not a shortcut to fix later.
- **Budget-tier thresholds are rough**: `typicalBudgetTier` and the INR
  thresholds behind the budget advisory are qualitative judgment calls,
  not sourced market data — good enough to flag an obviously unrealistic
  budget, not precise enough to be quoted as a price estimate.
- **Consumer Protection banned-phrase filter has nothing to filter yet**:
  it's tested, working infrastructure with zero live callers, since
  Phase 3 has no free-text LLM output. It becomes load-bearing the
  moment Phase 4's Explanation Agent exists — every explanation must run
  through it before reaching a user.

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
- **Phase 4 requires two new Render environment variables** before
  `/api/explain` works at all: `ANTHROPIC_API_KEY` (your own key — this
  endpoint spends real money per call) and `ASTROLOGER_ACCESS_CODE` (a
  secret you choose and hand to test astrologers; the frontend sends it
  as the `x-access-code` header). Without both set, the endpoint returns
  503, not a crash — safe by default. **Do not share the access code
  publicly** — it's the only thing standing between the open internet and
  your Anthropic bill until Razorpay subscription billing replaces it.
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

North Indian square chart + Avakahada Chakra table (requested, queued for
a follow-up), Human Review dashboard (stones are *flagged*, still no real
reviewer workflow), Firebase Auth for astrologer accounts, Razorpay
subscription billing (Phase 4's Explanation Agent currently runs behind a
manual access-code gate as an interim safeguard), persistent Outcome
Journal (needs Firestore — first real database this project will have),
and DPDP consent UI/storage.
