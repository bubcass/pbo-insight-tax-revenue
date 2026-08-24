import * as d3 from "npm:d3";
import * as Plot from "npm:@observablehq/plot";
import {chartPalettes} from "../config/chart-palette.js";
import {chartStyle, plotStyle, responsivePlotWidth} from "../config/chart-style.js";
import {sanitizePlotAccessibility} from "./plot-accessibility.js";

const COLORS = chartPalettes.pboCategorical;
const euroMillions = (value) => `€${d3.format(",.0f")(value)}m`;

function frame(title, subtitle, note = "") {
  const figure = document.createElement("figure");
  figure.className = "tax-chart";
  const caption = document.createElement("figcaption");
  caption.className = "tax-chart__heading";
  const strong = document.createElement("strong");
  strong.textContent = title;
  caption.appendChild(strong);
  if (subtitle) {
    const span = document.createElement("span");
    span.textContent = subtitle;
    caption.appendChild(span);
  }
  figure.appendChild(caption);
  if (note) {
    const p = document.createElement("p");
    p.className = "tax-chart__note";
    p.textContent = note;
    figure.appendChild(p);
  }
  return figure;
}

function finish(figure, plot, label) {
  plot.setAttribute("role", "img");
  plot.setAttribute("aria-label", label);
  sanitizePlotAccessibility(plot);
  const shell = document.createElement("div");
  shell.className = "tax-chart__plot";
  shell.appendChild(plot);
  figure.insertBefore(shell, figure.querySelector(".tax-chart__note"));
  return figure;
}

function compactRanking(figure, rows, {label, value, format}) {
  const shell = document.createElement("div");
  shell.className = "tax-ranking-list";
  const max = d3.max(rows, (d) => Math.max(0, value(d))) || 1;
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "tax-ranking-list__item";
    const heading = document.createElement("div");
    heading.className = "tax-ranking-list__heading";
    const name = document.createElement("span");
    name.textContent = label(row);
    const amount = document.createElement("strong");
    amount.textContent = format(value(row));
    heading.append(name, amount);
    const track = document.createElement("div");
    track.className = "tax-ranking-list__track";
    const bar = document.createElement("span");
    bar.style.width = `${Math.max(2, Math.abs(value(row)) / max * 100)}%`;
    if (value(row) < 0) bar.classList.add("is-negative");
    track.appendChild(bar);
    item.append(heading, track);
    shell.appendChild(item);
  }
  figure.insertBefore(shell, figure.querySelector(".tax-chart__note"));
  return figure;
}

export function compositionBars(rows, {year, mode = "value", width = 1040} = {}) {
  const values = rows
    .filter((d) => d.Year === year && d.Taxhead !== "Total Net Receipts" && Number.isFinite(d.Amount))
    .sort((a, b) => d3.descending(a.Amount, b.Amount));
  const total = d3.sum(values, (d) => d.Amount) || 1;
  const data = values.map((d) => ({...d, value: mode === "share" ? d.Amount / total : d.Amount}));
  const unit = mode === "share" ? "Share of tax receipts" : "Net receipts (€ million)";
  const format = mode === "share" ? d3.format(".1%") : euroMillions;
  const figure = frame(
    `What made up Ireland's tax receipts in ${year}?`,
    mode === "share" ? "Share of the selected year's net receipts" : "Net Exchequer receipts, € million",
  );
  if (typeof window !== "undefined" && window.innerWidth <= 720) {
    return compactRanking(figure, data, {
      label: (d) => d.Taxhead,
      value: (d) => d.value,
      format,
    });
  }
  const max = d3.max(data, (d) => d.value) || 1;
  const plot = Plot.plot({
    width: responsivePlotWidth(width),
    height: Math.max(360, data.length * 56 + 76),
    marginTop: 18,
    marginRight: 96,
    marginBottom: 48,
    marginLeft: 150,
    style: plotStyle(),
    x: {domain: [0, max * 1.19], grid: true, label: unit, tickFormat: mode === "share" ? ".0%" : "~s"},
    y: {domain: data.map((d) => d.Taxhead), label: null, tickSize: 0},
    marks: [
      Plot.ruleX([0], {stroke: chartStyle.baseline}),
      Plot.barX(data, {x: "value", y: "Taxhead", fill: (d, i) => COLORS[i % COLORS.length], insetTop: 7, insetBottom: 7, title: (d) => `${d.Taxhead}: ${format(d.value)}`}),
      Plot.text(data, {x: "value", y: "Taxhead", text: (d) => format(d.value), dx: 8, textAnchor: "start", fill: chartStyle.text, fontWeight: 600}),
    ],
  });
  return finish(figure, plot, `Tax receipt composition in ${year}`);
}

