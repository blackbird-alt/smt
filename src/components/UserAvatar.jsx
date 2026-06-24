export default function UserAvatar({ name, photoURL, avatar = null, size = "md" }) {
  const label = name || "Learner";
  const initials = label
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // A chosen preset avatar wins over a photo, which wins over initials.
  if (avatar) {
    return (
      <span
        className={`avatar avatar-${size} avatar-preset`}
        style={{ background: avatar.gradient }}
        aria-label={`${label} avatar`}
      >
        <span className="avatar-emoji" aria-hidden="true">
          {avatar.emoji}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`avatar avatar-${size}`}
      aria-label={photoURL ? `${label} profile photo` : `${label} initials`}
    >
      {photoURL ? (
        <img src={photoURL} alt="" className="avatar-image" />
      ) : (
        initials
      )}
    </span>
  );
}
