/**
 * Light scroll-in for body sections. Content is visible by default; only elements still below the
 * fold get hidden, then eased in as they arrive. Skipped under reduced motion.
 */
export function revealSections(items: Iterable<HTMLElement>): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' }
  );
  for (const item of items) {
    if (item.getBoundingClientRect().top < innerHeight) continue;
    item.classList.add('will-reveal');
    observer.observe(item);
  }
}
