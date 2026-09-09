export const marketingObserverOptions: IntersectionObserverInit = {
  // rootMargin only accepts CSS lengths supported by IntersectionObserver.
  rootMargin: '-80px 0px -55% 0px',
  threshold: [0.1, 0.5],
};

export function isValidIntersectionObserverMargin(rootMargin: string) {
  return rootMargin.trim().split(/\s+/).every((value) => /^-?(?:\d+(?:\.\d+)?)(?:px|%)$/.test(value));
}
