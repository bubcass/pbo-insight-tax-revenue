const MOBILE_QUERY = "(max-width: 720px)";

export function mobileTimelineScroll(shell) {
  const hint = document.createElement("p");
  hint.className = "tax-chart__note tax-chart__mobile-scroll-hint";
  hint.textContent = "Latest year shown first · scroll left to explore earlier years ←";

  if (typeof window === "undefined" || !window.matchMedia(MOBILE_QUERY).matches) return hint;

  // The chart is not attached to the page when it is created. Waiting for two
  // frames lets the scroll region acquire its rendered width before we reveal
  // the newest year at the right-hand edge.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      shell.scrollLeft = Math.max(0, shell.scrollWidth - shell.clientWidth);
    });
  });

  return hint;
}
