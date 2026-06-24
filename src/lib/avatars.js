// Fun preset profile avatars. Each is an emoji on a playful gradient, so no
// image upload / storage is needed — the chosen id is persisted on the profile.
export const AVATAR_PRESETS = [
  { id: "fox", emoji: "🦊", gradient: "linear-gradient(135deg, #fb923c, #f97316)" },
  { id: "owl", emoji: "🦉", gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)" },
  { id: "cat", emoji: "🐱", gradient: "linear-gradient(135deg, #f472b6, #ec4899)" },
  { id: "panda", emoji: "🐼", gradient: "linear-gradient(135deg, #94a3b8, #475569)" },
  { id: "frog", emoji: "🐸", gradient: "linear-gradient(135deg, #4ade80, #16a34a)" },
  { id: "penguin", emoji: "🐧", gradient: "linear-gradient(135deg, #38bdf8, #0284c7)" },
  { id: "unicorn", emoji: "🦄", gradient: "linear-gradient(135deg, #f0abfc, #a855f7)" },
  { id: "robot", emoji: "🤖", gradient: "linear-gradient(135deg, #5eead4, #0d9488)" },
  { id: "rocket", emoji: "🚀", gradient: "linear-gradient(135deg, #818cf8, #4f46e5)" },
  { id: "brain", emoji: "🧠", gradient: "linear-gradient(135deg, #fda4af, #fb7185)" },
  { id: "star", emoji: "⭐", gradient: "linear-gradient(135deg, #fcd34d, #f59e0b)" },
  { id: "dice", emoji: "🎲", gradient: "linear-gradient(135deg, #f87171, #dc2626)" },
  { id: "sigma", emoji: "Σ", gradient: "linear-gradient(135deg, #2dd4bf, #0891b2)" },
  { id: "pi", emoji: "π", gradient: "linear-gradient(135deg, #c084fc, #7c3aed)" },
  { id: "bell", emoji: "🔔", gradient: "linear-gradient(135deg, #fbbf24, #d97706)" },
  { id: "wizard", emoji: "🧙", gradient: "linear-gradient(135deg, #818cf8, #6366f1)" },
];

const AVATAR_BY_ID = Object.fromEntries(AVATAR_PRESETS.map((a) => [a.id, a]));

export function getAvatarPreset(avatarId) {
  if (!avatarId) return null;
  return AVATAR_BY_ID[avatarId] || null;
}
