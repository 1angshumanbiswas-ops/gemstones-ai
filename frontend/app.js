const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];
const SIGN_GLYPHS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const PLANET_GLYPHS = {
  Sun: "☉", Moon: "☾", Mars: "♂", Mercury: "☿", Jupiter: "♃",
  Venus: "♀", Saturn: "♄", Rahu: "☊", Ketu: "☋",
};

const form = document.getElementById("birth-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
let lastResult = null;

form.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  statusEl.textContent = "Calculating…";
  statusEl.classList.remove("error");

  const apiBase = document.getElementById("apiBase").value.replace(/\/$/, "");
  const existingGemstones = Array.from(
    document.getElementById("existingGemstones").selectedOptions
  ).map((opt) => opt.value);
  const budgetRaw = document.getElementById("budgetINR").value;
  const budgetINR = budgetRaw ? Number(budgetRaw) : undefined;

  const payload = {
    dateOfBirth: document.getElementById("dateOfBirth").value,
    timeOfBirth: document.getElementById("timeOfBirth").value,
    timeConfidence: document.getElementById("timeConfidence").value,
    placeOfBirth: document.getElementById("placeOfBirth").value,
    existingGemstones,
    budgetINR,
    consent: {
      givenAt: new Date().toISOString(),
      purposes: ["chart_calculation"],
    },
  };

  try {
    const res = await fetch(`${apiBase}/api/chart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

    renderResult(data);
    statusEl.textContent = "Done.";
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.classList.add("error");
    resultsEl.hidden = true;
  } finally {
    submitBtn.disabled = false;
  }
});

function renderResult(data) {
  resultsEl.hidden = false;
  lastResult = data;

  document.getElementById("conf-astro").textContent =
    Math.round(data.confidence.astronomicalCalculationConfidence * 100) + "%";
  document.getElementById("conf-birth").textContent =
    Math.round(data.confidence.birthDataConfidence * 100) + "%";

  const moon = data.natalChart.planets.find((p) => p.planet === "Moon");
  document.getElementById("asc-sign").textContent =
    SIGN_NAMES[data.natalChart.houses.ascendantSignIndex - 1];
  document.getElementById("moon-nakshatra").textContent =
    `${moon.nakshatra.name} (pada ${moon.nakshatra.pada})`;

  renderWheel(data.natalChart);
  renderNorthIndianChart(data.natalChart);
  renderAvakahadaChakra(data.natalChart, data.numerology);
  renderPlanetTable(data.natalChart.planets);
  renderDasha(data.dashaTimeline);
  renderNumerology(data.numerology);
  renderTransits(data.transitSnapshot);
  renderGemstoneShortlist(data.gemstoneShortlist);
  renderGemologyCards(data.enrichedCandidates);

  document.getElementById("audit-count").textContent = data.auditTrail.length;
  document.getElementById("audit-json").textContent = JSON.stringify(data.auditTrail, null, 2);
}

function renderPlanetTable(planets) {
  const tbody = document.querySelector("#planet-table tbody");
  tbody.innerHTML = "";
  for (const p of planets) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${PLANET_GLYPHS[p.planet] || ""} ${p.planet}</td>
      <td>${SIGN_NAMES[p.signIndex - 1]}</td>
      <td class="mono">${p.degreesInSign.toFixed(2)}°</td>
      <td>${p.nakshatra.name}</td>
      <td class="mono">${p.nakshatra.pada}</td>
      <td>${p.isRetrograde ? '<span class="retro-flag">℞ retro</span>' : ""}${p.isCombust ? ' <span class="combust-flag">combust</span>' : ""}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderDasha(timeline) {
  const chainEl = document.getElementById("current-dasha");
  chainEl.innerHTML = timeline.currentPeriod
    .map((p) => `<span class="dasha-pill">${p.level === "mahadasha" ? "Mahā" : "Antar"}: ${p.lord}</span>`)
    .join("");

  const tbody = document.querySelector("#dasha-table tbody");
  tbody.innerHTML = "";
  for (const p of timeline.mahadashas) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${p.lord}</td><td class="mono">${p.startDate}</td><td class="mono">${p.endDate}</td>`;
    tbody.appendChild(tr);
  }
}

function renderNumerology(profile) {
  const el = document.getElementById("numerology-cards");
  const cards = [
    ["Mulank", profile.mulank],
    ["Bhagyank", profile.bhagyank],
    ["Personal year", profile.personalYear],
    ["Personal month", profile.personalMonth],
  ];
  el.innerHTML = cards
    .map(([label, value]) => `<div class="num-card"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join("");
}

function renderTransits(snapshot) {
  const el = document.getElementById("transit-summary");
  const sadeSatiText = snapshot.sadeSati.isActive
    ? `Active — phase ${snapshot.sadeSati.phase} of 3`
    : "Not active";
  el.innerHTML = `
    <div class="numerology-cards">
      <div class="num-card"><div class="label">Saturn</div><div class="value">${SIGN_NAMES[snapshot.saturnSignIndex - 1]}</div></div>
      <div class="num-card"><div class="label">Jupiter</div><div class="value">${SIGN_NAMES[snapshot.jupiterSignIndex - 1]}</div></div>
    </div>
    <p style="margin-top:0.75rem; font-size:0.85rem;"><strong>Sade Sati:</strong> ${sadeSatiText}</p>
  `;
}

function renderGemstoneShortlist(shortlist) {
  const cardsEl = document.getElementById("candidate-cards");
  const conflictsEl = document.getElementById("conflict-list");

  if (shortlist.surviving.length === 0) {
    cardsEl.innerHTML = '<p class="no-candidates">No traditional candidates survived the conflict check for this chart.</p>';
  } else {
    cardsEl.innerHTML = shortlist.surviving
      .map(
        (c) => `
        <div class="candidate-card risk-${c.riskClassification}">
          <p class="gem-name">${c.gemstone}</p>
          <p class="gem-planet">for ${c.forPlanet}</p>
          <p class="gem-rule">${c.ruleDescription}</p>
          <span class="risk-badge">${c.riskClassification.replace(/_/g, " ")}</span>
        </div>
      `
      )
      .join("");
  }

  if (shortlist.conflicts.length === 0) {
    conflictsEl.innerHTML = "";
  } else {
    conflictsEl.innerHTML = shortlist.conflicts
      .map(
        (c) => `
        <div class="conflict-item severity-${c.severity}">
          <span class="conflict-severity">${c.severity}</span>${c.reason}
        </div>
      `
      )
      .join("");
  }
}

function renderGemologyCards(enrichedCandidates) {
  const el = document.getElementById("gemology-cards");
  if (!enrichedCandidates || enrichedCandidates.length === 0) {
    el.innerHTML = '<p class="no-candidates">No surviving candidates to show gemological properties for.</p>';
    return;
  }
  el.innerHTML = enrichedCandidates
    .map(({ gemology, budgetAdvisory }) => `
      <div class="gemology-card">
        <p class="gem-name">${gemology.gemstone}</p>
        <dl>
          <dt>Species</dt><dd>${gemology.mineralSpecies}</dd>
          <dt>Hardness</dt><dd>Mohs ${gemology.mohsHardness}</dd>
          <dt>Treatments</dt><dd>${gemology.commonTreatments.join("; ")}</dd>
          <dt>Durability</dt><dd>${gemology.durabilityNote}</dd>
          <dt>Care</dt><dd>${gemology.careInstructions}</dd>
        </dl>
        ${budgetAdvisory && budgetAdvisory.riskLevel !== "none"
          ? `<div class="budget-advisory risk-${budgetAdvisory.riskLevel}">${budgetAdvisory.message}</div>`
          : ""}
      </div>
    `)
    .join("");
}

// --- Avakahada Chakra reference tables (classical, index 0 = nakshatra/sign 1) ---
const NADI_BY_NAKSHATRA = [
  "Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya","Antya",
  "Antya","Madhya","Adi","Adi","Madhya","Antya","Antya","Madhya","Adi",
  "Adi","Madhya","Antya","Antya","Madhya","Adi","Adi","Madhya","Antya",
];
const YONI_BY_NAKSHATRA = [
  "Horse","Elephant","Sheep","Serpent","Serpent","Dog","Cat","Sheep","Cat",
  "Rat","Rat","Cow","Buffalo","Tiger","Buffalo","Tiger","Deer","Deer",
  "Dog","Monkey","Mongoose","Monkey","Lion","Horse","Lion","Cow","Elephant",
];
const GANA_BY_NAKSHATRA = [
  "Deva","Manushya","Rakshasa","Manushya","Deva","Manushya","Deva","Deva","Rakshasa",
  "Rakshasa","Manushya","Manushya","Manushya","Rakshasa","Deva","Rakshasa","Deva","Rakshasa",
  "Rakshasa","Manushya","Manushya","Deva","Rakshasa","Manushya","Manushya","Deva","Deva",
];
const VARNA_BY_SIGN = ["Kshatriya","Vaishya","Shudra","Brahmin","Kshatriya","Vaishya","Shudra","Brahmin","Kshatriya","Vaishya","Shudra","Brahmin"];
const VASHYA_BY_SIGN = ["Chatushpada","Chatushpada","Manava","Jalachara","Vanachara","Manava","Manava","Keeta","Chatushpada","Chatushpada","Manava","Jalachara"];
const ELEMENT_BY_SIGN = ["Fire (Agni)","Earth (Prithvi)","Air (Vayu)","Water (Jala)","Fire (Agni)","Earth (Prithvi)","Air (Vayu)","Water (Jala)","Fire (Agni)","Earth (Prithvi)","Air (Vayu)","Water (Jala)"];

function renderWheel(chart) {
  const svg = document.getElementById("chart-wheel");
  const cx = 240, cy = 240;
  const outerR = 220, signR = 190, planetR = 150, innerR = 120;

  const parts = [];

  // 12 sign wedges
  for (let i = 0; i < 12; i++) {
    const a0 = (i * 30 - 90) * (Math.PI / 180);
    const a1 = ((i + 1) * 30 - 90) * (Math.PI / 180);
    const isAsc = i + 1 === chart.houses.ascendantSignIndex;
    parts.push(`
      <path d="M ${cx} ${cy} L ${cx + outerR * Math.cos(a0)} ${cy + outerR * Math.sin(a0)}
                A ${outerR} ${outerR} 0 0 1 ${cx + outerR * Math.cos(a1)} ${cy + outerR * Math.sin(a1)} Z"
            fill="${isAsc ? "rgba(201,162,39,0.10)" : "transparent"}"
            stroke="rgba(232,227,216,0.14)" stroke-width="1" />
    `);
    const midA = (a0 + a1) / 2;
    const labelX = cx + signR * Math.cos(midA);
    const labelY = cy + signR * Math.sin(midA);
    parts.push(`<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle"
                  fill="#c9a227" font-size="18" font-family="serif">${SIGN_GLYPHS[i]}</text>`);
  }

  // inner circle
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${innerR}" fill="none" stroke="rgba(87,199,212,0.35)" stroke-width="1" />`);

  // planet markers by sidereal longitude
  for (const p of chart.planets) {
    const angle = (p.siderealLongitude - 90) * (Math.PI / 180);
    const x = cx + planetR * Math.cos(angle);
    const y = cy + planetR * Math.sin(angle);
    parts.push(`
      <g>
        <circle cx="${x}" cy="${y}" r="14" fill="#171e2b" stroke="#57c7d4" stroke-width="1.5" />
        <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
              fill="#57c7d4" font-size="13" font-family="serif">${PLANET_GLYPHS[p.planet]}</text>
      </g>
    `);
  }

  // ascendant marker line
  const ascAngle = (chart.houses.ascendantSiderealLongitude - 90) * (Math.PI / 180);
  parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx + outerR * Math.cos(ascAngle)}" y2="${cy + outerR * Math.sin(ascAngle)}"
                stroke="#c9a227" stroke-width="2" stroke-dasharray="4 3" />`);

  svg.innerHTML = parts.join("");
}

const downloadBtn = document.getElementById("download-docx");
const downloadStatusEl = document.getElementById("download-status");

downloadBtn.addEventListener("click", async () => {
  if (!lastResult) return;
  downloadBtn.disabled = true;
  downloadStatusEl.textContent = "Generating…";
  downloadStatusEl.classList.remove("error");

  const apiBase = document.getElementById("apiBase").value.replace(/\/$/, "");

  try {
    const res = await fetch(`${apiBase}/api/report/docx`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lastResult),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Request failed (${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gemstones-ai-report-${lastResult.requestId}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    downloadStatusEl.textContent = "Downloaded.";
  } catch (err) {
    downloadStatusEl.textContent = err.message;
    downloadStatusEl.classList.add("error");
  } finally {
    downloadBtn.disabled = false;
  }
});

const certCheckBtn = document.getElementById("cert-check-btn");
const certResultEl = document.getElementById("cert-result");

certCheckBtn.addEventListener("click", async () => {
  const laboratory = document.getElementById("cert-lab").value;
  const reportNumber = document.getElementById("cert-report-number").value.trim();
  if (!reportNumber) {
    certResultEl.textContent = "Enter a report number first.";
    certResultEl.classList.add("invalid");
    return;
  }

  const apiBase = document.getElementById("apiBase").value.replace(/\/$/, "");
  certResultEl.textContent = "Checking format…";
  certResultEl.classList.remove("invalid");

  try {
    const res = await fetch(`${apiBase}/api/certificate/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laboratory, reportNumber }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");

    if (data.status === "format_invalid") {
      certResultEl.textContent = data.guidance;
      certResultEl.classList.add("invalid");
    } else {
      certResultEl.classList.remove("invalid");
      certResultEl.innerHTML = data.reportCheckUrl
        ? `${data.guidance} <a href="${data.reportCheckUrl}" target="_blank" rel="noopener">Open ${data.laboratory} Report Check ↗</a>`
        : data.guidance;
    }
  } catch (err) {
    certResultEl.textContent = err.message;
    certResultEl.classList.add("invalid");
  }
});

