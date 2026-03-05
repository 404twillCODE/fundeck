"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  loading: boolean;
  user: boolean;
  username: string;
  setUsername: (name: string) => void;
};

const STORAGE_KEY = "fundeck:displayName";

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [username, setUsernameState] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) || "";
    setUsernameState(stored);
    setLoading(false);
  }, []);

  const setUsername = useCallback((name: string) => {
    const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 24);
    setUsernameState(trimmed);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      user: !!username,
      username,
      setUsername,
    }),
    [loading, username, setUsername],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
