import * as d3 from "npm:d3@7.9.0";
import {pboTaxTypeColors} from "../config/chart-palette.js";
import {mobileTimelineScroll} from "./mobile-timeline-scroll.js";

const TAX_TYPES = ["VAT", "Income Taxes", "Corporation Tax", "Capital Gains Tax"];

function euroMillions(value) {
  const absolute = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  return absolute >= 1000
    ? `${sign}€${d3.format(".1f")(absolute / 1000)}bn`
    : `${sign}€${d3.format(",.0f")(absolute)}m`;
}

export function sectorTaxCompositionBars(rows, {
  sector,
  mode = "value",
  width = 1040,
  title = "Tax breakdown by sector",
} = {}) {
  const filtered = rows.filter((d) => d.Sector === sector && Number.isFinite(d.Amount));
  const years = Array.from(new Set(filtered.map((d) => d.Year))).sort(d3.ascending);
  const byYearAndType = d3.rollup(filtered, (values) => d3.sum(values, (d) => d.Amount), (d) => d.Year, (d) => d.Tax_type);
  const wide = years.map((Year) => {
    const total = byYearAndType.get(Year)?.get("Total") ?? d3.sum(TAX_TYPES, (key) => byYearAndType.get(Year)?.get(key) ?? 0);
    const row = {Year, total};
    for (const key of TAX_TYPES) {
      const amount = byYearAndType.get(Year)?.get(key) ?? 0;
      row[key] = mode === "share" ? amount / (total || 1) : amount / 1000;
    }
    return row;
  });

  const layers = d3.stack().keys(TAX_TYPES).offset(d3.stackOffsetDiverging)(wide);
  const segments = layers.flatMap((layer) => layer.map((segment) => ({
    key: layer.key,
    Year: segment.data.Year,
    value: segment.data[layer.key],
    y0: segment[0],
    y1: segment[1],
  })));
  const height = typeof window !== "undefined" && window.innerWidth <= 720 ? 430 : 500;
  const marginTop = 18;
  const marginRight = 24;
  const marginBottom = 46;
  const marginLeft = 76;
  const x = d3.scaleBand().domain(years).range([marginLeft, width - marginRight]).padding(0.24);
  const yExtent = [
    Math.min(0, d3.min(segments, (d) => d.y0) ?? 0),
    Math.max(0, d3.max(segments, (d) => d.y1) ?? 0),
  ];
  const y = d3.scaleLinear().domain(yExtent).nice(5).range([height - marginBottom, marginTop]);
  const yTicks = y.ticks(5);
  const valueFormat = mode === "share"
    ? d3.format(".1%")
    : (value) => euroMillions(value * 1000);

  const figure = document.createElement("figure");
  figure.className = "tax-chart tax-sector-composition-chart";
  const caption = document.createElement("figcaption");
  caption.className = "tax-chart__heading";
  caption.innerHTML = `
    <strong>${title}</strong>
    <span>${sector} · ${mode === "share" ? "share of net sector receipts" : "net receipts · € billion"}</span>
  `;

  const shell = document.createElement("div");
  shell.className = "tax-chart__plot tax-sector-composition-shell";
  shell.setAttribute("role", "region");
  shell.setAttribute("aria-label", "Scrollable sector tax composition chart");
  shell.tabIndex = 0;

  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    // The bar segments are keyboard-focusable controls, so the SVG is an
    // accessible group rather than a static image with nested buttons.
    .attr("role", "group")
    .attr("aria-label", `Stacked column chart showing the tax composition of ${sector} from ${years.at(0)} to ${years.at(-1)}`);
  svg.append("desc").text("Each column is one year and each coloured segment is a tax type. Negative net receipts extend below zero.");

  svg.append("g")
    .attr("class", "tax-sector-composition__grid")
    .selectAll("line")
    .data(yTicks)
    .join("line")
      .attr("x1", marginLeft)
      .attr("x2", width - marginRight)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d));

  const bars = svg.append("g")
    .selectAll("rect")
    .data(segments)
    .join("rect")
      .attr("class", "tax-sector-composition__segment")
      .attr("x", (d) => x(d.Year))
      .attr("width", x.bandwidth())
      .attr("y", (d) => y(Math.max(d.y0, d.y1)))
      .attr("height", (d) => Math.max(0, Math.abs(y(d.y0) - y(d.y1))))
      .attr("fill", (d) => pboTaxTypeColors[d.key])
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.key}, ${d.Year}: ${valueFormat(d.value)}. Focus to highlight this tax type.`);

  svg.append("line")
    .attr("class", "tax-sector-composition__baseline")
    .attr("x1", marginLeft)
    .attr("x2", width - marginRight)
    .attr("y1", y(0))
    .attr("y2", y(0));

  svg.append("g")
    .attr("class", "tax-line-axis tax-line-axis--x")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));
  svg.append("g")
    .attr("class", "tax-line-axis tax-line-axis--y")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).tickValues(yTicks).tickFormat((value) => {
      if (value === 0) return "";
      return mode === "share" ? d3.format(".0%")(value) : `€${d3.format(".1~f")(value)}bn`;
    }).tickSizeOuter(0));

  const tooltip = document.createElement("div");
  tooltip.className = "tax-streamgraph-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "status");
  tooltip.setAttribute("aria-live", "polite");

  const showTooltip = (datum, event = null) => {
    bars
      .classed("is-muted", (d) => d.key !== datum.key)
      .classed("is-highlighted", (d) => d.key === datum.key);
    tooltip.innerHTML = `<strong>${datum.key}</strong><span>${datum.Year}</span><span>${valueFormat(datum.value)}</span>`;
    tooltip.hidden = false;
    if (event) {
      const bounds = shell.getBoundingClientRect();
      const inset = 8;
      const gap = 14;
      const localX = event.clientX - bounds.left + shell.scrollLeft;
      const localY = event.clientY - bounds.top;
      const visibleLeft = shell.scrollLeft + inset;
      const visibleRight = shell.scrollLeft + bounds.width - inset;
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      let left = localX + gap;
      let top = localY - tooltipHeight - gap;
      if (left + tooltipWidth > visibleRight) left = localX - tooltipWidth - gap;
      if (top < inset) top = localY + gap;
      tooltip.style.left = `${Math.min(Math.max(left, visibleLeft), Math.max(visibleLeft, visibleRight - tooltipWidth))}px`;
      tooltip.style.top = `${Math.max(inset, top)}px`;
    } else {
      tooltip.style.left = "1rem";
      tooltip.style.top = "1rem";
    }
  };
  const clearTooltip = () => {
    bars.classed("is-muted", false).classed("is-highlighted", false);
    tooltip.hidden = true;
  };

  bars
    .on("pointerenter pointermove", (event, datum) => showTooltip(datum, event))
    .on("pointerleave", clearTooltip)
    .on("focus", (event, datum) => showTooltip(datum))
    .on("blur", clearTooltip)
    .on("keydown", function(event) {
      if (event.key === "Escape") {
        clearTooltip();
        this.blur();
      }
    });

  const legend = document.createElement("div");
  legend.className = "tax-streamgraph-legend tax-sector-composition-legend";
  legend.setAttribute("aria-label", "Tax type legend");
  for (const key of TAX_TYPES) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "tax-streamgraph-legend__item";
    item.innerHTML = `<i style="--series-color:${pboTaxTypeColors[key]}" aria-hidden="true"></i><span>${key}</span>`;
    const latest = segments.findLast((d) => d.key === key);
    item.addEventListener("pointerenter", () => showTooltip(latest));
    item.addEventListener("pointerleave", clearTooltip);
    item.addEventListener("focus", () => showTooltip(latest));
    item.addEventListener("blur", clearTooltip);
    legend.appendChild(item);
  }

  const hasNegative = segments.some((d) => d.value < 0);
  const note = document.createElement("p");
  note.className = "tax-chart__note";
  note.textContent = mode === "share"
    ? "Each component is shown as a share of the sector's net total. Where a component is negative, the positive shares may add to more than 100%."
    : hasNegative
      ? "Negative net receipt components are shown below zero."
      : "The four components reconcile to the sector's net total in each year.";

  const mobileHint = mobileTimelineScroll(shell);
  shell.append(svg.node(), tooltip);
  figure.append(caption, mobileHint, shell, legend, note);
  return figure;
}
