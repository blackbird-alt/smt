// Unified input: keyboard + gamepad mapped to abstract actions.
// Actions: up, down, left, right, confirm, cancel, run, menu, skill, defend,
// inventory. Each frame, call input.update() to refresh edge-detection
// (justPressed).
//
// Key bindings are remappable and persisted to localStorage. Bindings are
// stored as action -> array of KeyboardEvent.code strings. The first code in
// an action's array is its PRIMARY key. User overrides are merged over the
// built-in defaults on startup. The gamepad mapping (PAD_MAP) is fixed.

const BINDS_KEY = "sunstone-binds-v1";

// Defaults equivalent to the original KEY_MAP, plus the new "inventory" action.
const DEFAULT_BINDS = {
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  confirm: ["KeyZ", "Enter", "Space"],
  cancel: ["KeyX", "Escape", "Backspace"],
  run: ["ShiftLeft", "ShiftRight"],
  menu: ["KeyC"],
  skill: ["KeyQ"],
  defend: ["KeyE"],
  inventory: ["KeyI"],
};

// Standard gamepad button indices -> actions (fixed, not user-rebindable).
const PAD_MAP = {
  12: "up",
  13: "down",
  14: "left",
  15: "right",
  0: "confirm", // A / cross
  1: "cancel", // B / circle
  2: "skill", // X / square
  3: "defend", // Y / triangle
  9: "menu", // start
  5: "run", // RB
  7: "run", // RT
  4: "inventory", // LB
};

const ACTIONS = [
  "up",
  "down",
  "left",
  "right",
  "confirm",
  "cancel",
  "run",
  "menu",
  "skill",
  "defend",
  "inventory",
];

// Human-readable labels for the settings UI.
const ACTION_LABELS = {
  up: "Up",
  down: "Down",
  left: "Left",
  right: "Right",
  confirm: "Confirm",
  cancel: "Cancel",
  run: "Run",
  menu: "Menu",
  skill: "Skill",
  defend: "Defend",
  inventory: "Inventory",
};

function cloneBinds(src) {
  const out = {};
  for (const a of ACTIONS) out[a] = (src[a] || []).slice();
  return out;
}

class Input {
  constructor() {
    this.down = {};
    this.prev = {};
    for (const a of ACTIONS) {
      this.down[a] = false;
      this.prev[a] = false;
    }
    this._keyDown = {}; // action -> bool (from keyboard)
    this._padDown = {};

    // The set of actions the user may remap from the settings UI.
    this.REBINDABLE = [
      "up",
      "down",
      "left",
      "right",
      "confirm",
      "cancel",
      "run",
      "menu",
      "inventory",
    ];

    this.binds = cloneBinds(DEFAULT_BINDS);
    this._loadBinds();
    this._rebuildLookup();

    // One-shot capture callback for rebinding (independent of action polling).
    this._capture = null;

    window.addEventListener("keydown", (e) => {
      // Capture mode: swallow the next key for rebinding and do NOT let it
      // trigger any game action.
      if (this._capture) {
        e.preventDefault();
        const cb = this._capture;
        this._capture = null;
        cb(e.code === "Escape" ? null : e.code);
        return;
      }
      const a = this._codeToAction[e.code];
      if (a) {
        this._keyDown[a] = true;
        // Prevent page scroll on arrows/space.
        if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => {
      const a = this._codeToAction[e.code];
      if (a) this._keyDown[a] = false;
    });
    window.addEventListener("blur", () => {
      this._keyDown = {};
      this._padDown = {};
    });
  }

  // ---- persistence -------------------------------------------------------

  _loadBinds() {
    try {
      const raw = localStorage.getItem(BINDS_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (stored && typeof stored === "object") {
        for (const a of ACTIONS) {
          if (Array.isArray(stored[a]) && stored[a].length) {
            this.binds[a] = stored[a].filter((c) => typeof c === "string");
          }
        }
      }
    } catch (e) {
      console.warn("Bindings load failed", e);
    }
  }

  _persist() {
    try {
      localStorage.setItem(BINDS_KEY, JSON.stringify(this.binds));
    } catch (e) {
      console.warn("Bindings save failed", e);
    }
  }

  _rebuildLookup() {
    this._codeToAction = {};
    for (const a of ACTIONS) {
      for (const code of this.binds[a] || []) this._codeToAction[code] = a;
    }
  }

  // ---- binding API (used by the settings UI) -----------------------------

  getBindings() {
    return cloneBinds(this.binds);
  }

  getKeysFor(action) {
    return (this.binds[action] || []).slice();
  }

  actionLabel(action) {
    return ACTION_LABELS[action] || action;
  }

  // Set the PRIMARY key for `action` to `code`, removing that code from any
  // other action to avoid duplicates, then persist.
  rebind(action, code) {
    if (!code || !this.binds[action]) return;
    for (const a of ACTIONS) {
      if (this.binds[a]) this.binds[a] = this.binds[a].filter((c) => c !== code);
    }
    this.binds[action].unshift(code);
    this._rebuildLookup();
    this._persist();
  }

  resetBindings() {
    this.binds = cloneBinds(DEFAULT_BINDS);
    this._rebuildLookup();
    this._persist();
  }

  // Register a one-shot keydown listener that resolves with the next pressed
  // code (or null if Escape / cancelled). Returns a cancel function. Capturing
  // is kept independent of normal action polling so it never fires actions.
  captureNext(cb) {
    this._capture = cb;
    return () => {
      if (this._capture === cb) this._capture = null;
    };
  }

  // ---- polling -----------------------------------------------------------

  _pollGamepad() {
    this._padDown = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      pad.buttons.forEach((b, i) => {
        if (b.pressed && PAD_MAP[i]) this._padDown[PAD_MAP[i]] = true;
      });
      // Analog stick -> dpad directions
      const [lx, ly] = [pad.axes[0] || 0, pad.axes[1] || 0];
      const dz = 0.4;
      if (lx < -dz) this._padDown.left = true;
      if (lx > dz) this._padDown.right = true;
      if (ly < -dz) this._padDown.up = true;
      if (ly > dz) this._padDown.down = true;
    }
  }

  update() {
    this._pollGamepad();
    for (const a of ACTIONS) {
      this.prev[a] = this.down[a];
      this.down[a] = !!(this._keyDown[a] || this._padDown[a]);
    }
  }

  isDown(a) {
    return this.down[a];
  }

  justPressed(a) {
    return this.down[a] && !this.prev[a];
  }

  // Returns -1,0,1 for each axis (no diagonal preference handled by caller).
  axis() {
    let x = 0;
    let y = 0;
    if (this.down.left) x -= 1;
    if (this.down.right) x += 1;
    if (this.down.up) y -= 1;
    if (this.down.down) y += 1;
    return { x, y };
  }
}

export const input = new Input();
