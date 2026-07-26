/**
 * One row per orchestrator step. Every MCP call the orchestrator makes
 * is logged here — inputs, which server/version answered, and outputs —
 * so any recommendation can be traced back to exact calculation inputs
 * and rule versions later (mandatory protection, Section 12).
 */
export interface AuditEntry {
    requestId: string;
    timestamp: string;
    step: "geo_resolution" | "timezone_resolution" | "ephemeris_calculation" | "dasha_calculation" | "numerology_calculation" | "rule_evaluation" | "conflict_check" | "gemology_lookup" | "certificate_verification" | "human_review" | "explanation_generation";
    mcpServer?: string;
    mcpServerVersion?: string;
    inputSummary: Record<string, unknown>;
    outputSummary: Record<string, unknown>;
    /** Set when a rule-graph or knowledge version was consulted, so a
     *  recommendation can be reproduced against the exact rule set used */
    ruleSetVersion?: string;
}
