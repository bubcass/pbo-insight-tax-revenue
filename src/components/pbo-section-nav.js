const tabs = [
  { id: "overview", label: "Overview", href: "./" },
  { id: "composition", label: "Composition", href: "./composition" },
  { id: "geography", label: "Geography", href: "./geography" },
  { id: "sectors", label: "Sectors", href: "./sectors" },
];

let tabsInstance = 0;

export function pboSectionNav(activeId = "overview") {
  if (typeof document !== "undefined") {
    for (const existing of document.querySelectorAll(".pbo-section-nav")) {
      existing.__disposePboSectionNav?.();
      existing.remove();
    }
  }

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  const listId = `pbo-sections-${++tabsInstance}`;
  const shell = document.createElement("div");
  shell.className = "insights-tabs-shell";

  const nav = document.createElement("nav");
  nav.className = "insights-tabs pbo-section-nav";
  nav.setAttribute("aria-label", "Tax Revenue Insights sections");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "insights-tabs__toggle";
  toggle.setAttribute("aria-controls", listId);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", `Current section: ${active.label}. Open section navigation`);
  toggle.innerHTML = `
    <span>${active.label}</span>
    <i aria-hidden="true"></i>
  `;

  const list = document.createElement("div");
  list.className = "insights-tabs__list";
  list.id = listId;

  for (const tab of tabs) {
    const link = document.createElement("a");
    link.className = "insights-tabs__link";
    link.href = tab.href;
    link.textContent = tab.label;

    if (tab.id === active.id) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }

    list.appendChild(link);
  }

  nav.append(toggle, list);
  shell.appendChild(nav);

  if (typeof window !== "undefined") {
    let frame = null;
    let menuOpen = false;
    let destroyed = false;
    const listenerController = new AbortController();
    const {signal} = listenerController;
    const mobileQuery = window.matchMedia("(max-width: 720px)");
    const mastheadQuery = window.matchMedia("(min-width: 901px)");

    const cleanup = () => {
      if (destroyed) return;
      destroyed = true;
      listenerController.abort();
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      nav.remove();
      shell.style.height = "";
      if (!document.querySelector(".pbo-section-nav.insights-tabs--floating")) {
        document.documentElement.classList.remove("has-floating-insights-tabs");
      }
    };

    nav.__disposePboSectionNav = cleanup;

    const setMenuOpen = (open, {focusToggle = false} = {}) => {
      if (destroyed) return;
      menuOpen = mobileQuery.matches && open;
      nav.classList.toggle("is-open", menuOpen);
      toggle.setAttribute("aria-expanded", String(menuOpen));
      list.hidden = mobileQuery.matches && !menuOpen;
      if (focusToggle) toggle.focus();
    };

    const syncNavigationMode = () => {
      if (destroyed) return;
      toggle.hidden = !mobileQuery.matches;
      setMenuOpen(false);
    };

    const syncFloating = () => {
      frame = null;
      if (destroyed || !shell.isConnected) {
        cleanup();
        return;
      }
      const masthead = document.querySelector(".oireachtas-masthead");
      const mastheadInner = masthead?.querySelector(".oireachtas-masthead__inner");
      const mastheadActions = mastheadInner?.querySelector(".oireachtas-masthead__actions");
      const mobileTools = document.querySelector(".mobile-reading-tools");
      const mobileMore = mobileTools?.querySelector(".mobile-reading-tools__more-wrap");
      const mastheadHeight = masthead?.offsetHeight || 0;
      const navHeight = nav.offsetHeight;
      const dockingLine = mobileQuery.matches ? 12 : mastheadHeight;
      const shouldFloat = shell.getBoundingClientRect().top <= dockingLine;
      const shouldDockInMasthead = shouldFloat && mastheadQuery.matches && mastheadInner;
      const shouldDockInMobileTools = shouldFloat && mobileQuery.matches && mobileTools;

      shell.style.height = shouldFloat ? `${navHeight}px` : "";
      shell.classList.toggle("insights-tabs-shell--floating", shouldFloat);
      nav.classList.toggle("insights-tabs--floating", shouldFloat);
      nav.classList.toggle("insights-tabs--masthead", Boolean(shouldDockInMasthead));
      nav.classList.toggle("insights-tabs--mobile-tools", Boolean(shouldDockInMobileTools));
      document.documentElement.classList.toggle("has-floating-insights-tabs", shouldFloat);

      if (shouldDockInMobileTools && nav.parentNode !== mobileTools) {
        mobileTools.insertBefore(nav, mobileMore || null);
      } else if (shouldDockInMasthead && nav.parentNode !== mastheadInner) {
        mastheadInner.insertBefore(nav, mastheadActions || null);
      } else if (!shouldDockInMobileTools && !shouldDockInMasthead && nav.parentNode !== shell) {
        shell.appendChild(nav);
      }
    };

    const scheduleSync = () => {
      if (destroyed || !shell.isConnected) {
        cleanup();
        return;
      }
      if (frame !== null) return;
      frame = window.requestAnimationFrame(syncFloating);
    };

    toggle.addEventListener("click", () => setMenuOpen(!menuOpen), {signal});
    document.addEventListener("pointerdown", (event) => {
      if (menuOpen && !nav.contains(event.target)) setMenuOpen(false);
    }, {signal});
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuOpen) setMenuOpen(false, {focusToggle: true});
    }, {signal});
    list.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) {
        setMenuOpen(false);
      }
    }, {signal});
    mobileQuery.addEventListener("change", syncNavigationMode, {signal});
    mastheadQuery.addEventListener("change", scheduleSync, {signal});

    window.addEventListener("scroll", scheduleSync, {passive: true, signal});
    window.addEventListener("resize", scheduleSync, {signal});
    syncNavigationMode();
    frame = window.requestAnimationFrame(syncFloating);

  }

  return shell;
}
