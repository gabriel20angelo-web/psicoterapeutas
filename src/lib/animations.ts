export const EASE = [0.22, 1, 0.36, 1] as const;

export const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: EASE },
});

export const staggerChild = (index: number, baseDelay = 0.1) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: baseDelay + index * 0.06, duration: 0.6, ease: EASE },
});
