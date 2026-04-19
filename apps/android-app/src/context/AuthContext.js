import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAllTokens,
  getMe,
  persistAuth,
  readToken,
  writeToken,
  postSuperAdminImpersonate,
  postSuperAdminEndImpersonation,
} from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const signOut = useCallback(async () => {
    await clearAllTokens();
    setProfile(null);
    setAuthed(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const d = await getMe();
      setProfile(d);
      return d;
    } catch {
      await signOut();
      return null;
    }
  }, [signOut]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const t = await readToken();
      if (cancelled) return;
      setAuthed(Boolean(t));
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authed) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    getMe()
      .then((d) => {
        if (!cancelled) setProfile(d);
      })
      .catch(() => {
        if (!cancelled) signOut();
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed, signOut]);

  const signIn = useCallback(async (accessToken, refreshToken) => {
    await persistAuth(accessToken, refreshToken);
    setAuthed(true);
  }, []);

  const startImpersonation = useCallback(
    async (businessId) => {
      const data = await postSuperAdminImpersonate(businessId);
      if (!data?.access_token) throw new Error("No access token returned");
      await writeToken(data.access_token);
      return refreshProfile();
    },
    [refreshProfile]
  );

  const endImpersonation = useCallback(async () => {
    const data = await postSuperAdminEndImpersonation();
    if (!data?.access_token) throw new Error("Could not restore super admin session");
    await writeToken(data.access_token);
    return refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      ready,
      authed,
      profileLoading,
      profile,
      user: profile?.user,
      business: profile?.business,
      impersonating: Boolean(profile?.impersonating),
      signIn,
      signOut,
      refreshProfile,
      startImpersonation,
      endImpersonation,
    }),
    [ready, authed, profileLoading, profile, signIn, signOut, refreshProfile, startImpersonation, endImpersonation]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
