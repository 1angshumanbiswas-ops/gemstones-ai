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

  const payload = {
    dateOfBirth: document.getElementById("dateOfBirth").value,
    timeOfBirth: document.getElementById("timeOfBirth").value,
    timeConfidence: document.getElementById("timeConfidence").value,
    placeOfBirth: document.getElementById("placeOfBirth").value,
    existingGemstones,
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
  renderPlanetTable(data.natalChart.planets);
  renderDasha(data.dashaTimeline);
  renderNumerology(data.numerology);
  renderTransits(data.transitSnapshot);
  renderGemstoneShortlist(data.gemstoneShortlist);

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
