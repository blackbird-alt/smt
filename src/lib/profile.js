import { deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { deletePublicProfile, writePublicProfile } from "./social";

function userRef(uid) {
  return doc(db, "users", uid);
}

function progressRef(uid, lessonId) {
  return doc(db, "users", uid, "progress", lessonId);
}

export async function updateUserProfile(uid, fields) {
  await setDoc(
    userRef(uid),
    {
      ...fields,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  // Keep the public mirror in sync for the fields that show on leaderboards.
  const publicFields = {};
  if ("displayName" in fields) publicFields.displayName = fields.displayName;
  if ("avatarId" in fields) publicFields.avatarId = fields.avatarId;
  if (Object.keys(publicFields).length > 0) {
    await writePublicProfile(uid, publicFields);
  }
}

export async function deleteUserData(uid, lessonIds) {
  await Promise.all(
    lessonIds.map((lessonId) => deleteDoc(progressRef(uid, lessonId))),
  );
  await deletePublicProfile(uid);
  await deleteDoc(userRef(uid));
}
