// Procedural audio via WebAudio. SFX synthesized on demand; music is a small
// looping sequencer. No audio files needed.

const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  R: 0,
};

const AUDIO_KEY = "sunstone-audio-v1";

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.muted = false;
    // Separate, persisted toggles for music and sfx (master mute is distinct).
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this._music = null;
    this._musicTimer = null;
    this._curTrack = null;
    this._loadSettings();
  }

  // ---- persisted settings ------------------------------------------------

  _loadSettings() {
    try {
      const raw = localStorage.getItem(AUDIO_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s && typeof s === "object") {
        if (typeof s.musicEnabled === "boolean") this.musicEnabled = s.musicEnabled;
        if (typeof s.sfxEnabled === "boolean") this.sfxEnabled = s.sfxEnabled;
        // `muted` (master) is intentionally NOT restored: music is controlled by
        // musicEnabled and sfx by sfxEnabled, so a stale master-mute can't
        // silently disable everything on startup.
      }
    } catch (e) {
      console.warn("Audio settings load failed", e);
    }
  }

  _persist() {
    try {
      localStorage.setItem(
        AUDIO_KEY,
        JSON.stringify({
          musicEnabled: this.musicEnabled,
          sfxEnabled: this.sfxEnabled,
          muted: this.muted,
        }),
      );
    } catch (e) {
      console.warn("Audio settings save failed", e);
    }
  }

  setMusicEnabled(b) {
    this.musicEnabled = !!b;
    this._persist();
    if (!this.musicEnabled) this.stopMusic();
    return this.musicEnabled;
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  setSfxEnabled(b) {
    this.sfxEnabled = !!b;
    this._persist();
    return this.sfxEnabled;
  }

  isSfxEnabled() {
    return this.sfxEnabled;
  }

  isMuted() {
    return this.muted;
  }

  _ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      // Honor the persisted master-mute state on startup.
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.32;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      this.sfxGain.connect(this.master);
    } catch (e) {
      this.enabled = false;
    }
  }

  resume() {
    this._ensure();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    this._persist();
    return this.muted;
  }

  _tone(freq, t0, dur, type = "square", vol = 0.3, dest = null) {
    if (!this.ctx || !freq) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  _slide(f0, f1, t0, dur, type = "sawtooth", vol = 0.3) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  _noise(t0, dur, vol = 0.3, hp = 400) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  sfx(name) {
    if (!this.sfxEnabled) return;
    this._ensure();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case "cursor":
        this._tone(660, t, 0.05, "square", 0.18);
        break;
      case "confirm":
        this._tone(523, t, 0.06, "square", 0.25);
        this._tone(784, t + 0.05, 0.08, "square", 0.25);
        break;
      case "cancel":
        this._tone(330, t, 0.07, "square", 0.2);
        this._tone(220, t + 0.05, 0.08, "square", 0.2);
        break;
      case "hit":
        this._noise(t, 0.12, 0.35, 600);
        this._slide(300, 90, t, 0.14, "square", 0.25);
        break;
      case "crit":
        this._noise(t, 0.18, 0.5, 500);
        this._slide(500, 80, t, 0.22, "sawtooth", 0.3);
        this._tone(1040, t, 0.08, "square", 0.2);
        break;
      case "enemyhit":
        this._noise(t, 0.1, 0.3, 800);
        this._slide(240, 100, t, 0.12, "square", 0.2);
        break;
      case "magic":
        this._slide(400, 1200, t, 0.25, "sine", 0.25);
        this._tone(880, t + 0.1, 0.2, "triangle", 0.18);
        break;
      case "fire":
        this._noise(t, 0.3, 0.35, 200);
        this._slide(220, 60, t, 0.3, "sawtooth", 0.25);
        break;
      case "heal":
        this._tone(523, t, 0.12, "sine", 0.22);
        this._tone(659, t + 0.08, 0.12, "sine", 0.22);
        this._tone(784, t + 0.16, 0.18, "sine", 0.22);
        break;
      case "levelup":
        [523, 659, 784, 1047].forEach((f, i) =>
          this._tone(f, t + i * 0.09, 0.18, "square", 0.25),
        );
        break;
      case "powerup":
        [440, 587, 740, 880, 1175].forEach((f, i) =>
          this._tone(f, t + i * 0.06, 0.16, "triangle", 0.22),
        );
        break;
      case "coin":
        this._tone(988, t, 0.05, "square", 0.2);
        this._tone(1319, t + 0.04, 0.1, "square", 0.2);
        break;
      case "open":
      case "door":
        this._noise(t, 0.2, 0.25, 300);
        this._slide(180, 90, t, 0.2, "square", 0.18);
        break;
      case "step":
        this._noise(t, 0.04, 0.08, 1200);
        break;
      case "death":
        this._slide(440, 60, t, 0.5, "sawtooth", 0.3);
        this._noise(t, 0.4, 0.2, 200);
        break;
      case "flee":
        this._slide(300, 900, t, 0.3, "square", 0.2);
        break;
      case "error":
        this._tone(140, t, 0.15, "square", 0.25);
        break;
      case "select":
        this._tone(784, t, 0.06, "square", 0.2);
        break;
      case "encounter":
        this._slide(200, 800, t, 0.18, "sawtooth", 0.3);
        this._slide(800, 200, t + 0.18, 0.18, "sawtooth", 0.3);
        break;
      case "boss":
        this._slide(120, 60, t, 0.6, "sawtooth", 0.35);
        this._noise(t, 0.6, 0.25, 100);
        break;
      default:
        break;
    }
  }

  // ---- Music: simple looping melodies per track. ----
  _tracks() {
    const m = (s) => s.split(" ").map((n) => NOTE[n] ?? 0);
    return {
      title: {
        tempo: 0.36,
        lead: m("C4 E4 G4 C5 B4 G4 E4 G4 A4 F4 D4 F4 G4 R C4 R"),
        bass: m("C3 R G3 R A3 R F3 R"),
        wave: "triangle",
      },
      town: {
        tempo: 0.3,
        lead: m("G4 A4 B4 G4 C5 B4 A4 G4 E4 G4 D4 E4 C4 R R R"),
        bass: m("C3 R E3 R F3 R G3 R"),
        wave: "triangle",
      },
      forest: {
        tempo: 0.34,
        lead: m("A4 C5 E5 D5 C5 A4 G4 A4 F4 A4 C5 B4 A4 R R R"),
        bass: m("A3 R F3 R G3 R E3 R"),
        wave: "sine",
      },
      dungeon: {
        tempo: 0.4,
        lead: m("D4 R F4 R E4 D4 C4 R D4 R A3 R D4 R R R"),
        bass: m("D3 R D3 R C3 R C3 R"),
        wave: "square",
      },
      battle: {
        tempo: 0.2,
        lead: m("E4 E4 E5 E4 D5 C5 B4 G4 A4 A4 A5 A4 G5 F5 E5 R"),
        bass: m("A3 A3 E3 E3 F3 F3 G3 G3"),
        wave: "square",
      },
      boss: {
        tempo: 0.19,
        lead: m("C4 C4 D4 Eb4 C4 R G3 R C4 D4 Eb4 F4 G4 R R R"),
        bass: m("C3 C3 C3 G3 Ab3 Ab3 G3 R"),
        wave: "sawtooth",
      },
      victory: {
        tempo: 0.16,
        lead: m("C5 C5 C5 C5 Ab4 Bb4 C5 R Bb4 C5 R R R R R R"),
        bass: m("C3 R G3 R C3 R C3 R"),
        wave: "triangle",
        once: true,
      },
    };
  }

  playMusic(name) {
    if (!this.musicEnabled) {
      this.stopMusic();
      return;
    }
    this._ensure();
    if (!this.ctx) return;
    if (this._curTrack === name) return;
    this.stopMusic();
    const tracks = this._tracks();
    // allow 'Eb4'/'Ab3'/'Bb4' aliases
    NOTE.Eb4 = 311.13;
    NOTE.Ab3 = 207.65;
    NOTE.Ab4 = 415.3;
    NOTE.Bb4 = 466.16;
    const track = tracks[name];
    if (!track) return;
    this._curTrack = name;
    let step = 0;
    const stepDur = track.tempo;
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.02;
      const lead = track.lead[step % track.lead.length];
      const bass = track.bass[step % track.bass.length];
      if (lead) this._tone(lead, t, stepDur * 0.9, track.wave, 0.16, this.musicGain);
      if (bass) this._tone(bass, t, stepDur * 1.6, "triangle", 0.14, this.musicGain);
      step++;
      if (track.once && step >= track.lead.length) {
        this.stopMusic();
        return;
      }
    };
    tick();
    this._musicTimer = setInterval(tick, stepDur * 1000);
  }

  stopMusic() {
    if (this._musicTimer) clearInterval(this._musicTimer);
    this._musicTimer = null;
    this._curTrack = null;
  }
}

export const audio = new AudioEngine();