const getExplanationBtn = document.getElementById("get-explanation-btn");
const explanationStatusEl = document.getElementById("explanation-status");
const explanationSectionsEl = document.getElementById("explanation-sections");
const remedyCardsEl = document.getElementById("remedy-cards");

const CONCERN_LABELS = {
  career: "Career", finance: "Finance", health: "Health",
  marriage: "Marriage", litigation: "Litigation", education: "Education",
};

getExplanationBtn.addEventListener("click", async () => {
  if (!lastResult) {
    explanationStatusEl.textContent = "Calculate a chart first.";
    explanationStatusEl.classList.add("error");
    return;
  }

  const concerns = Array.from(document.querySelectorAll(".concern-box:checked")).map((el) => el.value);
  if (concerns.length === 0) {
    explanationStatusEl.textContent = "Select at least one area above first.";
    explanationStatusEl.classList.add("error");
    return;
  }

  const accessCode = document.getElementById("accessCode").value;
  const apiBase = document.getElementById("apiBase").value.replace(/\/$/, "");

  getExplanationBtn.disabled = true;
  explanationStatusEl.textContent = "Generating explanation…";
  explanationStatusEl.classList.remove("error");
  explanationSectionsEl.innerHTML = "";
  remedyCardsEl.innerHTML = "";

  try {
    const res = await fetch(`${apiBase}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-access-code": accessCode },
      body: JSON.stringify({ pipelineResult: lastResult, concerns }),
    });
    const data = await res.json();
    if (!res.ok) {
      const detail = [data.errorName, data.errorCause].filter(Boolean).join(": ");
      throw new Error((data.error || `Request failed (${res.status})`) + (detail ? ` [${detail}]` : ""));
    }

    explanationSectionsEl.innerHTML = data.sections
      .map(
        (s) => `
        <div class="explanation-card">
          <p class="concern-label">${CONCERN_LABELS[s.concern] || s.concern}</p>
          <p>${s.text}</p>
        </div>
      `
      )
      .join("");

    remedyCardsEl.innerHTML = data.remedies
      .map(
        ({ forGemstone, remedy }) => `
        <div class="gemology-card">
          <p class="gem-name">${forGemstone} — ${remedy.planet} remedy</p>
          <dl>
            <dt>Deity</dt><dd>${remedy.deity}</dd>
            <dt>Mantra</dt><dd>${remedy.mantra}</dd>
            <dt>Fasting day</dt><dd>${remedy.fastingDay}</dd>
            <dt>Donations</dt><dd>${remedy.donationItems.join(", ")}</dd>
          </dl>
        </div>
      `
      )
      .join("");

    if (data.flaggedAndRedacted && data.flaggedAndRedacted.length > 0) {
      explanationSectionsEl.innerHTML += `<p class="explanation-redaction-notice">Note: ${data.flaggedAndRedacted.length} phrase(s) were caught and redacted by the Consumer Protection Agent before display.</p>`;
    }

    explanationStatusEl.textContent = "Done.";
  } catch (err) {
    explanationStatusEl.textContent = err.message;
    explanationStatusEl.classList.add("error");
  } finally {
    getExplanationBtn.disabled = false;
  }
});

// --- North Indian square Lagna chart (fixed-house style: house 1 is
// always the top kite; houses proceed clockwise; the SIGN in each
// house varies by ascendant, using the same whole-sign houseSignIndex
// data already computed server-side for the circular wheel). ---
const NORTH_INDIAN_HOUSE_POLYGONS = [
  [[200, 0], [300, 100], [200, 200], [100, 100]],   // House 1 (kite, top)
  [[200, 0], [400, 0], [300, 100]],                  // House 2
  [[400, 0], [400, 200], [300, 100]],                // House 3
  [[400, 200], [300, 300], [200, 200], [300, 100]],  // House 4 (kite, right)
  [[400, 200], [400, 400], [300, 300]],               // House 5
  [[400, 400], [200, 400], [300, 300]],               // House 6
  [[200, 400], [100, 300], [200, 200], [300, 300]],  // House 7 (kite, bottom)
  [[200, 400], [0, 400], [100, 300]],                 // House 8
  [[0, 400], [0, 200], [100, 300]],                   // House 9
  [[0, 200], [100, 100], [200, 200], [100, 300]],    // House 10 (kite, left)
  [[0, 200], [0, 0], [100, 100]],                     // House 11
  [[0, 0], [200, 0], [100, 100]],                     // House 12
];
const NORTH_INDIAN_HOUSE_LABEL_POS = [
  [200, 90], [300, 33], [366, 100], [300, 200], [366, 300], [300, 366],
  [200, 300], [100, 366], [33, 300], [100, 200], [33, 100], [100, 33],
];

function renderNorthIndianChart(chart) {
  const svg = document.getElementById("north-indian-chart");
  const parts = [];

  // Outer square + both diagonals + inner diamond (the classical construction)
  parts.push(`<rect x="0" y="0" width="400" height="400" fill="none" stroke="rgba(232,227,216,0.25)" stroke-width="1.5" />`);
  parts.push(`<line x1="0" y1="0" x2="400" y2="400" stroke="rgba(232,227,216,0.25)" stroke-width="1.5" />`);
  parts.push(`<line x1="400" y1="0" x2="0" y2="400" stroke="rgba(232,227,216,0.25)" stroke-width="1.5" />`);
  parts.push(`<polygon points="200,0 400,200 200,400 0,200" fill="none" stroke="rgba(232,227,216,0.25)" stroke-width="1.5" />`);

  // Sign number in each house (whole-sign: house N holds houseSignIndex[N])
  for (let house = 1; house <= 12; house++) {
    const signIndex = chart.houses.houseSignIndex[house];
    const [lx, ly] = NORTH_INDIAN_HOUSE_LABEL_POS[house - 1];
    parts.push(`<text x="${lx}" y="${ly - 14}" text-anchor="middle" fill="#c9a227" font-size="13" font-family="monospace">${signIndex}</text>`);

    const planetsHere = chart.planets.filter((p) => p.signIndex === signIndex);
    planetsHere.forEach((p, i) => {
      const abbr = p.planet.slice(0, 2);
      parts.push(
        `<text x="${lx}" y="${ly + i * 15}" text-anchor="middle" fill="#57c7d4" font-size="12" font-family="monospace">${abbr}${p.isRetrograde ? "℞" : ""}</text>`
      );
    });
  }

  svg.innerHTML = parts.join("");
}

function renderAvakahadaChakra(chart, numerology) {
  const moon = chart.planets.find((p) => p.planet === "Moon");
  const nakIdx = moon.nakshatra.index - 1; // 0-based
  const signIdx = moon.signIndex - 1; // 0-based

  const rows = [
    ["Nakshatra", moon.nakshatra.name],
    ["Nadi", NADI_BY_NAKSHATRA[nakIdx]],
    ["Yoni", YONI_BY_NAKSHATRA[nakIdx]],
    ["Gana", GANA_BY_NAKSHATRA[nakIdx]],
    ["Moon sign", SIGN_NAMES[signIdx]],
    ["Varna", VARNA_BY_SIGN[signIdx]],
    ["Vashya", VASHYA_BY_SIGN[signIdx]],
    ["Yunja", NADI_BY_NAKSHATRA[nakIdx]],
    ["Element (Tattva)", ELEMENT_BY_SIGN[signIdx]],
  ];

  const tbody = document.querySelector("#avakahada-table tbody");
  tbody.innerHTML = rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("");
}
