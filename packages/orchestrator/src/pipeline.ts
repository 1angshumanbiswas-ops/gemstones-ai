import { v4 as uuid } from "uuid";
import type {
  BirthInput,
  ConfidenceIndicators,
  NatalChart,
  ResolvedBirthContext,
  NumerologyProfile,
  DashaTimeline,
  TransitSnapshot,
  GemstoneShortlistResult,
  PlanetaryFunctionalNature,
} from "@gemstones-ai/shared";
import { buildNatalChart } from "@gemstones-ai/ephemeris-mcp";
import {
  resolveHistoricalTimezone,
  toUtcIso,
  type GeocodingProvider,
} from "@gemstones-ai/geo-timezone-mcp";
import { buildNumerologyProfile } from "@gemstones-ai/numerology";
import { buildDashaTimeline, buildTransitSnapshot } from "@gemstones-ai/dasha";
import { buildGemstoneShortlist } from "@gemstones-ai/rule-graph";
import type { AuditSink } from "./audit.js";

export interface PipelineResult {
  requestId: string;
  resolvedContext: ResolvedBirthContext;
  natalChart: NatalChart;
  numerology: NumerologyProfile;
  dashaTimeline: DashaTimeline;
  transitSnapshot: TransitSnapshot;
  functionalNatures: PlanetaryFunctionalNature[];
  gemstoneShortlist: GemstoneShortlistResult;
  confidence: ConfidenceIndicators;
  auditTrail: ReturnType<AuditSink["getEntries"]>;
}

const PLANET_NAME_FOR_SIGN = {
  Saturn: "Saturn",
  Jupiter: "Jupiter",
  Rahu: "Rahu",
  Ketu: "Ketu",
} as const;

function birthDataConfidenceFor(input: BirthInput): number {
  switch (input.timeConfidence) {
    case "exact":
      return 1.0;
    case "approximate":
      return 0.6;
    case "unknown":
      return 0.25;
  }
}

/**
 * Runs the full deterministic + rule-graph pipeline for one birth
 * input: place -> coordinates -> historical UTC instant -> natal
 * chart -> numerology -> dasha timeline -> today's transit snapshot
 * -> traditional gemstone candidate shortlist -> conflict check.
 * Every step is written to `auditSink` with enough input/output detail
 * to reproduce the calculation later (Section 12's audit-trail
 * requirement). Nothing here calls an LLM — deterministic chart math
 * and expert-approved rule-graph logic only; the explanation layer
 * (Phase 4) is the only place an LLM is allowed to enter the pipeline,
 * and even then only to explain this output, never to generate it.
 */
