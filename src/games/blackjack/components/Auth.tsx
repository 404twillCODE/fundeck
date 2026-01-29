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
  padding: 40px 20px;
`;

const AuthCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  padding: 40px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(5, 6, 10, 0.6);
  backdrop-filter: blur(18px);
`;

const Title = styled.h1`
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 10px;
  color: white;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 30px;
  font-size: 1rem;
`;

const Tabs = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Tab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: ${(props) => (props.$active ? "#38BDF8" : "rgba(255, 255, 255, 0.45)")};
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  cursor: pointer;
  border-bottom: 2px solid ${(props) => (props.$active ? "rgba(56, 189, 248, 0.8)" : "transparent")};
  transition: all 0.3s ease;

  &:hover {
    color: #38bdf8;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Input = styled.input`
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgba(5, 6, 10, 0.6);
  color: white;
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.8);
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.25);
    background-color: rgba(5, 6, 10, 0.85);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
`;

const Button = styled.button`
  padding: 14px 28px;
  border-radius: 12px;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 30px rgba(5, 6, 10, 0.45);

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
    box-shadow: 0 12px 30px rgba(56, 189, 248, 0.3);
  }
`;

const GuestButton = styled(Button)`
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.15);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    border-color: rgba(46, 242, 162, 0.6);
  }
`;

const ErrorMessage = styled.div`
  color: #f87171;
  text-align: center;
  padding: 10px;
  background: rgba(248, 113, 113, 0.1);
  border: 1px solid rgba(248, 113, 113, 0.3);
  border-radius: 8px;
  font-size: 0.9rem;
`;

const Divider = styled.div`
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: rgba(255, 255, 255, 0.4);

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

type AuthProps = {
  onAuthComplete?: () => void;
};

export default function Auth({ onAuthComplete }: AuthProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, continueAsGuest, authEnabled } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
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

  const handleGuest = () => {
    continueAsGuest();
    onAuthComplete?.();
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
            <GradientText>Blackjack Lounge</GradientText>
          </Title>
          <Subtitle>Sign in to keep your balance, or jump in as a guest.</Subtitle>

          {!authEnabled ? (
            <>
              <Subtitle>Supabase isn&apos;t configured yet, guest mode only.</Subtitle>
              <GuestButton onClick={handleGuest}>Continue as Guest</GuestButton>
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
                {error && <ErrorMessage>{error}</ErrorMessage>}
                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? "Loading..." : mode === "signup" ? "Sign Up" : "Sign In"}
                </PrimaryButton>
              </Form>

              <Divider>OR</Divider>

              <GuestButton onClick={handleGuest} disabled={loading}>
                Continue as Guest
              </GuestButton>
            </>
          )}
        </AuthCard>
      </motion.div>
    </AuthContainer>
  );
}
