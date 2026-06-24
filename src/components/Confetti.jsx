const COLORS = [
  "#6366f1",
  "#f59e0b",
  "#34d399",
  "#f87171",
  "#a5b4fc",
  "#fbbf24",
  "#22d3ee",
];

// Particles are generated once at module load (kept out of render so the
// component stays pure). Re-mount with a changing key to replay the burst.
const PIECES = Array.from({ length: 70 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 0.25,
  duration: 1.1 + Math.random() * 0.9,
  color: COLORS[i % COLORS.length],
  drift: `${(Math.random() - 0.5) * 240}px`,
  rot: `${Math.random() * 720 - 360}deg`,
  size: 6 + Math.random() * 7,
}));

export default function Confetti() {
  return (
    <div className="confetti-layer" aria-hidden="true">
      {PIECES.map((b) => (
        <span
          key={b.id}
          className="confetti-piece"
          style={{
            left: `${b.left}%`,
            background: b.color,
            width: `${b.size}px`,
            height: `${b.size * 0.6}px`,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.duration}s`,
            "--drift": b.drift,
            "--rot": b.rot,
          }}
        />
      ))}
    </div>
  );
}
