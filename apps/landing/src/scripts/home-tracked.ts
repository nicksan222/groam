/**
 * Lights the four entry kinds up one after another the first time the section scrolls into view.
 * Content stays fully visible without script and under reduced motion.
 */
export function lightKinds(section: HTMLElement): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  section.classList.add('armed');
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      section.classList.add('lit');
    },
    { threshold: 0.35 }
  );
  observer.observe(section.querySelector('.kinds') ?? section);
}
