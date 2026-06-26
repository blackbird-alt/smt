// LocalStorage save/load with three save slots. Persists player + story state
// plus a lightweight `meta` block so the slot-select screen can show each game's
// name / level / location / timestamp without loading the whole save.
const SLOTS = [1, 2, 3];
const KEY = (slot) => `sunstone-save-${slot}`;
const LEGACY_KEY = "sunstone-save-v1";

// The slot the live game reads/writes (set on new game / continue). Autosaves
// (checkpoints, inn, menu) target this slot.
let activeSlot = 1;

function read(slot) {
  try {
    const raw = localStorage.getItem(KEY(slot));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Load failed", e);
    return null;
  }
}

export const save = {
  slots: SLOTS,

  getActiveSlot() {
    return activeSlot;
  },
  setActiveSlot(slot) {
    if (SLOTS.includes(slot)) activeSlot = slot;
  },

  // One-time migration: fold the old single-key save into slot 1.
  migrateLegacy() {
    try {
      const old = localStorage.getItem(LEGACY_KEY);
      if (old && !localStorage.getItem(KEY(1))) localStorage.setItem(KEY(1), old);
      if (old) localStorage.removeItem(LEGACY_KEY);
    } catch {
      // ignore
    }
  },

  has(slot = activeSlot) {
    try {
      return !!localStorage.getItem(KEY(slot));
    } catch {
      return false;
    }
  },
  anyExists() {
    return SLOTS.some((s) => this.has(s));
  },
  // Slot with the newest timestamp (for quick "Continue"), or null.
  mostRecentSlot() {
    let best = null;
    let bestTs = -1;
    for (const s of SLOTS) {
      const d = read(s);
      if (!d) continue;
      const ts = (d.meta && d.meta.ts) || d.ts || 0;
      if (ts > bestTs) {
        bestTs = ts;
        best = s;
      }
    }
    return best;
  },
  // Lightweight summary for the slot-select screen, or null if the slot is empty.
  info(slot) {
    const d = read(slot);
    if (!d) return null;
    const m = d.meta || {};
    const p = d.player || {};
    return {
      slot,
      name: m.name || p.name || "Hero",
      level: m.level || p.level || 1,
      gold: m.gold ?? p.gold ?? 0,
      map: m.map || p.map || "town",
      locationName: m.locationName || m.map || p.map || "Unknown",
      ts: m.ts || d.ts || 0,
    };
  },

  save(data, slot = activeSlot) {
    try {
      localStorage.setItem(
        KEY(slot),
        JSON.stringify({ version: 2, ts: Date.now(), ...data }),
      );
      return true;
    } catch (e) {
      console.warn("Save failed", e);
      return false;
    }
  },
  load(slot = activeSlot) {
    return read(slot);
  },
  clear(slot = activeSlot) {
    try {
      localStorage.removeItem(KEY(slot));
    } catch {
      // ignore
    }
  },
};
