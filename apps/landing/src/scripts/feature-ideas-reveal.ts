const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

/**
 * One orchestrated reveal per section: its heading, text, and example fragment rise in a short
 * sequence the first time the section scrolls into view. Everything is visible without this script.
 */
export function revealSections(sections: Iterable<HTMLElement>): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        entry.target.querySelectorAll<HTMLElement>('[data-reveal-item]').forEach((item, index) => {
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
