"use client";

import React, { useState } from "react";
import styled from "styled-components";

import { useAuth } from "@/games/blackjack/contexts/AuthContext";
import { useGame } from "@/games/blackjack/contexts/GameContext";

const JoinContainer = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  padding: 36px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(5, 6, 10, 0.55);
  backdrop-filter: blur(16px);
`;

const Title = styled.h2`
  color: #38bdf8;
  text-align: center;
  margin-bottom: 24px;
  font-size: 1.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Input = styled.input`
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background-color: rgba(5, 6, 10, 0.7);
  color: white;
  font-size: 0.95rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(46, 242, 162, 0.8);
    box-shadow: 0 0 15px rgba(46, 242, 162, 0.2);
    background-color: rgba(5, 6, 10, 0.9);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 10px;
`;

const Button = styled.button`
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.16em;

  &:hover {
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const CreateButton = styled(Button)`
  background: linear-gradient(90deg, #38bdf8, #2ef2a2);
  color: #05060a;
  box-shadow: 0 8px 20px rgba(56, 189, 248, 0.25);

  &:hover:not(:disabled) {
    box-shadow: 0 12px 24px rgba(46, 242, 162, 0.35);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const JoinButton = styled(Button)`
  background: rgba(255, 255, 255, 0.08);
  color: #a78bfa;
  border: 1px solid rgba(167, 139, 250, 0.5);
  font-weight: 700;

  &:hover:not(:disabled) {
    border-color: rgba(167, 139, 250, 0.9);
    box-shadow: 0 6px 20px rgba(167, 139, 250, 0.25);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #fb7185;
  text-align: center;
  margin-top: 10px;
  font-size: 0.85rem;
`;

export default function JoinRoom() {
  const { username } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { createRoom, joinRoom, error, connected } = useGame();

  const handleCreateRoom = (event: React.FormEvent) => {
    event.preventDefault();
    createRoom();
  };

  const handleJoinRoom = (event: React.FormEvent) => {
    event.preventDefault();

    if (!roomCode.trim()) {
      setLocalError("Please enter a room code");
      return;
    }

    joinRoom(roomCode.toUpperCase());
  };

  return (
    <JoinContainer>
      <Title>Join the table</Title>
      <Form>
        <div
          style={{
            padding: "14px",
            background: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: "10px",
            textAlign: "center",
            color: "#38bdf8",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            fontSize: "0.75rem",
          }}
        >
          Playing as: {username}
        </div>

        <InputGroup>
          <Label htmlFor="roomCode">Room Code</Label>
          <Input
            id="roomCode"
            type="text"
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            placeholder="Enter room code to join"
            maxLength={6}
          />
        </InputGroup>

        <ButtonGroup>
          <CreateButton onClick={handleCreateRoom} disabled={!connected}>
            Create New Room
          </CreateButton>
          <JoinButton onClick={handleJoinRoom} disabled={!connected}>
            Join Room
          </JoinButton>
        </ButtonGroup>

        {(localError || error) && <ErrorMessage>{localError || error}</ErrorMessage>}
      </Form>
    </JoinContainer>
  );
}
