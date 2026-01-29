"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/games/blackjack/lib/supabase";

type AuthContextValue = {
  user: unknown;
  session: unknown;
  loading: boolean;
  balance: number;
  username: string;
  authEnabled: boolean;
  setBalance: (balance: number) => Promise<void> | void;
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
  const authEnabled = Boolean(supabase);

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
      if (data.session?.user) {
        loadUserBalance(data.session.user.id);
        loadUsername(data.session.user.id);
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
      if (currentSession?.user) {
        loadUserBalance(currentSession.user.id);
        loadUsername(currentSession.user.id);
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
        if (error.code !== "PGRST116" && error.code !== "42P01") {
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

  const loadUsername = async (userId: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code !== "PGRST116" && error.code !== "42P01") {
          console.error("Error loading username:", error);
        }
        return;
      }

      if (data?.username) {
        setUsername(data.username);
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

      if (error) {
        console.error("Error creating balance:", error);
      }
    } catch (error) {
      console.error("Error creating balance:", error);
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
        console.error("Error updating balance:", error);
      } else if (balanceToSave !== newBalance) {
        setBalance(balanceToSave);
      }
    } catch (error) {
      console.error("Error updating balance:", error);
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

        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            username: name,
            email,
          })
          .eq("user_id", data.user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          const { error: insertError } = await supabase
            .from("user_profiles")
            .insert({
              user_id: data.user.id,
              username: name,
              email,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Error inserting profile:", insertError);
          }
        }

        if (data.session) {
          setUsername(name);
          await loadUserBalance(data.user.id);
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

  const signIn = async (emailOrUsername: string, password: string) => {
    if (!supabase) {
      return {
        data: null,
        error: { message: "Supabase is not configured." },
      };
    }
    try {
      let emailToUse = emailOrUsername;

      if (!emailOrUsername.includes("@")) {
        const { data: emailData } = await supabase.rpc("get_email_by_username", {
          username_to_find: emailOrUsername,
        });

        if (!emailData || emailData.length === 0 || !emailData[0]?.email) {
          const { data: profileData, error: profileError } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("username", emailOrUsername)
            .maybeSingle();

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
        await loadUsername(data.user.id);
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
    } catch (error) {
      console.error("Error signing out:", error);
    }
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
    authEnabled,
    setBalance: updateBalance,
    signUp,
    signIn,
    signOut,
    continueAsGuest,
    isGuest: !user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
