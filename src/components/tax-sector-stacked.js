import * as d3 from "npm:d3";
import {chartPalettes} from "../config/chart-palette.js";
import {mobileTimelineScroll} from "./mobile-timeline-scroll.js";

const COLORS = chartPalettes.pboCategorical;

export function sectorStackedArea(rows, {
  taxType = "Total",
  mode = "share",
  width = 1040,
  limit = 8,
  totalRows = null,
  title = "Sector mix"
} = {}) {
  const filtered = rows.filter((d) => d.Tax_type === taxType && Number.isFinite(d.Amount));
  const years = Array.from(new Set(filtered.map((d) => d.Year))).sort(d3.ascending);
  const nationalByYear = totalRows
    ? d3.rollup(
        totalRows.filter((d) => d.Taxhead === "Total Net Receipts" && Number.isFinite(d.Amount)),
        (values) => d3.sum(values, (d) => d.Amount),
        (d) => d.Year
      )
    : null;
  const residualKey = "Other receipts not classified by sector";
  const rankedSectors = d3.rollups(filtered, (values) => d3.sum(values, (d) => Math.max(0, d.Amount)), (d) => d.Sector)
    .sort((a, b) => d3.descending(a[1], b[1]));
  const topSectors = rankedSectors.slice(0, limit).map(([sector]) => sector);
  const otherSectors = rankedSectors.slice(limit).map(([sector]) => sector);
  const topSet = new Set(topSectors);
  const keys = [...topSectors, "Other sectors", ...(nationalByYear ? [residualKey] : [])];
  const lookup = d3.rollup(filtered, (values) => d3.sum(values, (d) => Math.max(0, d.Amount)), (d) => d.Year, (d) => d.Sector);
  const wide = years.map((Year) => {
    const raw = {};
    let other = 0;
    for (const row of filtered.filter((d) => d.Year === Year)) {
      if (!topSet.has(row.Sector)) other += Math.max(0, row.Amount);
    }
    for (const key of topSectors) raw[key] = lookup.get(Year)?.get(key) ?? 0;
    raw["Other sectors"] = other;
    const classifiedTotal = d3.sum([...topSectors, "Other sectors"], (key) => raw[key]);
    const nationalTotal = nationalByYear?.get(Year);
    if (nationalByYear) raw[residualKey] = Math.max(0, (nationalTotal ?? classifiedTotal) - classifiedTotal);
    const total = nationalByYear ? Math.max(nationalTotal ?? classifiedTotal, classifiedTotal, 1) : classifiedTotal || 1;
    const row = {Year};
    for (const key of keys) row[key] = mode === "share" ? raw[key] / total : raw[key] / 1000;
    return row;
  });
  const layers = d3.stack().keys(keys)(wide);
  const height = typeof window !== "undefined" && window.innerWidth <= 720 ? 450 : 520;
  const marginTop = 22;
  const marginRight = 24;
  const marginBottom = 46;
  const marginLeft = 72;
  const x = d3.scaleLinear().domain(d3.extent(years)).range([marginLeft, width - marginRight]);
  const yMax = mode === "share" ? 1 : d3.max(layers, (layer) => d3.max(layer, (d) => d[1]));
  const y = d3.scaleLinear().domain([0, yMax]).nice().range([height - marginBottom, marginTop]);
  const xTicks = x.ticks(10);
  const gridYears = years;
  const yTicks = y.ticks(5);
  const area = d3.area()
    .x((d) => x(d.data.Year))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveMonotoneX);
  const totalLine = d3.line()
    .x((d) => x(d.data.Year))
    .y((d) => y(d[1]))
    .curve(d3.curveMonotoneX);
  const color = new Map(keys.map((key, index) => [key, COLORS[index % COLORS.length]]));
  const valueFormat = mode === "share" ? d3.format(".1%") : (value) => `€${d3.format(".1f")(value)}bn`;

  const figure = document.createElement("figure");
  figure.className = "tax-chart tax-sector-stack-chart";
  const caption = document.createElement("figcaption");
  caption.className = "tax-chart__heading";
  caption.innerHTML = `
    <strong>${title}</strong>
    <span>${taxType === "Total" ? "Total net receipts" : taxType} · ${mode === "share" ? (nationalByYear ? "share of all net receipts" : "share of positive sector receipts") : "€ billion"}</span>
  `;
  const shell = document.createElement("div");
  shell.className = "tax-chart__plot tax-sector-stack-shell";
  shell.setAttribute("role", "region");
  shell.setAttribute("aria-label", "Scrollable stacked sector receipts chart");
  shell.tabIndex = 0;
  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `Stacked area chart of ${taxType.toLowerCase()} receipts by economic sector from ${years.at(0)} to ${years.at(-1)}`);
  svg.append("g")
    .attr("class", "tax-sector-stack__grid tax-sector-stack__grid--x")
    .selectAll("line")
    .data(gridYears)
    .join("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", marginTop)
      .attr("y2", height - marginBottom);
  svg.append("g")
    .attr("class", "tax-sector-stack__grid tax-sector-stack__grid--y")
    .selectAll("line")
    .data(yTicks)
    .join("line")
      .attr("x1", marginLeft)
      .attr("x2", width - marginRight)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d));
  const paths = svg.append("g")
    .selectAll("path")
    .data(layers)
    .join("path")
      .attr("class", "tax-sector-stack__layer")
      .attr("d", area)
      .attr("fill", (d) => color.get(d.key))
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.key}. Focus to highlight this sector.`);
  svg.append("path")
    .datum(layers.at(-1))
    .attr("class", "tax-sector-stack__total-line")
    .attr("d", totalLine);
  svg.append("g")
    .attr("class", "tax-line-axis tax-line-axis--x")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickValues(xTicks).tickFormat(d3.format("d")).tickSizeOuter(0));
  svg.append("g")
    .attr("class", "tax-line-axis tax-line-axis--y")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).tickValues(yTicks).tickFormat((value) => {
      if (value === 0) return "";
      return mode === "share" ? d3.format(".0%")(value) : `€${d3.format(".0f")(value)}bn`;
    }).tickSizeOuter(0));

  const tooltip = document.createElement("div");
  tooltip.className = "tax-streamgraph-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "status");
  tooltip.setAttribute("aria-live", "polite");
  const setHighlight = (series, year, event = null) => {
    paths.classed("is-muted", (d) => d.key !== series.key).classed("is-highlighted", (d) => d.key === series.key);
    const datum = wide.find((d) => d.Year === year) ?? wide.at(-1);
    tooltip.innerHTML = `<strong>${series.key}</strong><span>${datum.Year}</span><span>${valueFormat(datum[series.key])}</span>`;
    tooltip.hidden = false;
    if (event) {
      const bounds = shell.getBoundingClientRect();
      const inset = 8;
      const gap = 14;
      const localX = event.clientX - bounds.left + shell.scrollLeft;
      const localY = event.clientY - bounds.top + shell.scrollTop;
      const visibleLeft = shell.scrollLeft + inset;
      const visibleRight = shell.scrollLeft + bounds.width - inset;
      const visibleTop = shell.scrollTop + inset;
      const visibleBottom = shell.scrollTop + bounds.height - inset;
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      let left = localX + gap;
      let top = localY - tooltipHeight - gap;
      if (left + tooltipWidth > visibleRight) left = localX - tooltipWidth - gap;
      if (top < visibleTop) top = localY + gap;
      left = Math.min(Math.max(left, visibleLeft), Math.max(visibleLeft, visibleRight - tooltipWidth));
      top = Math.min(Math.max(top, visibleTop), Math.max(visibleTop, visibleBottom - tooltipHeight));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    } else {
      tooltip.style.left = "1rem";
      tooltip.style.top = "1rem";
    }
  };
  const clearHighlight = () => {
    paths.classed("is-muted", false).classed("is-highlighted", false);
    tooltip.hidden = true;
  };
  const nearestYear = (event) => {
    const [pointerX] = d3.pointer(event, svg.node());
    const target = x.invert(pointerX);
    return years[d3.leastIndex(years, (year) => Math.abs(year - target))];
  };
  paths
    .on("pointerenter pointermove", (event, series) => setHighlight(series, nearestYear(event), event))
    .on("pointerleave", clearHighlight)
    .on("focus", (event, series) => setHighlight(series, years.at(-1)))
    .on("blur", clearHighlight)
    .on("keydown", function(event) {
      if (event.key === "Escape") {
        clearHighlight();
        this.blur();
      }
    });

  const hint = mobileTimelineScroll(shell);
  const legend = document.createElement("div");
  legend.className = "tax-streamgraph-legend tax-sector-stack-legend";
  legend.setAttribute("aria-label", "Economic sector legend");
  for (const key of keys) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "tax-streamgraph-legend__item";
    item.innerHTML = `<i style="--series-color:${color.get(key)}" aria-hidden="true"></i><span>${key}</span>`;
    const series = layers.find((layer) => layer.key === key);
    item.addEventListener("pointerenter", () => setHighlight(series, years.at(-1)));
    item.addEventListener("pointerleave", clearHighlight);
    item.addEventListener("focus", () => setHighlight(series, years.at(-1)));
    item.addEventListener("blur", clearHighlight);
    legend.appendChild(item);
  }
  const note = document.createElement("p");
  note.className = "tax-chart__note";
  const otherSectorList = otherSectors.length
    ? `${otherSectors.slice(0, -1).join("; ")}${otherSectors.length > 1 ? "; and " : ""}${otherSectors.at(-1)}`
    : "none";
  note.textContent = nationalByYear
    ? `The ${limit} largest sectors across the series are shown separately. “Other sectors” comprises ${otherSectorList}. “Other receipts not classified by sector” reconciles the sector-attributable tax heads to total net Exchequer receipts. Negative sector amounts are netted through that residual band.`
    : `The ${limit} largest sectors across the series are shown separately. “Other sectors” comprises ${otherSectorList}. Negative net amounts are excluded from the stacked view.`;
  shell.append(svg.node(), tooltip);
  figure.append(caption, hint, shell, legend, note);
  return figure;
}
