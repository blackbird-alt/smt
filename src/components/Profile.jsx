import { useState } from "react";
import course from "../content/course.json";
import {
  changePassword,
  deleteAccount,
  getProfileAvatar,
  getProfileDisplayName,
  getProfilePhotoUrl,
  isEmailPasswordUser,
  updateAvatar,
  updateDisplayName,
} from "../lib/account";
import { AVATAR_PRESETS } from "../lib/avatars";
import { getAuthErrorMessage, usernameFromEmail } from "../lib/auth";
import UserAvatar from "./UserAvatar";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";

const LESSON_IDS = course.lessons.map((lesson) => lesson.id);

export default function Profile({
  user,
  profile,
  onBack,
  onSignOut,
  onProfileUpdated,
  refreshUser,
}) {
  const [displayName, setDisplayName] = useState(
    getProfileDisplayName(user, profile),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const photoURL = getProfilePhotoUrl(user, profile);
  const avatar = getProfileAvatar(profile);
  const emailAccount = isEmailPasswordUser(user);
  const username = usernameFromEmail(user.email);

  async function handlePickAvatar(avatarId) {
    await runAction(async () => {
      await updateAvatar(avatarId);
      await onProfileUpdated();
      setMessage(avatarId ? "Avatar updated." : "Avatar reset.");
    });
  }

  function clearStatus() {
    setMessage("");
    setError("");
  }

  async function runAction(action) {
    clearStatus();
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveName() {
    await runAction(async () => {
      await updateDisplayName(displayName);
      await refreshUser();
      await onProfileUpdated();
      setMessage("Display name updated.");
    });
  }

  async function handleChangePassword() {
    await runAction(async () => {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Password updated.");
    });
  }

  async function handleDeleteAccount() {
    await runAction(async () => {
      await deleteAccount({
        password: deletePassword,
        lessonIds: LESSON_IDS,
      });
    });
  }

  return (
    <div className="screen profile-screen">
      <header className="profile-header">
        <div className="profile-header-top">
          <button
            type="button"
            className="btn-text btn-icon-text"
            onClick={onBack}
          >
            <Icon name="arrow-left" size={16} /> Course
          </button>
          <ThemeToggle />
        </div>
        <h1>Profile</h1>
      </header>

      <section className="profile-card">
        <div className="profile-avatar-row">
          <UserAvatar
            name={getProfileDisplayName(user, profile)}
            photoURL={photoURL}
            avatar={avatar}
            size="lg"
          />
          <div className="profile-avatar-blurb">
            <strong>{getProfileDisplayName(user, profile)}</strong>
            <p>Pick a vibe for your profile.</p>
          </div>
        </div>

        <div className="avatar-picker" role="group" aria-label="Choose an avatar">
          {AVATAR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`avatar-option ${
                avatar?.id === preset.id ? "avatar-option-selected" : ""
              }`}
              style={{ background: preset.gradient }}
              onClick={() => handlePickAvatar(preset.id)}
              disabled={busy}
              aria-label={`Use ${preset.id} avatar`}
              aria-pressed={avatar?.id === preset.id}
            >
              <span aria-hidden="true">{preset.emoji}</span>
            </button>
          ))}
        </div>
        {(avatar || photoURL) && (
          <button
            type="button"
            className="btn-text avatar-reset"
            onClick={() => handlePickAvatar(null)}
            disabled={busy}
          >
            Use my initials{photoURL ? " / photo" : ""}
          </button>
        )}

        <div className="profile-field">
          <label htmlFor="profile-name">Display name</label>
          <div className="profile-inline-form">
            <input
              id="profile-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveName}
              disabled={busy}
            >
              Save
            </button>
          </div>
        </div>

        <div className="profile-field">
          <label>{emailAccount ? "Username" : "Email"}</label>
          <p className="profile-readonly">
            {emailAccount
              ? username || getProfileDisplayName(user, profile)
              : user.email || "—"}
          </p>
        </div>
      </section>

      <section className="profile-card">
        <h2>Security</h2>
        {emailAccount ? (
          <>
            <p className="profile-help">Choose a new password.</p>
            <div className="profile-field">
              <label htmlFor="current-password">Current password</label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </div>
            <div className="profile-field">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleChangePassword}
              disabled={busy}
            >
              Update password
            </button>
          </>
        ) : (
          <p className="profile-help">
            You signed in with Google. Manage your password in your Google
            account settings.
          </p>
        )}
      </section>

      <section className="profile-card">
        <button
          type="button"
          className="btn btn-secondary profile-sign-out btn-icon-text"
          onClick={onSignOut}
          disabled={busy}
        >
          <Icon name="log-out" size={18} /> Sign out
        </button>
      </section>

      <section className="profile-card profile-danger">
        <h2>Delete account</h2>
        <p className="profile-help">
          Permanently delete your account and all lesson progress. This cannot
          be undone.
        </p>
        {!showDeleteConfirm ? (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={busy}
          >
            Delete account
          </button>
        ) : (
          <div className="profile-delete-confirm">
            {emailAccount && (
              <div className="profile-field">
                <label htmlFor="delete-password">Confirm your password</label>
                <input
                  id="delete-password"
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                />
              </div>
            )}
            {!emailAccount && (
              <p className="profile-help">
                You&apos;ll be asked to sign in with Google again to confirm.
              </p>
            )}
            <div className="profile-inline-form">
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteAccount}
                disabled={busy}
              >
                {busy ? "Deleting..." : "Yes, delete my account"}
              </button>
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword("");
                }}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {message && <p className="profile-message">{message}</p>}
      {error && <p className="login-error">{error}</p>}
    </div>
  );
}