export function receiptTrend(rows, {taxhead, mode = "value", width = 1040} = {}) {
  const totals = new Map(rows.filter((d) => d.Taxhead === "Total Net Receipts").map((d) => [d.Year, d.Amount]));
  const data = rows
    .filter((d) => d.Taxhead === taxhead && Number.isFinite(d.Amount))
    .map((d) => ({...d, value: mode === "share" ? d.Amount / (totals.get(d.Year) || d.Amount) : d.Amount / 1000}))
    .sort((a, b) => d3.ascending(a.Year, b.Year));
  const format = mode === "share" ? d3.format(".1%") : (value) => `€${d3.format(".1f")(value)}bn`;
  const figure = frame(
    `${taxhead} over time`,
    mode === "share" ? "Share of total net receipts" : "Net Exchequer receipts, € billion",
    "Values are shown in nominal terms and are not adjusted for inflation.",
  );
  const height = 430;
  const marginTop = 22;
  const marginRight = 28;
  const marginBottom = 46;
  const marginLeft = 72;
  const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.Year)).range([marginLeft, width - marginRight]);
  const y = d3.scaleLinear().domain([0, d3.max(data, (d) => d.value) * 1.08]).nice().range([height - marginBottom, marginTop]);
  const svg = d3.create("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("role", "img")
    .attr("aria-label", `${taxhead} receipts from ${data.at(0)?.Year} to ${data.at(-1)?.Year}`);
  svg.append("g")
    .attr("class", "tax-line-grid")
    .selectAll("line")
    .data(y.ticks(6))
    .join("line")
      .attr("x1", marginLeft)
      .attr("x2", width - marginRight)
      .attr("y1", (d) => y(d))
      .attr("y2", (d) => y(d));
  svg.append("path")
    .datum(data)
    .attr("class", "tax-receipts-area")
    .attr("d", d3.area().x((d) => x(d.Year)).y0(y(0)).y1((d) => y(d.value)).curve(d3.curveMonotoneX));
  svg.append("path")
    .datum(data)
    .attr("class", "tax-receipts-line")
    .attr("d", d3.line().x((d) => x(d.Year)).y((d) => y(d.value)).curve(d3.curveMonotoneX));
  svg.append("g")
    .attr("class", "tax-line-axis tax-line-axis--x")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d3.format("d")).tickSizeOuter(0));
  svg.append("g")
    .attr("class", "tax-line-axis tax-line-axis--y")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat(mode === "share" ? d3.format(".0%") : (value) => `€${d3.format(".0f")(value)}bn`).tickSizeOuter(0));

  const focus = svg.append("g").attr("class", "tax-line-focus").attr("aria-hidden", "true");
  const focusRule = focus.append("line").attr("y1", marginTop).attr("y2", height - marginBottom);
  const focusDot = focus.append("circle").attr("r", 5);
  focus.style("display", "none");

  const shell = document.createElement("div");
  shell.className = "tax-chart__plot tax-line-shell";
  shell.setAttribute("role", "region");
  shell.setAttribute("aria-label", `Interactive ${taxhead} trend chart`);
  shell.tabIndex = 0;
  const tooltip = document.createElement("div");
  tooltip.className = "tax-streamgraph-tooltip tax-line-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "status");
  tooltip.setAttribute("aria-live", "polite");
  let activeIndex = data.length - 1;
  const show = (index, event = null) => {
    activeIndex = Math.max(0, Math.min(data.length - 1, index));
    const datum = data[activeIndex];
    focus.style("display", null);
    focusRule.attr("x1", x(datum.Year)).attr("x2", x(datum.Year));
    focusDot.attr("cx", x(datum.Year)).attr("cy", y(datum.value));
    tooltip.innerHTML = `<strong>${datum.Year}</strong><span>${format(datum.value)}</span>`;
    tooltip.hidden = false;
    if (event) {
      const bounds = shell.getBoundingClientRect();
      tooltip.style.left = `${Math.min(Math.max(8, event.clientX - bounds.left + 14), Math.max(8, bounds.width - 170))}px`;
      tooltip.style.top = `${Math.min(Math.max(8, event.clientY - bounds.top - 62), Math.max(8, bounds.height - 76))}px`;
    } else {
      tooltip.style.left = "1rem";
      tooltip.style.top = "1rem";
    }
  };
  const hide = () => {
    focus.style("display", "none");
    tooltip.hidden = true;
  };
  svg.append("rect")
    .attr("class", "tax-line-overlay")
    .attr("x", marginLeft)
    .attr("y", marginTop)
    .attr("width", width - marginLeft - marginRight)
    .attr("height", height - marginTop - marginBottom)
    .on("pointerenter pointermove", (event) => {
      const [pointerX] = d3.pointer(event, svg.node());
      const target = x.invert(pointerX);
      show(d3.leastIndex(data, (d) => Math.abs(d.Year - target)), event);
    })
    .on("pointerleave", hide);
  shell.addEventListener("focus", () => show(activeIndex));
  shell.addEventListener("blur", hide);
  shell.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      show(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
    } else if (event.key === "Escape") {
      hide();
      shell.blur();
    }
  });
  shell.append(svg.node(), tooltip);
  figure.insertBefore(shell, figure.querySelector(".tax-chart__note"));
  return figure;
}

