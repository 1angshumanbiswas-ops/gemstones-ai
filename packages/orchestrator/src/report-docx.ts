import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { PipelineResult } from "./pipeline.js";

const PAGE_WIDTH_DXA = 12240; // US Letter
const PAGE_HEIGHT_DXA = 15840;
const MARGIN_DXA = 1080; // 0.75in
const TABLE_WIDTH_DXA = PAGE_WIDTH_DXA - MARGIN_DXA * 2;

const GOLD = "9C7A1E"; // darker than the on-screen gold, for print legibility
const CYAN_DARK = "2E7D8A";
const RISK_RED = "B24545";
const MUTED = "555555";

function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  return new Paragraph({ text, heading: level, spacing: { before: 280, after: 120 } });
}

function bodyText(text: string, opts: { color?: string; bold?: boolean; italics?: boolean } = {}): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, color: opts.color, bold: opts.bold, italics: opts.italics })],
    spacing: { after: 100 },
  });
}

function cell(text: string, widthDxa: number, opts: { header?: boolean; color?: string } = {}): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: opts.header ? { type: ShadingType.CLEAR, fill: "EDEDED" } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.header, color: opts.color, size: 20 })],
      }),
    ],
  });
}

function table(headerRow: string[], rows: string[][], columnWidths: number[]): Table {
  return new Table({
    width: { size: TABLE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({
        children: headerRow.map((h, i) => cell(h, columnWidths[i], { header: true })),
      }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.map((v, i) => cell(v, columnWidths[i])),
          })
      ),
    ],
  });
}

/**
 * Builds a downloadable .docx report from an already-computed
 * PipelineResult — this formats existing output, it does not
 * recompute anything, so the document always matches exactly what
 * the person saw on screen.
 */
