// Tiny dependency-free helper for miscellaneous persisted settings that don't
// belong to input.js (key bindings) or audio.js (audio toggles), which own
// their own persistence. Use this only for extra scalar/JSON-able preferences.
const KEY = "sunstone-settings-v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
    return true;
  } catch {
    return false;
  }
}

export const settings = {
  get(name, fallback = null) {
    const all = read();
    return name in all ? all[name] : fallback;
  },
  set(name, value) {
    const all = read();
    all[name] = value;
    return write(all);
  },
  all() {
    return read();
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
