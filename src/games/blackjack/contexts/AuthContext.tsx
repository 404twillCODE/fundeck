"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/games/blackjack/lib/supabase";

type AuthContextValue = {
  user: unknown;
  session: unknown;
  loading: boolean;
  balance: number;
  username: string;
  email: string | null;
  authEnabled: boolean;
  setBalance: (balance: number) => Promise<void> | void;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ data: unknown; error: unknown; requiresConfirmation?: boolean }>;
  signIn: (
    emailOrUsername: string,
    password: string,
  ) => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<void>;
  updateUsername: (nextUsername: string) => Promise<{ error: string | null }>;
  updateEmail: (nextEmail: string) => Promise<{ error: string | null }>;
  updatePassword: (nextPassword: string) => Promise<{ error: string | null }>;
  continueAsGuest: () => void;
  isGuest: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<unknown>(null);
  const [session, setSession] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(1000);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const authEnabled = Boolean(supabase);

  const isMissingTableError = (error: unknown) => {
    const code = (error as { code?: string })?.code;
    const message = (error as { message?: string })?.message;
    return (
      code === "42P01" ||
      code === "PGRST205" ||
      (typeof message === "string" && message.includes("Could not find the table"))
    );
  };

  const getUserEmail = (currentUser: unknown) =>
    (currentUser as { email?: string } | null)?.email ?? null;

  const getMetadataUsername = (currentUser: unknown) => {
    const raw = (currentUser as { user_metadata?: { username?: string } } | null)
      ?.user_metadata?.username;
    return typeof raw === "string" ? raw.trim() : "";
  };

  const generateGuestUsername = () => {
    const randomNum = Math.floor(Math.random() * 10000);
    return `guest${randomNum}`;
  };

  useEffect(() => {
    if (!supabase) {
      const storedGuest = sessionStorage.getItem("guestUsername");
      const guestUsername = storedGuest || generateGuestUsername();
      sessionStorage.setItem("guestUsername", guestUsername);
      setUsername(guestUsername);
      setBalance(1000);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        setLoading(false);
        return;
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setEmail(getUserEmail(data.session?.user ?? null));
      if (data.session?.user) {
        loadUserBalance(data.session.user.id);
        loadUsername(data.session.user.id, data.session.user);
      } else {
        const guestMode = sessionStorage.getItem("guestMode");
        if (guestMode === "true") {
          const guestUsername = generateGuestUsername();
          setUsername(guestUsername);
          setBalance(1000);
        }
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setEmail(getUserEmail(currentSession?.user ?? null));
      if (currentSession?.user) {
        loadUserBalance(currentSession.user.id);
        loadUsername(currentSession.user.id, currentSession.user);
        sessionStorage.removeItem("guestMode");
      } else {
        const guestMode = sessionStorage.getItem("guestMode");
        if (guestMode === "true") {
          const guestUsername = generateGuestUsername();
          setUsername(guestUsername);
          setBalance(1000);
        } else {
          setUsername("");
          setBalance(1000);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserBalance = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("user_balances")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code !== "PGRST116" && !isMissingTableError(error)) {
          console.error("Error loading balance:", error);
        }
        setBalance(1000);
        return;
      }

      if (data && data.balance !== undefined && data.balance !== null) {
        setBalance(data.balance > 0 ? data.balance : 1000);
      } else {
        await createUserBalance(userId, 1000);
        setBalance(1000);
      }
    } catch (error) {
      console.error("Error loading balance:", error);
      setBalance(1000);
    }
  };

  const loadUsername = async (userId: string, currentUser?: unknown) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code !== "PGRST116" && !isMissingTableError(error)) {
          console.error("Error loading username:", error);
        }
        const fallbackUsername = getMetadataUsername(currentUser ?? user);
        if (fallbackUsername) {
          setUsername(fallbackUsername);
        }
        return;
      }

      if (data?.username) {
        setUsername(data.username);
      } else {
        const fallbackUsername = getMetadataUsername(currentUser ?? user);
        if (fallbackUsername) {
          setUsername(fallbackUsername);
        }
      }
    } catch (error) {
      console.error("Error loading username:", error);
    }
  };

  const createUserBalance = async (userId: string, initialBalance = 1000) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from("user_balances").insert({
        user_id: userId,
        balance: initialBalance,
        updated_at: new Date().toISOString(),
      });

      if (error && !isMissingTableError(error)) {
        console.error("Error creating balance:", error);
      }
    } catch (error) {
      if (!isMissingTableError(error)) {
        console.error("Error creating balance:", error);
      }
    }
  };

  const updateBalance = async (newBalance: number) => {
    setBalance(newBalance);

    if (!supabase || !user) {
      return;
    }

    try {
      const balanceToSave = newBalance > 0 ? newBalance : 1000;

      const { error } = await supabase
        .from("user_balances")
        .upsert(
          {
            user_id: (user as { id: string }).id,
            balance: balanceToSave,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        );

      if (error) {
        if (!isMissingTableError(error)) {
          console.error("Error updating balance:", error);
        }
      } else if (balanceToSave !== newBalance) {
        setBalance(balanceToSave);
      }
    } catch (error) {
      if (!isMissingTableError(error)) {
        console.error("Error updating balance:", error);
      }
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    if (!supabase) {
      return {
        data: null,
        error: { message: "Supabase is not configured." },
      };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: name,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      if (data.user) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (data.session) {
          const { error: profileError } = await supabase
            .from("user_profiles")
            .upsert(
              {
                user_id: data.user.id,
                username: name,
                email,
                created_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );

          if (profileError && !isMissingTableError(profileError)) {
            console.error("Error upserting profile:", profileError);
          }
        }

        if (data.session) {
          setUsername(name);
          await loadUserBalance(data.user.id);
          await loadUsername(data.user.id, data.user);
        } else {
          return {
            data,
            error: null,
            requiresConfirmation: true,
          };
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const sendPasswordReset = async (targetEmail: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured." };
    }
    const trimmed = targetEmail.trim();
    if (!trimmed) {
      return { error: "Email is required." };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: window.location.origin,
    });
    if (error) {
      return { error: error.message || "Unable to send reset email." };
    }
    return { error: null };
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    if (!supabase) {
      return {
        data: null,
        error: { message: "Supabase is not configured." },
      };
    }
    try {
      let emailToUse = emailOrUsername;
      let usernameCandidate = "";

      if (!emailOrUsername.includes("@")) {
        usernameCandidate = emailOrUsername.trim();
        const { data: emailData, error: rpcError } = await supabase.rpc(
          "get_email_by_username",
          {
            username_to_find: emailOrUsername,
          },
        );

        if (rpcError && isMissingTableError(rpcError)) {
          return {
            data: null,
            error: {
              message: "Username sign-in is unavailable. Please use your email.",
            },
          };
        }

        if (!emailData || emailData.length === 0 || !emailData[0]?.email) {
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("username", emailOrUsername)
            .maybeSingle();

          if (profileError) {
            if (isMissingTableError(profileError)) {
              return {
                data: null,
                error: {
                  message: "Username sign-in is unavailable. Please use your email.",
                },
              };
            }
          }

          if (profileError || !profileData?.email) {
            return {
              data: null,
              error: { message: "Invalid username or password" },
            };
          }

          emailToUse = profileData.email;
        } else {
          emailToUse = emailData[0].email;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await loadUserBalance(data.user.id);
        await loadUsername(data.user.id, data.user);
        const metadataUsername = getMetadataUsername(data.user);
        const finalUsername = usernameCandidate || metadataUsername;

        if (finalUsername) {
          setUsername(finalUsername);
          const { error: profileError } = await supabase
            .from("user_profiles")
            .upsert(
              {
                user_id: data.user.id,
                username: finalUsername,
                email: emailToUse,
                created_at: new Date().toISOString(),
              },
              { onConflict: "user_id" },
            );

          if (profileError && !isMissingTableError(profileError)) {
            console.error("Error upserting profile:", profileError);
          }
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      sessionStorage.removeItem("guestMode");
      setUsername("");
      setBalance(1000);
      setEmail(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const updateUsername = async (nextUsername: string) => {
    if (!supabase || !user) {
      return { error: "You must be signed in to update your username." };
    }

    const trimmed = nextUsername.trim();
    if (!trimmed) {
      return { error: "Username cannot be empty." };
    }

    const userEmail = getUserEmail(user);

    const { error: authError } = await supabase.auth.updateUser({
      data: { username: trimmed },
    });

    if (authError && !isMissingTableError(authError)) {
      return { error: authError.message || "Unable to update username." };
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: (user as { id: string }).id,
          username: trimmed,
          email: userEmail ?? undefined,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (profileError && !isMissingTableError(profileError)) {
      return { error: profileError.message || "Unable to update username." };
    }

    setUsername(trimmed);
    return { error: null };
  };

  const updateEmail = async (nextEmail: string) => {
    if (!supabase || !user) {
      return { error: "You must be signed in to update your email." };
    }

    const trimmed = nextEmail.trim();
    if (!trimmed) {
      return { error: "Email cannot be empty." };
    }

    const { error } = await supabase.auth.updateUser({ email: trimmed });
    if (error) {
      return { error: error.message || "Unable to update email." };
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: (user as { id: string }).id,
          username,
          email: trimmed,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (profileError && !isMissingTableError(profileError)) {
      return { error: profileError.message || "Unable to update email." };
    }

    setEmail(trimmed);
    return { error: null };
  };

  const updatePassword = async (nextPassword: string) => {
    if (!supabase || !user) {
      return { error: "You must be signed in to update your password." };
    }

    if (!nextPassword || nextPassword.length < 6) {
      return { error: "Password must be at least 6 characters." };
    }

    const { error } = await supabase.auth.updateUser({ password: nextPassword });
    if (error) {
      return { error: error.message || "Unable to update password." };
    }

    return { error: null };
  };

  const continueAsGuest = () => {
    const guestUsername = generateGuestUsername();
    setUsername(guestUsername);
    setBalance(1000);
    sessionStorage.setItem("guestMode", "true");
    sessionStorage.setItem("guestUsername", guestUsername);
  };

  const value: AuthContextValue = {
    user,
    session,
    loading,
    balance,
    username,
    email,
    authEnabled,
    setBalance: updateBalance,
    sendPasswordReset,
    signUp,
    signIn,
    signOut,
    updateUsername,
    updateEmail,
    updatePassword,
    continueAsGuest,
    isGuest: !user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
