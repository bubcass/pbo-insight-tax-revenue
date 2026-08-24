export function storyBuilderControls({
  state = {
    lens: "Tax base composition",
    year: null,
    geography: "National"
  },
  metadata = null,
  onChange = () => {}
} = {}) {
  const container = document.createElement("div");
  container.className = "pq-controls";

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function render() {
    const years = metadata
      ? [
          metadata.years.min_taxhead_year,
          Math.round((metadata.years.min_taxhead_year + metadata.years.max_taxhead_year) / 2),
          metadata.years.max_taxhead_year
        ]
      : [];

    if (!state.year && years.length) state.year = years.at(-1);

    const lenses = [
      "Tax base composition",
      "Sector concentration",
      "County distribution",
      "Revenue dependence"
    ];

    const geographies = ["National", "County", "Sector"];

    container.innerHTML = `
      <div class="control">
        <label for="story-lens" class="control-label">Story lens</label>
        <select id="story-lens" class="control-input">
          ${lenses.map((value) => `<option value="${escapeHtml(value)}" ${state.lens === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </div>
      <div class="control">
        <label for="story-year" class="control-label">Reference year</label>
        <select id="story-year" class="control-input">
          ${years.map((value) => `<option value="${value}" ${state.year === value ? "selected" : ""}>${value}</option>`).join("")}
        </select>
      </div>
      <div class="control">
        <label for="story-geography" class="control-label">View emphasis</label>
        <select id="story-geography" class="control-input">
          ${geographies.map((value) => `<option value="${escapeHtml(value)}" ${state.geography === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
        </select>
      </div>
    `;

    container.querySelector("#story-lens")?.addEventListener("change", (event) => {
      state.lens = event.target.value;
      onChange(state);
    });

    container.querySelector("#story-year")?.addEventListener("change", (event) => {
      state.year = Number(event.target.value);
      onChange(state);
    });

    container.querySelector("#story-geography")?.addEventListener("change", (event) => {
      state.geography = event.target.value;
      onChange(state);
    });
  }

  render();
  return container;
}
