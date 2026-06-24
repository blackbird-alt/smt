import {
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { deleteUserData, updateUserProfile } from "./profile";
import { getAvatarPreset } from "./avatars";

export function isEmailPasswordUser(user) {
  return user?.providerData?.some(
    (provider) => provider.providerId === "password",
  );
}

export function getProfilePhotoUrl(user, profile) {
  return user?.photoURL || profile?.photoURL || null;
}

// A user's explicitly-chosen preset avatar (takes priority over a photo URL).
export function getProfileAvatar(profile) {
  return getAvatarPreset(profile?.avatarId);
}

export async function updateAvatar(avatarId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  await updateUserProfile(user.uid, { avatarId: avatarId || null });
}

export function getProfileDisplayName(user, profile) {
  return profile?.displayName || user?.displayName || "Learner";
}

export async function updateDisplayName(displayName) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  const trimmed = displayName.trim();
  if (!trimmed) throw new Error("Enter a display name.");

  await updateProfile(user, { displayName: trimmed });
  await updateUserProfile(user.uid, { displayName: trimmed });
}

export async function changePassword(currentPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  if (!isEmailPasswordUser(user)) {
    throw new Error("Password changes aren't available for this account.");
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters.");
  }

  await reauthenticate(currentPassword);
  await updatePassword(user, newPassword);
}

async function reauthenticate(password) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  if (isEmailPasswordUser(user)) {
    if (!password) {
      throw new Error("Enter your password to confirm.");
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    return;
  }

  await reauthenticateWithPopup(user, googleProvider);
}

export async function deleteAccount({ password, lessonIds }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");

  await reauthenticate(password);
  await deleteUserData(user.uid, lessonIds);
  await deleteUser(user);
}
