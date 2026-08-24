import * as d3 from "npm:d3";
import {chartPalettes} from "../config/chart-palette.js";

const COLORS = chartPalettes.pboCategorical;
const euroBillions = (value) => `€${d3.format(".1f")(value / 1000)}bn`;

export function compositionStreamgraph(rows, {mode = "value", width = 1040} = {}) {
  const detail = rows.filter((d) => d.Taxhead !== "Total Net Receipts" && Number.isFinite(d.Amount));
  const years = Array.from(new Set(detail.map((d) => d.Year))).sort(d3.ascending);
  const keys = d3.rollups(detail, (values) => d3.sum(values, (d) => d.Amount), (d) => d.Taxhead)
    .sort((a, b) => d3.descending(a[1], b[1]))
    .map(([key]) => key);
  const byYearAndKey = d3.rollup(detail, (values) => d3.sum(values, (d) => d.Amount), (d) => d.Year, (d) => d.Taxhead);
  const totals = new Map(years.map((year) => [year, d3.sum(keys, (key) => byYearAndKey.get(year)?.get(key) ?? 0)]));
  const wide = years.map((Year) => {
    const row = {Year};
    for (const key of keys) {
      const amount = byYearAndKey.get(Year)?.get(key) ?? 0;
      row[key] = mode === "share" ? amount / (totals.get(Year) || 1) : amount;
    }
    return row;
  });

  const stack = d3.stack()
    .keys(keys)
    .order(d3.stackOrderInsideOut)
    .offset(d3.stackOffsetWiggle);
  const layers = stack(wide);
  const height = typeof window !== "undefined" && window.innerWidth <= 720 ? 430 : 520;
  const marginTop = 22;
  const marginRight = 24;
  const marginBottom = 46;
  const marginLeft = 24;
  const x = d3.scaleLinear().domain(d3.extent(years)).range([marginLeft, width - marginRight]);
  const tickValues = x.ticks(Math.min(years.length, width < 700 ? 6 : 10));
  const gridYears = years;
  const y = d3.scaleLinear()
    .domain([
      d3.min(layers, (layer) => d3.min(layer, (d) => d[0])),
      d3.max(layers, (layer) => d3.max(layer, (d) => d[1])),
    ])
    .range([height - marginBottom, marginTop]);
  const area = d3.area()
    .x((d) => x(d.data.Year))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(d3.curveBasis);
  const color = new Map(keys.map((key, index) => [key, COLORS[index % COLORS.length]]));
  const valueFormat = mode === "share" ? d3.format(".1%") : euroBillions;

  const figure = document.createElement("figure");
  figure.className = "tax-chart tax-streamgraph-chart";
  const caption = document.createElement("figcaption");
  caption.className = "tax-chart__heading";
  caption.innerHTML = `
    <strong>Ireland's changing tax mix</strong>
    <span>${mode === "share" ? "Share of detailed net receipts" : "Net Exchequer receipts · € billion"}</span>
  `;

  const shell = document.createElement("div");
  shell.className = "tax-chart__plot tax-streamgraph-shell";
  shell.setAttribute("role", "region");
  shell.setAttribute("aria-label", "Scrollable tax composition streamgraph");
  shell.tabIndex = 0;
  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `Streamgraph showing ${mode === "share" ? "the share" : "the value"} of Ireland's tax receipts by tax head from ${d3.min(years)} to ${d3.max(years)}`);
  svg.append("desc").text("Each band represents one tax head. The thickness of a band shows its value in each year. Hover or focus a band for exact values.");

  svg.append("g")
    .attr("class", "tax-streamgraph__grid")
    .selectAll("line")
    .data(gridYears)
    .join("line")
      .attr("x1", (d) => x(d))
      .attr("x2", (d) => x(d))
      .attr("y1", marginTop)
      .attr("y2", height - marginBottom);

  const paths = svg.append("g")
    .selectAll("path")
    .data(layers)
    .join("path")
      .attr("class", "tax-streamgraph__layer")
      .attr("d", area)
      .attr("fill", (d) => color.get(d.key))
      .attr("fill-opacity", 0.86)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.key}. Focus to highlight this tax head.`);

  svg.append("g")
    .attr("class", "tax-streamgraph__axis")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickValues(tickValues).tickFormat(d3.format("d")).tickSizeOuter(0));

  const tooltip = document.createElement("div");
  tooltip.className = "tax-streamgraph-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "status");
  tooltip.setAttribute("aria-live", "polite");

  const setHighlight = (series, year, event = null) => {
    paths
      .classed("is-muted", (d) => d.key !== series.key)
      .classed("is-highlighted", (d) => d.key === series.key);
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
    .on("pointerenter pointermove", function(event, series) {
      setHighlight(series, nearestYear(event), event);
    })
    .on("pointerleave", clearHighlight)
    .on("focus", function(event, series) {
      setHighlight(series, years.at(-1));
    })
    .on("blur", clearHighlight)
    .on("keydown", function(event) {
      if (event.key === "Escape") {
        clearHighlight();
        this.blur();
      }
    });

  const legend = document.createElement("div");
  legend.className = "tax-streamgraph-legend";
  legend.setAttribute("aria-label", "Tax head legend");
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

  const mobileHint = document.createElement("p");
  mobileHint.className = "tax-chart__note tax-streamgraph__mobile-hint";
  mobileHint.textContent = "Swipe horizontally to explore all years.";

  shell.append(svg.node(), tooltip);
  figure.append(caption, shell, mobileHint, legend);
  return figure;
}