export async function buildReportDocx(result: PipelineResult): Promise<Buffer> {
  const { resolvedContext, natalChart, dashaTimeline, numerology, transitSnapshot, gemstoneShortlist, confidence, requestId } = result;
  const moon = natalChart.planets.find((p) => p.planet === "Moon")!;
  const ascSignNames = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];
  const ascName = ascSignNames[natalChart.houses.ascendantSignIndex - 1];

  const children: (Paragraph | Table)[] = [];

  // --- Title ---
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "Gemstones_AI", bold: true, size: 40, color: GOLD })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "Birth Intelligence + Traditional Rule Engine + Gemology — Phase 3 Report",
          size: 22,
          color: MUTED,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [
        new TextRun({
          text: `Request ${requestId} · Generated ${new Date().toISOString()}`,
          size: 16,
          color: MUTED,
          italics: true,
        }),
      ],
    })
  );

  // --- Birth details ---
  children.push(heading("Birth Details", HeadingLevel.HEADING_1));
  children.push(
    bodyText(
      `${resolvedContext.input.dateOfBirth} at ${resolvedContext.input.timeOfBirth} (${resolvedContext.input.timeConfidence})`
    ),
    bodyText(`Place: ${resolvedContext.coordinates.resolvedPlaceName}`),
    bodyText(
      `Timezone: ${resolvedContext.timezone.ianaZoneId}${
        resolvedContext.timezone.isHistoricalRule ? " (historical offset rule applied)" : ""
      }`
    )
  );

  // --- Confidence indicators ---
  children.push(heading("Confidence Indicators", HeadingLevel.HEADING_1));
  children.push(
    bodyText(
      "Shown separately by design — never blended into one score. See the disclaimer at the end of this report.",
      { italics: true, color: MUTED }
    )
  );
  children.push(
    table(
      ["Indicator", "Value"],
      [
        ["Birth-data confidence", `${Math.round(confidence.birthDataConfidence * 100)}%`],
        ["Astronomical calculation confidence", `${Math.round(confidence.astronomicalCalculationConfidence * 100)}%`],
      ],
      [TABLE_WIDTH_DXA * 0.7, TABLE_WIDTH_DXA * 0.3]
    )
  );

  // --- Chart summary ---
  children.push(heading("Natal Chart Summary", HeadingLevel.HEADING_1));
  children.push(
    bodyText(`Ascendant: ${ascName}`, { bold: true }),
    bodyText(`Moon nakshatra: ${moon.nakshatra.name} (pada ${moon.nakshatra.pada})`)
  );
  children.push(
    table(
      ["Graha", "Sign", "Deg", "Nakshatra", "Pada", "Notes"],
      natalChart.planets.map((p) => [
        p.planet,
        ascSignNames[p.signIndex - 1],
        `${p.degreesInSign.toFixed(2)}°`,
        p.nakshatra.name,
        String(p.nakshatra.pada),
        [p.isRetrograde ? "retrograde" : "", p.isCombust ? "combust" : ""].filter(Boolean).join(", "),
      ]),
      [
        TABLE_WIDTH_DXA * 0.15,
        TABLE_WIDTH_DXA * 0.15,
        TABLE_WIDTH_DXA * 0.12,
        TABLE_WIDTH_DXA * 0.2,
        TABLE_WIDTH_DXA * 0.1,
        TABLE_WIDTH_DXA * 0.28,
      ]
    )
  );

  // --- Dasha ---
  children.push(heading("Vimshottari Dasha", HeadingLevel.HEADING_1));
  children.push(
    bodyText(
      `Current period: ${dashaTimeline.currentPeriod.map((p) => `${p.level} = ${p.lord}`).join(", ")}`,
      { bold: true }
    )
  );
  children.push(
    table(
      ["Lord", "Start", "End"],
      dashaTimeline.mahadashas.map((p) => [p.lord, p.startDate, p.endDate]),
      [TABLE_WIDTH_DXA * 0.34, TABLE_WIDTH_DXA * 0.33, TABLE_WIDTH_DXA * 0.33]
    )
  );

  // --- Numerology ---
  children.push(heading("Numerology", HeadingLevel.HEADING_1));
  children.push(
    table(
      ["Mulank", "Bhagyank", "Personal Year", "Personal Month"],
      [[String(numerology.mulank), String(numerology.bhagyank), String(numerology.personalYear), String(numerology.personalMonth)]],
      [TABLE_WIDTH_DXA * 0.25, TABLE_WIDTH_DXA * 0.25, TABLE_WIDTH_DXA * 0.25, TABLE_WIDTH_DXA * 0.25]
    )
  );

  // --- Transits ---
  children.push(heading("Current Transits", HeadingLevel.HEADING_1));
  children.push(
    bodyText(`Saturn: ${ascSignNames[transitSnapshot.saturnSignIndex - 1]}`),
    bodyText(`Jupiter: ${ascSignNames[transitSnapshot.jupiterSignIndex - 1]}`),
    bodyText(
      `Sade Sati: ${transitSnapshot.sadeSati.isActive ? `active, phase ${transitSnapshot.sadeSati.phase} of 3` : "not active"}`
    )
  );

  // --- Gemstone shortlist ---
  children.push(heading("Traditional Gemstone Shortlist", HeadingLevel.HEADING_1));
  children.push(
    bodyText(
      "Rule-graph evidence only — not gemologically or scientifically verified, and not a final recommendation. " +
        "Generated from two near-universal Parashari principles (ascendant-lord strengthening, current-dasha " +
        "benefic amplification), then filtered by the Gemstone Conflict Agent.",
      { italics: true, color: MUTED }
    )
  );

  if (gemstoneShortlist.surviving.length === 0) {
    children.push(bodyText("No traditional candidates survived the conflict check for this chart.", { italics: true }));
  } else {
    children.push(
      table(
        ["Gemstone", "For Planet", "Rule Basis", "Risk"],
        gemstoneShortlist.surviving.map((c) => [
          c.gemstone,
          c.forPlanet,
          c.ruleDescription,
          c.riskClassification.replace(/_/g, " "),
        ]),
        [TABLE_WIDTH_DXA * 0.18, TABLE_WIDTH_DXA * 0.14, TABLE_WIDTH_DXA * 0.48, TABLE_WIDTH_DXA * 0.2]
      )
    );
  }

  if (gemstoneShortlist.conflicts.length > 0) {
    children.push(heading("Conflict & Caution Notes", HeadingLevel.HEADING_2));
    for (const c of gemstoneShortlist.conflicts) {
      children.push(
        bodyText(`[${c.severity.toUpperCase()}] ${c.candidateGemstone}: ${c.reason}`, {
          color: c.severity === "excluded" ? RISK_RED : CYAN_DARK,
        })
      );
    }
  }

  // --- Gemological properties (separate evidence layer) ---
  if (result.enrichedCandidates.length > 0) {
    children.push(heading("Gemological Properties", HeadingLevel.HEADING_1));
    children.push(
      bodyText(
        "A separate evidence layer from the traditional shortlist above — physical mineralogical fact, not " +
          "astrological interpretation. Nothing here confirms or is confirmed by the traditional evidence.",
        { italics: true, color: MUTED }
      )
    );
    children.push(
      table(
        ["Gemstone", "Species", "Hardness", "Common treatments", "Care"],
        result.enrichedCandidates.map((ec) => [
          ec.gemology.gemstone,
          ec.gemology.mineralSpecies,
          `Mohs ${ec.gemology.mohsHardness}`,
          ec.gemology.commonTreatments.join("; "),
          ec.gemology.careInstructions,
        ]),
        [
          TABLE_WIDTH_DXA * 0.14,
          TABLE_WIDTH_DXA * 0.18,
          TABLE_WIDTH_DXA * 0.1,
          TABLE_WIDTH_DXA * 0.3,
          TABLE_WIDTH_DXA * 0.28,
        ]
      )
    );

    const advisories = result.enrichedCandidates.filter((ec) => ec.budgetAdvisory && ec.budgetAdvisory.riskLevel !== "none");
    if (advisories.length > 0) {
      children.push(heading("Budget Advisory", HeadingLevel.HEADING_2));
      for (const ec of advisories) {
        children.push(
          bodyText(`[${ec.budgetAdvisory!.riskLevel.toUpperCase().replace(/_/g, " ")}] ${ec.budgetAdvisory!.message}`, {
            color: ec.budgetAdvisory!.riskLevel === "high_risk" ? RISK_RED : CYAN_DARK,
          })
        );
      }
    }
  }

  // --- Disclaimer ---
  children.push(heading("Disclaimer", HeadingLevel.HEADING_1));
  children.push(
    bodyText(
      "This report reflects deterministic astronomical calculation, traditional (Parashari) rule-graph " +
        "evidence, and general gemological reference data — three separate evidence layers, none of which " +
        "proves the others. It has not been reviewed by a qualified astrologer or gemologist, includes no " +
        "laboratory certificate verification, and is not a purchase recommendation. Stones marked " +
        "\"expert review required\" must go through qualified human review before anyone acts " +
        "on them. No guarantee of employment, health, legal, or financial outcomes is implied by anything in " +
        "this report.",
      { bold: true }
    )
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH_DXA, height: PAGE_HEIGHT_DXA },
            margin: { top: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA, right: MARGIN_DXA },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
