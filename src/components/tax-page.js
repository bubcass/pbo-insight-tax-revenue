import {enhanceHeroWithShare} from "./hero-share.js";

export function taxHero({image, title, subtitle}) {
  const hero = document.createElement("div");
  hero.className = "hero tax-revenue-hero";
  hero.innerHTML = `
    <div class="hero__media">
      <img class="hero__image" src="${image}" alt="Euro banknotes under a magnifying glass beside a calculator">
    </div>
    <div class="hero__overlay">
      <div class="hero__content">
        <p class="hero__eyebrow">PBO Insights</p>
        <h1 class="hero__title">${title}</h1>
        <p class="hero__subtitle">${subtitle}</p>
      </div>
    </div>
  `;
  enhanceHeroWithShare(hero, {title: `${title} — Parliamentary Budget Office`});
  return hero;
}
