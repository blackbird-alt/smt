import { useCallback, useEffect, useState } from "react";
import {
  addFriendByUsername,
  getFriendsLeaderboard,
  getGlobalLeaderboard,
  removeFriend,
} from "../lib/social";
import { getAvatarPreset } from "../lib/avatars";
import Icon from "./Icon";
import UserAvatar from "./UserAvatar";

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderRow({ entry, rank, isSelf, onRemove }) {
  return (
    <li className={`leader-row ${isSelf ? "leader-row-self" : ""}`}>
      <span className="leader-rank">
        {rank <= 3 ? (
          <span className="leader-medal" aria-label={`Rank ${rank}`}>
            {MEDALS[rank - 1]}
          </span>
        ) : (
          rank
        )}
      </span>
      <UserAvatar
        name={entry.displayName}
        avatar={getAvatarPreset(entry.avatarId)}
        size="sm"
      />
      <span className="leader-identity">
        <strong className="leader-name">
          {entry.displayName || "Learner"}
          {isSelf && <span className="leader-you">You</span>}
        </strong>
        {entry.username && (
          <span className="leader-handle">@{entry.username}</span>
        )}
      </span>
      <span className="leader-stats">
        <span className="leader-xp">
          <Icon name="zap" size={13} />
          {entry.xp || 0}
        </span>
        <span className="leader-streak">
          <Icon name="flame" size={13} />
          {entry.streak || 0}
        </span>
      </span>
      {onRemove && !isSelf && (
        <button
          type="button"
          className="leader-remove"
          onClick={() => onRemove(entry)}
          aria-label={`Remove ${entry.displayName || entry.username}`}
          title="Remove friend"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </li>
  );
}

export default function Leaderboard({ user, onBack }) {
  const [tab, setTab] = useState("global");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [friendInput, setFriendInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMessage, setAddMessage] = useState("");
  const [addError, setAddError] = useState("");

  const load = useCallback(
    async (which) => {
      setLoading(true);
      setError("");
      try {
        const data =
          which === "friends"
            ? await getFriendsLeaderboard(user.uid)
            : await getGlobalLeaderboard(50);
        setRows(data);
      } catch {
        setError("Couldn't load the leaderboard. Try again.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [user.uid],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data =
          tab === "friends"
            ? await getFriendsLeaderboard(user.uid)
            : await getGlobalLeaderboard(50);
        if (!cancelled) setRows(data);
      } catch {
        if (!cancelled) {
          setError("Couldn't load the leaderboard. Try again.");
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, user.uid]);

  async function handleAddFriend(event) {
    event.preventDefault();
    setAddError("");
    setAddMessage("");
    const handle = friendInput.trim();
    if (!handle) return;

    setAdding(true);
    try {
      const friend = await addFriendByUsername(user.uid, handle);
      setFriendInput("");
      setAddMessage(`Added ${friend.displayName || friend.username}.`);
      await load("friends");
    } catch (err) {
      setAddError(err.message || "Couldn't add that friend.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(entry) {
    await removeFriend(user.uid, entry.uid);
    setRows((current) => current.filter((row) => row.uid !== entry.uid));
  }

  const friendCount =
    tab === "friends" ? Math.max(0, rows.length - 1) : null;

  return (
    <div className="screen leaderboard-screen">
      <header className="profile-header">
        <div className="profile-header-top">
          <button
            type="button"
            className="btn-text btn-icon-text"
            onClick={onBack}
          >
            <Icon name="arrow-left" size={16} /> Course
          </button>
        </div>
        <h1 className="leaderboard-title">
          <Icon name="trophy" size={24} /> Leaderboard
        </h1>
      </header>

      <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard scope">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "global"}
          className={`leaderboard-tab ${tab === "global" ? "leaderboard-tab-active" : ""}`}
          onClick={() => setTab("global")}
        >
          <Icon name="trophy" size={16} /> Global
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "friends"}
          className={`leaderboard-tab ${tab === "friends" ? "leaderboard-tab-active" : ""}`}
          onClick={() => setTab("friends")}
        >
          <Icon name="users" size={16} /> Friends
        </button>
      </div>

      {tab === "friends" && (
        <form className="add-friend" onSubmit={handleAddFriend}>
          <input
            type="text"
            className="add-friend-input"
            value={friendInput}
            onChange={(event) => {
              setFriendInput(event.target.value);
              setAddError("");
              setAddMessage("");
            }}
            placeholder="Add a friend by username"
            aria-label="Friend username"
          />
          <button
            type="submit"
            className="btn btn-primary btn-icon-text"
            disabled={adding || !friendInput.trim()}
          >
            <Icon name="user-plus" size={16} />
            {adding ? "Adding…" : "Add"}
          </button>
        </form>
      )}

      {addMessage && <p className="add-friend-message">{addMessage}</p>}
      {addError && <p className="add-friend-error">{addError}</p>}

      {loading ? (
        <div className="leaderboard-empty">Loading…</div>
      ) : error ? (
        <div className="leaderboard-empty">{error}</div>
      ) : rows.length === 0 || (tab === "friends" && friendCount === 0) ? (
        <div className="leaderboard-empty">
          {tab === "friends"
            ? "No friends yet — add someone by their username to compare XP."
            : "No learners on the board yet. Earn some XP to claim the top spot!"}
        </div>
      ) : (
        <ol className="leader-list">
          {rows.map((entry, index) => (
            <LeaderRow
              key={entry.uid}
              entry={entry}
              rank={index + 1}
              isSelf={entry.uid === user.uid}
              onRemove={tab === "friends" ? handleRemove : null}
            />
          ))}
        </ol>
      )}
    </div>
  );
}
