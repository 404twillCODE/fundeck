"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import styled from "styled-components";

import GradientText from "@/components/GradientText";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

const AuthContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 48px 20px;
`;

const AuthCard = styled.div`
  position: relative;
  background: linear-gradient(180deg, rgba(12, 16, 26, 0.9), rgba(8, 10, 16, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 22px;
  padding: 36px 34px;
  max-width: 440px;
  width: 100%;
  box-shadow:
    0 24px 60px rgba(5, 6, 10, 0.7),
    0 0 40px rgba(56, 189, 248, 0.08);
  backdrop-filter: blur(20px);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(140deg, rgba(56, 189, 248, 0.4), rgba(167, 139, 250, 0.25), rgba(46, 242, 162, 0.25));
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }
`;

const Title = styled.h1`
  text-align: center;
  font-size: 2.1rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin-bottom: 8px;
  color: white;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 26px;
  font-size: 0.98rem;
  line-height: 1.5;
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 26px;
  padding: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const Tab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 10px 12px;
  background: ${(props) => (props.$active ? "rgba(255, 255, 255, 0.12)" : "transparent")};
  border-radius: 999px;
  border: none;
  color: ${(props) => (props.$active ? "#E5F6FF" : "rgba(255, 255, 255, 0.45)")};
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: all 0.25s ease;

  &:hover {
    color: white;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const HelperRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const LinkButton = styled.button<{ disabled?: boolean }>`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s ease;

  &:disabled {
    cursor: not-allowed;
    color: rgba(255, 255, 255, 0.35);
  }

  &:hover {
    color: white;
  }
`;

const Input = styled.input`
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background-color: rgba(6, 8, 12, 0.7);
  color: white;
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.6);
    box-shadow: 0 0 18px rgba(56, 189, 248, 0.25);
    background-color: rgba(6, 8, 12, 0.95);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
`;

const Button = styled.button`
  padding: 14px 18px;
  border-radius: 14px;
  border: none;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 12px 30px rgba(5, 6, 10, 0.5);
  width: 100%;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PrimaryButton = styled(Button)`
  background: linear-gradient(90deg, #38bdf8, #2ef2a2, #a78bfa);
  color: #05060a;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 14px 36px rgba(56, 189, 248, 0.35);
  }
`;

const GuestButton = styled(Button)`
  background: rgba(255, 255, 255, 0.06);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.18);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: rgba(56, 189, 248, 0.6);
    box-shadow: 0 10px 28px rgba(56, 189, 248, 0.2);
  }
`;

const ErrorMessage = styled.div`
  color: #f87171;
  text-align: center;
  padding: 10px 12px;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 10px;
  font-size: 0.88rem;
`;

const WarningMessage = styled.div`
  color: #fbbf24;
  text-align: center;
  padding: 10px 12px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-radius: 10px;
  font-size: 0.88rem;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 18px 0;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.7rem;
  letter-spacing: 0.35em;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.12);
  }

  &::before {
    margin-right: 10px;
  }

  &::after {
    margin-left: 10px;
  }
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

type AuthProps = {
  onAuthComplete?: () => void;
  title?: string;
  subtitle?: string;
  guestWarning?: string;
};

export default function Auth({
  onAuthComplete,
  title = "FunDeck Account",
  subtitle = "Sign in to keep your progress, or jump in as a guest.",
  guestWarning = "Guest sessions are temporary. Without an account, your progress and balance will not be saved.",
}: AuthProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const { signIn, signUp, continueAsGuest, authEnabled, sendPasswordReset } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!username.trim()) {
          setError("Username is required");
          setLoading(false);
          return;
        }
        const { error: signUpError, requiresConfirmation } = await signUp(
          email,
          password,
          username,
        );
        if (signUpError) {
          setError((signUpError as { message?: string }).message || "Unable to sign up.");
        } else if (requiresConfirmation) {
          setError("Please check your email to confirm your account before signing in.");
        } else {
          onAuthComplete?.();
        }
      } else {
        const { error: signInError } = await signIn(emailOrUsername, password);
        if (signInError) {
          setError((signInError as { message?: string }).message || "Unable to sign in.");
        } else {
          onAuthComplete?.();
        }
      }
    } catch (err) {
      setError((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const triggerGuestWarning = () => {
    setShowGuestWarning(true);
  };

  const handleGuestConfirm = () => {
    continueAsGuest();
    setShowGuestWarning(false);
    onAuthComplete?.();
  };

  const handleGuestCancel = () => {
    setShowGuestWarning(false);
  };

  const handlePasswordReset = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    const targetEmail = emailOrUsername.includes("@") ? emailOrUsername : email;
    const result = await sendPasswordReset(targetEmail);
    if (result.error) {
      setError(result.error);
    } else {
      setInfo("Password reset email sent. Check your inbox.");
    }
    setLoading(false);
  };

  return (
    <AuthContainer>
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 140, damping: 18 }}
      >
        <AuthCard>
          <Title>
            <GradientText>{title}</GradientText>
          </Title>
          <Subtitle>{subtitle}</Subtitle>

          {!authEnabled ? (
            <>
              <Subtitle>Supabase isn&apos;t configured yet, guest mode only.</Subtitle>
              {showGuestWarning ? (
                <Stack>
                  <WarningMessage>{guestWarning}</WarningMessage>
                  <PrimaryButton type="button" onClick={handleGuestConfirm}>
                    Continue as Guest
                  </PrimaryButton>
                  <GuestButton type="button" onClick={handleGuestCancel}>
                    Go Back
                  </GuestButton>
                </Stack>
              ) : (
                <GuestButton type="button" onClick={triggerGuestWarning}>
                  Continue as Guest
                </GuestButton>
              )}
            </>
          ) : (
            <>
              <Tabs>
                <Tab $active={mode === "signin"} onClick={() => setMode("signin")}>
                  Sign In
                </Tab>
                <Tab $active={mode === "signup"} onClick={() => setMode("signup")}>
                  Sign Up
                </Tab>
              </Tabs>

              <Form onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />
                )}
                {mode === "signin" ? (
                  <Input
                    type="text"
                    placeholder="Email or Username"
                    value={emailOrUsername}
                    onChange={(event) => setEmailOrUsername(event.target.value)}
                    required
                  />
                ) : (
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                )}
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                />
                {mode === "signin" ? (
                  <HelperRow>
                    <LinkButton type="button" onClick={handlePasswordReset} disabled={loading}>
                      Forgot Password
                    </LinkButton>
                  </HelperRow>
                ) : null}
                {error && <ErrorMessage>{error}</ErrorMessage>}
                {info && <WarningMessage>{info}</WarningMessage>}
                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? "Loading..." : mode === "signup" ? "Sign Up" : "Sign In"}
                </PrimaryButton>
              </Form>

              <Divider>OR</Divider>

              {showGuestWarning ? (
                <Stack>
                  <WarningMessage>{guestWarning}</WarningMessage>
                  <PrimaryButton type="button" onClick={handleGuestConfirm} disabled={loading}>
                    Continue as Guest
                  </PrimaryButton>
                  <GuestButton type="button" onClick={handleGuestCancel} disabled={loading}>
                    Go Back
                  </GuestButton>
                </Stack>
              ) : (
                <GuestButton type="button" onClick={triggerGuestWarning} disabled={loading}>
                  Continue as Guest
                </GuestButton>
              )}
            </>
          )}
        </AuthCard>
      </motion.div>
    </AuthContainer>
  );
}