export function rankedReceipts(rows, {category, title, subtitle, width = 1040, limit = 15} = {}) {
  const data = rows
    .filter((d) => Number.isFinite(d.Amount))
    .sort((a, b) => d3.descending(a.Amount, b.Amount))
    .slice(0, limit);
  const max = d3.max(data, (d) => d.Amount) || 1;
  const figure = frame(title, subtitle, rows.some((d) => d.Amount < 0) ? "Negative receipts can arise where repayments exceed gross receipts." : "");
  if (typeof window !== "undefined" && window.innerWidth <= 720) {
    return compactRanking(figure, data, {
      label: (d) => d[category],
      value: (d) => d.Amount,
      format: euroMillions,
    });
  }
  const plot = Plot.plot({
    width: responsivePlotWidth(width),
    height: Math.max(430, data.length * 34 + 96),
    marginTop: 18,
    marginRight: 88,
    marginBottom: 48,
    marginLeft: 235,
    style: plotStyle(),
    x: {domain: [Math.min(0, d3.min(data, (d) => d.Amount) || 0), max * 1.16], grid: true, label: "Net receipts (€ million)", tickFormat: "~s"},
    y: {domain: data.map((d) => d[category]), label: null, tickSize: 0},
    marks: [
      Plot.ruleX([0], {stroke: chartStyle.baseline}),
      Plot.barX(data, {x: "Amount", y: category, fill: (d) => d.Amount < 0 ? COLORS[6] : COLORS[0], insetTop: 4, insetBottom: 4, title: (d) => `${d[category]}: ${euroMillions(d.Amount)}`}),
      Plot.text(data, {x: "Amount", y: category, text: (d) => euroMillions(d.Amount), dx: (d) => d.Amount < 0 ? -7 : 7, textAnchor: (d) => d.Amount < 0 ? "end" : "start", fill: chartStyle.text, fontSize: 11}),
    ],
  });
  return finish(figure, plot, title);
}

export function sectorMix(rows, {sector, width = 1040} = {}) {
  const data = rows.filter((d) => d.Sector === sector && d.Tax_type !== "Total" && Number.isFinite(d.Amount));
  const taxTypes = Array.from(new Set(data.map((d) => d.Tax_type)));
  const figure = frame(`${sector}: receipts over time`, "Net receipts by tax type, € million", "Use the sector ranking above to compare sectors in a single year.");
  const plot = Plot.plot({
    width: responsivePlotWidth(width),
    height: 460,
    marginTop: 38,
    marginRight: 34,
    marginBottom: 48,
    marginLeft: 72,
    style: plotStyle(),
    color: {domain: taxTypes, range: taxTypes.map((_, i) => COLORS[i % COLORS.length]), legend: true},
    x: {label: null, tickFormat: "d"},
    y: {grid: true, label: "€ million", tickFormat: "~s"},
    marks: [
      Plot.ruleY([0], {stroke: chartStyle.baseline}),
      Plot.lineY(data, {x: "Year", y: "Amount", stroke: "Tax_type", strokeWidth: 2.5, tip: true, title: (d) => `${d.Tax_type}, ${d.Year}: ${euroMillions(d.Amount)}`}),
      Plot.dot(data.filter((d) => d.Year === d3.max(data, (r) => r.Year)), {x: "Year", y: "Amount", fill: "Tax_type", r: 4}),
    ],
  });
  return finish(figure, plot, `Tax receipts for ${sector} over time`);
}
