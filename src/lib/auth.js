import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";

// Firebase Authentication is email-based, so each username is mapped to a
// synthetic email under an internal domain. No mail is ever sent to these
// addresses — the username is the real credential the learner types.
const USERNAME_EMAIL_DOMAIN = "chancelab.local";
const USERNAME_SUFFIX = `@${USERNAME_EMAIL_DOMAIN}`;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

export function normalizeUsername(username) {
  return (username || "").trim();
}

export function isValidUsername(username) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function usernameToEmail(username) {
  return `${normalizeUsername(username).toLowerCase()}${USERNAME_SUFFIX}`;
}

export function usernameFromEmail(email) {
  if (!email || !email.endsWith(USERNAME_SUFFIX)) {
    return null;
  }
  return email.slice(0, -USERNAME_SUFFIX.length);
}

export async function signOutUser() {
  await signOut(auth);
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

export async function signInWithUsername(username, password) {
  await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
}

export async function signUpWithUsername(username, password) {
  const name = normalizeUsername(username);
  const credential = await createUserWithEmailAndPassword(
    auth,
    usernameToEmail(name),
    password,
  );
  await updateProfile(credential.user, { displayName: name });
}

export async function reloadAuthUser() {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  await user.reload();
  return auth.currentUser;
}

export function getAuthErrorMessage(error) {
  switch (error?.code) {
    case "auth/invalid-email":
      return "Usernames can only contain letters, numbers, and underscores.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect username or password.";
    case "auth/email-already-in-use":
      return "That username is already taken.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Try again in a few minutes.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/requires-recent-login":
      return "For security, sign out and sign in again, then retry.";
    default:
      return error?.message || "Something went wrong. Try again.";
  }
}
