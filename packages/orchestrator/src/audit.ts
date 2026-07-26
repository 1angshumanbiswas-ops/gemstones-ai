import type { AuditEntry } from "@gemstones-ai/shared";

/**
 * Records one AuditEntry per orchestrator step. Phase 1 keeps this
 * in-memory per-request (returned alongside the response) so the
 * audit trail is visible and testable without provisioning Firestore
 * first. Swapping in a persistent sink (Firestore, per the Systems &
 * Services "Audit & Logging" box in the architecture diagram) is a
 * drop-in: implement the same `record` method and hand it to
 * `runPipeline` instead of `InMemoryAuditSink`.
 */
export interface AuditSink {
  record(entry: AuditEntry): void;
  getEntries(): AuditEntry[];
}

export class InMemoryAuditSink implements AuditSink {
  private entries: AuditEntry[] = [];

  record(entry: AuditEntry): void {
    this.entries.push(entry);
  }

  getEntries(): AuditEntry[] {
    return [...this.entries];
  }
}
