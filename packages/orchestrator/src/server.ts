import express, { type Request, type Response } from "express";
import cors from "cors";
import type { BirthInput } from "@gemstones-ai/shared";
import { NominatimGeocodingProvider, type GeocodingProvider } from "@gemstones-ai/geo-timezone-mcp";
import { InMemoryAuditSink } from "./audit.js";
import { runPipeline, type PipelineResult } from "./pipeline.js";
import { buildReportDocx } from "./report-docx.js";
import { checkCertificate } from "@gemstones-ai/gemology";
import { generateExplanation } from "@gemstones-ai/explanation";
import type { ExplanationContext, SituationConcern } from "@gemstones-ai/shared";

const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export function createApp(geocoder: GeocodingProvider) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  // Cloud Run liveness/readiness probe.
  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ status: "ok", phase: 4 });
  });

  app.post("/api/chart", async (req: Request, res: Response) => {
    const body = req.body as Partial<BirthInput>;

    if (!body.dateOfBirth || !body.timeOfBirth || !body.placeOfBirth) {
      res.status(400).json({
        error: "dateOfBirth, timeOfBirth, and placeOfBirth are required",
      });
      return;
    }

    const input: BirthInput = {
      dateOfBirth: body.dateOfBirth,
      timeOfBirth: body.timeOfBirth,
      timeConfidence: body.timeConfidence ?? "exact",
      placeOfBirth: body.placeOfBirth,
      existingGemstones: body.existingGemstones,
      budgetINR: body.budgetINR,
      consent: body.consent ?? {
        givenAt: new Date().toISOString(),
        purposes: ["chart_calculation"],
      },
    };

    try {
      const auditSink = new InMemoryAuditSink();
      const result = await runPipeline(input, geocoder, auditSink);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(422).json({ error: message });
    }
  });

  // Formats an already-computed PipelineResult (as returned by
  // /api/chart) into a downloadable .docx report. Deliberately does
  // NOT recompute anything — the person downloads exactly what they
  // already saw on screen, not a fresh (and potentially slightly
  // different, since referenceDate defaults to "now") recalculation.
  app.post("/api/report/docx", async (req: Request, res: Response) => {
    try {
      const result = req.body as PipelineResult;
      if (!result?.natalChart || !result?.gemstoneShortlist) {
        res.status(400).json({ error: "Request body must be a full PipelineResult (the /api/chart response)." });
        return;
      }
      const buffer = await buildReportDocx(result);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Disposition", `attachment; filename="gemstones-ai-report-${result.requestId}.docx"`);
      res.send(buffer);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  // Certificate Verification Agent — deliberately does not verify
  // anything itself (per the architecture's explicit "linking, not
  // scraping" MVP guidance). Validates report-number format and hands
  // back a deep link to the issuing lab's own public check page.
  app.post("/api/certificate/check", (req: Request, res: Response) => {
    const { laboratory, reportNumber } = req.body as { laboratory?: string; reportNumber?: string };
    if (!laboratory || !reportNumber) {
      res.status(400).json({ error: "laboratory and reportNumber are required" });
      return;
    }
    const result = checkCertificate(laboratory, reportNumber);
    res.json(result);
  });

  // Explanation Agent — the only place in the pipeline an LLM is
  // allowed to run, and only to narrate data that's already been
  // deterministically computed (see the system prompt in
  // packages/explanation/src/prompt.ts). This calls Claude using
  // YOUR server-side ANTHROPIC_API_KEY, so it costs you real money
  // per call.
  //
  // INTERIM SAFEGUARD: gated behind ACCESS_CODE until real astrologer
  // accounts + Razorpay subscription billing exist (a later phase).
  // Do not remove this check without replacing it with real auth —
  // an open, unmetered LLM endpoint on a public URL is a genuine cost
  // risk, not a hypothetical one.
  app.post("/api/explain", async (req: Request, res: Response) => {
    const accessCode = req.header("x-access-code");
    const requiredCode = process.env.ASTROLOGER_ACCESS_CODE;
    if (!requiredCode) {
      res.status(503).json({ error: "Explanation Agent is not configured (ASTROLOGER_ACCESS_CODE not set on the server)." });
      return;
    }
    if (accessCode !== requiredCode) {
      res.status(401).json({ error: "Invalid or missing access code." });
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(503).json({ error: "Explanation Agent is not configured (ANTHROPIC_API_KEY not set on the server)." });
      return;
    }

    const { pipelineResult, concerns } = req.body as {
      pipelineResult?: PipelineResult;
      concerns?: SituationConcern[];
    };
    if (!pipelineResult?.natalChart || !concerns || concerns.length === 0) {
      res.status(400).json({ error: "pipelineResult (a full /api/chart response) and a non-empty concerns array are required." });
      return;
    }

    const moon = pipelineResult.natalChart.planets.find((p) => p.planet === "Moon");
    const context: ExplanationContext = {
      ascendantSignName: SIGN_NAMES[pipelineResult.natalChart.houses.ascendantSignIndex - 1],
      moonNakshatraName: moon?.nakshatra.name ?? "unknown",
      planets: pipelineResult.natalChart.planets,
      currentDashaPeriod: pipelineResult.dashaTimeline.currentPeriod,
      numerology: pipelineResult.numerology,
      enrichedCandidates: pipelineResult.enrichedCandidates,
      transitSnapshot: pipelineResult.transitSnapshot,
      concerns,
    };

    try {
      const result = await generateExplanation(context, { anthropicApiKey: apiKey }, pipelineResult.requestId);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(502).json({ error: `Explanation Agent failed: ${message}` });
    }
  });

  return app;
}

export function buildDefaultGeocoder(): GeocodingProvider {
  return new NominatimGeocodingProvider(
    process.env.GEOCODING_BASE_URL ?? "https://nominatim.openstreetmap.org",
    process.env.GEOCODING_USER_AGENT ??
      "gemstones-ai/0.1 (contact: set GEOCODING_USER_AGENT env var)",
    process.env.GEOCODING_API_KEY
  );
}
