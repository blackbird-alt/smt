// Dependency-free state registry. Lives in its own module so state files can
// register at import time without a circular temporal-dead-zone on main.js.
export const states = {};
export function registerState(state) {
  states[state.name] = state;
}
