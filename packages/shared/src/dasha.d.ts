import type { PlanetName } from "./chart.js";
export interface DashaPeriod {
    lord: PlanetName;
    startDate: string;
    endDate: string;
    level: "mahadasha" | "antardasha" | "pratyantardasha";
    /** For antardasha/pratyantardasha, the enclosing period's lord chain */
    parentLords?: PlanetName[];
}
export interface DashaTimeline {
    /** Full Vimshottari sequence for this chart, mahadasha level */
    mahadashas: DashaPeriod[];
    /** The full lord chain (e.g. [Saturn, Mercury, Venus]) active on the
     *  reference date the timeline was computed for */
    currentPeriod: DashaPeriod[];
    referenceDate: string;
}
export interface SadeSatiStatus {
    isActive: boolean;
    /** 1, 2, or 3 — which of the three 2.5-year phases, or null if inactive */
    phase: 1 | 2 | 3 | null;
    phaseStartDate?: string;
    phaseEndDate?: string;
}
export interface TransitSnapshot {
    referenceDate: string;
    /** Current sidereal sign index (1-12) for the slow-movers the Rule
     *  Agent cares about most */
    saturnSignIndex: number;
    jupiterSignIndex: number;
    rahuSignIndex: number;
    ketuSignIndex: number;
    sadeSati: SadeSatiStatus;
}