export async function runPipeline(
  input: BirthInput,
  geocoder: GeocodingProvider,
  auditSink: AuditSink,
  referenceDate: Date = new Date()
): Promise<PipelineResult> {
  const requestId = uuid();
  const now = () => new Date().toISOString();

  // Step 1: birthplace -> coordinates
  const coordinates = await geocoder.resolvePlace(input.placeOfBirth);
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "geo_resolution",
    mcpServer: "geo-timezone-mcp",
    inputSummary: { placeText: input.placeOfBirth },
    outputSummary: { ...coordinates },
  });

  // Step 2: coordinates + local civil time -> historical IANA offset + UTC instant
  const localDateTimeIso = `${input.dateOfBirth}T${input.timeOfBirth}:00`;
  const timezone = resolveHistoricalTimezone(
    coordinates.latitude,
    coordinates.longitude,
    localDateTimeIso
  );
  const utcDateTime = toUtcIso(localDateTimeIso, timezone.ianaZoneId);
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "timezone_resolution",
    mcpServer: "geo-timezone-mcp",
    inputSummary: { localDateTimeIso, latitude: coordinates.latitude, longitude: coordinates.longitude },
    outputSummary: { ...timezone, utcDateTime },
  });

  const resolvedContext: ResolvedBirthContext = { input, coordinates, timezone };

  // Step 3: natal chart from the resolved UTC instant + coordinates
  const natalChart = buildNatalChart({
    utcDateTime,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "ephemeris_calculation",
    mcpServer: "ephemeris-mcp",
    inputSummary: { utcDateTime, latitude: coordinates.latitude, longitude: coordinates.longitude },
    outputSummary: {
      ascendantSignIndex: natalChart.houses.ascendantSignIndex,
      moonSignIndex: natalChart.planets.find((p) => p.planet === "Moon")?.signIndex,
      calculationConfidence: natalChart.calculationConfidence,
    },
  });

  // Step 4: numerology (pure function of the calendar date, no MCP call needed)
  const numerology = buildNumerologyProfile(input.dateOfBirth, referenceDate);
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "numerology_calculation",
    inputSummary: { dateOfBirth: input.dateOfBirth, referenceDate: referenceDate.toISOString() },
    outputSummary: { ...numerology },
  });

  // Step 5: Vimshottari dasha timeline from the Moon's natal sidereal longitude
  const moon = natalChart.planets.find((p) => p.planet === "Moon")!;
  const birthDateForDasha = new Date(utcDateTime);
  const dashaTimeline = buildDashaTimeline(moon.siderealLongitude, birthDateForDasha, referenceDate);
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "dasha_calculation",
    inputSummary: { moonSiderealLongitude: moon.siderealLongitude, referenceDate: referenceDate.toISOString() },
    outputSummary: { currentPeriod: dashaTimeline.currentPeriod },
  });

  // Step 6: today's transiting slow-movers + Sade Sati, reusing the
  // same ephemeris math for "now" (planet longitudes don't depend on
  // observer location, only the ascendant/houses do).
  const transitChart = buildNatalChart({
    utcDateTime: referenceDate.toISOString(),
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
  });
  const findSign = (name: keyof typeof PLANET_NAME_FOR_SIGN) =>
    transitChart.planets.find((p) => p.planet === PLANET_NAME_FOR_SIGN[name])!.signIndex;

  const transitSnapshot = buildTransitSnapshot({
    referenceDate: referenceDate.toISOString().slice(0, 10),
    natalMoonSignIndex: moon.signIndex,
    saturnSignIndex: findSign("Saturn"),
    jupiterSignIndex: findSign("Jupiter"),
    rahuSignIndex: findSign("Rahu"),
    ketuSignIndex: findSign("Ketu"),
  });
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "ephemeris_calculation",
    mcpServer: "ephemeris-mcp",
    inputSummary: { utcDateTime: referenceDate.toISOString(), purpose: "current transit snapshot" },
    outputSummary: { ...transitSnapshot },
  });

  // Step 7: Rule-Graph — shortlist candidate gemstones from the
  // ascendant lord and current dasha lord (Traditional Rule Agent),
  // then run the Gemstone Conflict Agent against them. Traditional
  // evidence only — still no gemology/certification/consumer-
  // protection data, and still no LLM call anywhere in this step.
  const gemstoneShortlist = buildGemstoneShortlist({
    ascendantSignIndex: natalChart.houses.ascendantSignIndex,
    currentDashaPeriod: dashaTimeline.currentPeriod,
    existingGemstones: input.existingGemstones,
  });
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "rule_evaluation",
    mcpServer: "rule-graph-mcp",
    inputSummary: { ascendantSignIndex: natalChart.houses.ascendantSignIndex },
    outputSummary: { candidateCount: gemstoneShortlist.candidates.length },
  });
  auditSink.record({
    requestId,
    timestamp: now(),
    step: "conflict_check",
    mcpServer: "rule-graph-mcp",
    inputSummary: { existingGemstones: input.existingGemstones ?? [] },
    outputSummary: {
      conflictCount: gemstoneShortlist.conflicts.length,
      survivingCount: gemstoneShortlist.surviving.length,
    },
  });

  const confidence: ConfidenceIndicators = {
    birthDataConfidence: birthDataConfidenceFor(input),
    astronomicalCalculationConfidence:
      natalChart.calculationConfidence * (1 - (1 - coordinates.matchConfidence) * 0.3),
    // Not yet a numeric consensus score — Phase 2 only has one rule
    // source, so "consensus" isn't meaningful until Phase 3 adds more
    // traditions to compare against. Left undefined rather than
    // faked with a placeholder number.
  };

  return {
    requestId,
    resolvedContext,
    natalChart,
    numerology,
    dashaTimeline,
    transitSnapshot,
    functionalNatures: gemstoneShortlist.functionalNatures,
    gemstoneShortlist,
    confidence,
    auditTrail: auditSink.getEntries(),
  };
}
