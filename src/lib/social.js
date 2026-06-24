import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { usernameFromEmail } from "./auth";

// ---- Public profile mirror -------------------------------------------------
// A small, world-readable copy of a learner's public stats, so leaderboards and
// friend lookups don't need access to the private users/{uid} document.

function publicProfileRef(uid) {
  return doc(db, "publicProfiles", uid);
}

// A stable, lowercase handle others can use to add this learner as a friend.
export function deriveUsername(user) {
  const fromEmail = usernameFromEmail(user?.email);
  if (fromEmail) return fromEmail.toLowerCase();
  if (user?.email) return user.email.split("@")[0].toLowerCase();
  const slug = (user?.displayName || "learner")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "")
    .slice(0, 20);
  return slug || "learner";
}

export async function writePublicProfile(uid, fields) {
  await setDoc(
    publicProfileRef(uid),
    { ...fields, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

export async function deletePublicProfile(uid) {
  await deleteDoc(publicProfileRef(uid));
}

// ---- Leaderboards ----------------------------------------------------------

export async function getGlobalLeaderboard(max = 50) {
  const topQuery = query(
    collection(db, "publicProfiles"),
    orderBy("xp", "desc"),
    limit(max),
  );
  const snapshot = await getDocs(topQuery);
  return snapshot.docs.map((entry) => ({ uid: entry.id, ...entry.data() }));
}

function friendsCollection(uid) {
  return collection(db, "users", uid, "friends");
}

function friendDoc(uid, friendUid) {
  return doc(db, "users", uid, "friends", friendUid);
}

export async function getFriendUids(uid) {
  const snapshot = await getDocs(friendsCollection(uid));
  return snapshot.docs.map((entry) => entry.id);
}

export async function getFriendsLeaderboard(uid) {
  const friendUids = await getFriendUids(uid);
  const uids = Array.from(new Set([uid, ...friendUids]));

  const entries = await Promise.all(
    uids.map(async (id) => {
      const snapshot = await getDoc(publicProfileRef(id));
      return snapshot.exists() ? { uid: id, ...snapshot.data() } : null;
    }),
  );

  return entries
    .filter(Boolean)
    .sort((a, b) => (b.xp || 0) - (a.xp || 0));
}

// ---- Friends ---------------------------------------------------------------

export async function findUserByUsername(username) {
  const handle = (username || "").trim().toLowerCase();
  if (!handle) return null;

  const lookup = query(
    collection(db, "publicProfiles"),
    where("username", "==", handle),
    limit(1),
  );
  const snapshot = await getDocs(lookup);
  if (snapshot.empty) return null;

  const entry = snapshot.docs[0];
  return { uid: entry.id, ...entry.data() };
}

export async function addFriendByUsername(myUid, username) {
  const target = await findUserByUsername(username);
  if (!target) {
    throw new Error("No learner found with that username.");
  }
  if (target.uid === myUid) {
    throw new Error("You can't add yourself as a friend.");
  }

  await setDoc(friendDoc(myUid, target.uid), { addedAt: serverTimestamp() });
  return target;
}

export async function removeFriend(myUid, friendUid) {
  await deleteDoc(friendDoc(myUid, friendUid));
}
