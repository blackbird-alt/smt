// Tracks the current Firebase auth user.
// Returns { user, loading }: user is null when signed out, loading is true until
// Firebase has reported the initial auth state.
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { reloadAuthUser } from "../lib/auth";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, bumpAuth] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const refreshUser = useCallback(async () => {
    const refreshed = await reloadAuthUser();
    setUser(refreshed);
    // reload() mutates the existing User instance in place, so its reference is
    // unchanged and setUser alone won't re-render. Bump a counter to force it.
    bumpAuth((current) => current + 1);
    return refreshed;
  }, []);

  return { user, loading, refreshUser };
}
