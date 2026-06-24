export function debounce(fn, delayMs) {
  let timer;
  let lastArgs;

  const debounced = (...args) => {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...lastArgs);
    }, delayMs);
  };

  // Run any pending call immediately (e.g. before navigating away).
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
      fn(...lastArgs);
    }
  };

  // Drop any pending call (e.g. when authoritative state is about to be saved).
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
  };

  return debounced;
}
