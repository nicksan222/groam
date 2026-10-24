const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * One orchestrated reveal per section: its heading, text, and example fragment rise in a short
 * sequence the first time the section scrolls into view. Everything is visible without this script.
 */
export function revealSections(sections: Iterable<HTMLElement>): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const viewport = window.innerHeight;
  const items = (section: HTMLElement) =>
    section.querySelectorAll<HTMLElement>('[data-reveal-item]');
  // Sections still below the fold are held back before they can be seen, so nothing flashes.
  for (const section of sections) {
    if (section.getBoundingClientRect().top < viewport) continue;
    for (const item of items(section)) item.style.opacity = '0';
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        items(entry.target as HTMLElement).forEach((item, index) => {
          item.style.opacity = '';
          item.animate(
            [
              { opacity: 0, transform: 'translateY(18px)' },
              { opacity: 1, transform: 'none' }
            ],
            { duration: 800, delay: index * 120, easing: ease, fill: 'backwards' }
          );
        });
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
  );
  for (const section of sections) observer.observe(section);
}
