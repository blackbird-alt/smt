// "Sig" — Brillyant's friendly stats mascot. A rounded character (with a little
// sigma on its belly) drawn as themeable inline SVG, so it ships with zero image
// assets and recolors automatically in light/dark mode. The `mood` prop swaps the
// eyes/mouth so Sig can idle, cheer, think, or react to a miss.
const MOODS = {
  idle: { eyes: "open", mouth: "smile" },
  happy: { eyes: "happy", mouth: "grin" },
  celebrate: { eyes: "happy", mouth: "open" },
  thinking: { eyes: "look", mouth: "flat" },
  oops: { eyes: "worried", mouth: "small" },
  wave: { eyes: "open", mouth: "grin" },
};

function Eyes({ kind }) {
  if (kind === "happy") {
    return (
      <>
        <path d="M30 41c1.6-2.4 5.4-2.4 7 0" className="mascot-eye-happy" />
        <path d="M51 41c1.6-2.4 5.4-2.4 7 0" className="mascot-eye-happy" />
      </>
    );
  }
  if (kind === "worried") {
    return (
      <>
        <circle cx="33.5" cy="42" r="3.4" className="mascot-eye" />
        <circle cx="54.5" cy="42" r="3.4" className="mascot-eye" />
        <path d="M29 36l8 2.5M59 36l-8 2.5" className="mascot-brow" />
      </>
    );
  }
  if (kind === "look") {
    return (
      <>
        <circle cx="35" cy="42" r="3.6" className="mascot-eye" />
        <circle cx="56" cy="42" r="3.6" className="mascot-eye" />
      </>
    );
  }
  return (
    <>
      <circle cx="33.5" cy="42" r="3.8" className="mascot-eye" />
      <circle cx="54.5" cy="42" r="3.8" className="mascot-eye" />
      <circle cx="34.8" cy="40.8" r="1.2" className="mascot-eye-glint" />
      <circle cx="55.8" cy="40.8" r="1.2" className="mascot-eye-glint" />
    </>
  );
}

function Mouth({ kind }) {
  if (kind === "grin") {
    return <path d="M37 51c3.4 4 12.6 4 16 0" className="mascot-mouth" />;
  }
  if (kind === "open") {
    return <ellipse cx="45" cy="53" rx="6" ry="7" className="mascot-mouth-open" />;
  }
  if (kind === "flat") {
    return <path d="M39 53h12" className="mascot-mouth" />;
  }
  if (kind === "small") {
    return <circle cx="45" cy="54" r="3" className="mascot-mouth-open" />;
  }
  return <path d="M39 52c2.4 3 9.6 3 12 0" className="mascot-mouth" />;
}

export default function Mascot({ mood = "idle", size = 96, className = "", animate = true }) {
  const face = MOODS[mood] || MOODS.idle;
  const animClass = animate ? `mascot-anim-${mood}` : "";

  return (
    <svg
      className={`mascot ${animClass} ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 90 96"
      role="img"
      aria-label="Sig, the Brillyant mascot"
    >
      {mood === "celebrate" && (
        <g className="mascot-sparkles" aria-hidden="true">
          <path d="M14 20l1.6 4.4L20 26l-4.4 1.6L14 32l-1.6-4.4L8 26l4.4-1.6z" />
          <path d="M76 14l1.3 3.7L81 19l-3.7 1.3L76 24l-1.3-3.7L71 19l3.7-1.3z" />
          <path d="M78 50l1 2.8 2.8 1-2.8 1-1 2.8-1-2.8-2.8-1 2.8-1z" />
        </g>
      )}

      {/* little feet */}
      <ellipse cx="34" cy="88" rx="7" ry="4" className="mascot-foot" />
      <ellipse cx="56" cy="88" rx="7" ry="4" className="mascot-foot" />

      {/* body */}
      <g className="mascot-body-group">
        <rect x="14" y="20" width="62" height="68" rx="31" className="mascot-body" />
        {/* ear tufts */}
        <path d="M26 22c-3-9-1-14 3-15 3 3 4 9 3 15z" className="mascot-ear" />
        <path d="M64 22c3-9 1-14-3-15-3 3-4 9-3 15z" className="mascot-ear" />
        {/* belly + sigma */}
        <ellipse cx="45" cy="62" rx="20" ry="19" className="mascot-belly" />
        <text x="45" y="70" className="mascot-sigma" textAnchor="middle">
          σ
        </text>
        {/* face */}
        <Eyes kind={face.eyes} />
        <Mouth kind={face.mouth} />
        {/* cheeks */}
        <circle cx="27" cy="50" r="3.2" className="mascot-cheek" />
        <circle cx="63" cy="50" r="3.2" className="mascot-cheek" />
      </g>
    </svg>
  );
}

// Mascot paired with a speech bubble — used as the dashboard greeter.
export function MascotGreeter({ mood = "wave", message, size = 84 }) {
  return (
    <div className="mascot-greeter">
      <Mascot mood={mood} size={size} />
      {message && (
        <div className="mascot-bubble" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
