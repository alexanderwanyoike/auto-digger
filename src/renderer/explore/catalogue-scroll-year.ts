export function catalogueScrollYear(timeline: HTMLElement, viewport: HTMLElement) {
  const inset = parseFloat(getComputedStyle(timeline).scrollMarginTop);
  const edge = viewport.getBoundingClientRect().top + inset;
  const years = [...timeline.querySelectorAll<HTMLElement>('[data-release-year]')];
  const atEnd =
    viewport.scrollTop > 0 &&
    viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 2;
  const section = atEnd
    ? years.at(-1)
    : years.find((year) => year.getBoundingClientRect().bottom > edge);
  return section?.dataset.releaseYear ? Number(section.dataset.releaseYear) : undefined;
}
