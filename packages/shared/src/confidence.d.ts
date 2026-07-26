/**
 * Section 11: "Do not display a misleading single '92% accurate' score."
 * Each dimension is scored and shown independently. Phase 1 only
 * populates the first two; the rest are wired up as later phases add
 * the rule engine, gemology, and certificate layers, but the shape is
 * defined here up front so no later phase has to reshape the report.
 */
export interface ConfidenceIndicators {
    /** Was the birth time/place exact, approximate, or unknown? */
    birthDataConfidence: number;
    /** Ephemeris/geocoding/timezone-resolution precision */
    astronomicalCalculationConfidence: number;
    /** Phase 2: agreement across traditional rule sources consulted */
    traditionalRuleConsensus?: number;
    /** Phase 3: strength of the lab report match */
    laboratoryReportConfidence?: number;
    /** Phase 3: how completely treatments/synthetics were disclosed */
    treatmentDisclosureCompleteness?: number;
    /** Phase 4: Consumer Protection Agent's assessed purchase risk,
     *  inverted so higher = safer, kept separate from the others */
    purchaseRiskScore?: number;
}
