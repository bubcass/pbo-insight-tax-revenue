const sections = [
  { id: "basis", label: "Repository basis", href: "#repository-basis" },
  { id: "inventory", label: "Data inventory", href: "#data-inventory" },
  { id: "readiness", label: "Proof of readiness", href: "#proof-of-readiness" },
  { id: "directions", label: "Story directions", href: "#story-directions" }
];

export function renderSectionNav({ currentSection = "basis" } = {}) {
  const shell = document.createElement("div");
  shell.className = "section-nav-shell";

  const nav = document.createElement("div");
  nav.className = "section-nav";
  nav.setAttribute("role", "navigation");
  nav.setAttribute("aria-label", "Tax Revenue Insights sections");

  const list = document.createElement("div");
  list.className = "section-nav__list";

  for (const section of sections) {
    const link = document.createElement("a");
    link.className = "section-nav__link";
    link.href = section.href;
    link.textContent = section.label;

    if (section.id === currentSection) {
      link.setAttribute("aria-current", "page");
    }

    list.appendChild(link);
  }

  nav.appendChild(list);
  shell.appendChild(nav);

  if (typeof window !== "undefined") {
    const syncFloating = () => {
      const shouldFloat = shell.getBoundingClientRect().top <= 0;
      shell.classList.toggle("section-nav-shell--floating", shouldFloat);
      shell.style.height = shouldFloat ? `${nav.offsetHeight}px` : "";
    };

    const onScroll = () => window.requestAnimationFrame(syncFloating);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.requestAnimationFrame(syncFloating);
  }

  return shell;
}
