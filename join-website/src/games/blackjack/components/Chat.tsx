"use client";

import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { useGame } from "@/games/blackjack/contexts/GameContext";

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 400px;
`;

const MessagesContainer = styled.div`
  flex-grow: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: rgba(5, 6, 10, 0.5);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(5, 6, 10, 0.5);
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #38bdf8, #2ef2a2);
    border-radius: 4px;
  }
`;

const MessageBubble = styled.div<{ $type: string; $isMine?: boolean }>`
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 80%;
  word-wrap: break-word;

  ${(props) =>
    props.$type === "system" &&
    `
    align-self: center;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.2);
    color: #38bdf8;
    font-style: italic;
    font-size: 0.85rem;
    max-width: 100%;
    text-align: center;
    font-weight: 500;
  `}

  ${(props) =>
    props.$type === "message" &&
    `
    align-self: ${props.$isMine ? "flex-end" : "flex-start"};
    background: ${
      props.$isMine
        ? "linear-gradient(135deg, rgba(46, 242, 162, 0.2) 0%, rgba(56, 189, 248, 0.2) 100%)"
        : "rgba(255, 255, 255, 0.06)"
    };
    border: 1px solid ${
      props.$isMine ? "rgba(46, 242, 162, 0.4)" : "rgba(255, 255, 255, 0.12)"
    };
    color: white;
  `}
`;

const MessageSender = styled.div<{ $isMine?: boolean }>`
  font-weight: 700;
  font-size: 0.75rem;
  margin-bottom: 4px;
  color: ${(props) => (props.$isMine ? "#2ef2a2" : "#38bdf8")};
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const MessageTime = styled.span`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  margin-left: 8px;
`;

const InputContainer = styled.form`
  display: flex;
  padding: 12px;
  background: rgba(5, 6, 10, 0.8);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ChatInput = styled.input`
  flex-grow: 1;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background-color: rgba(5, 6, 10, 0.7);
  color: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(56, 189, 248, 0.8);
    box-shadow: 0 0 15px rgba(56, 189, 248, 0.2);
    background-color: rgba(5, 6, 10, 0.9);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const SendButton = styled.button`
  background: linear-gradient(135deg, #38bdf8 0%, #2ef2a2 100%);
  color: #05060a;
  border: none;
  border-radius: 8px;
  padding: 0 20px;
  margin-left: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 4px 15px rgba(56, 189, 248, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 20px rgba(46, 242, 162, 0.4);
    transform: translateY(-2px);
  }

  &:disabled {
    background: rgba(117, 117, 117, 0.5);
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function Chat() {
  const { messages, sendMessage, username } = useGame();
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageInput.trim()) return;
    sendMessage(messageInput);
    setMessageInput("");
  };

  return (
    <ChatContainer>
      <MessagesContainer>
        {messages.map((message, index) => (
          <MessageBubble key={index} $type={message.type} $isMine={message.sender === username}>
            {message.type === "message" && (
              <MessageSender $isMine={message.sender === username}>
                {message.sender}
                <MessageTime>{formatTime(message.timestamp)}</MessageTime>
              </MessageSender>
            )}
            {message.content}
          </MessageBubble>
        ))}
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer onSubmit={handleSubmit}>
        <ChatInput
          type="text"
          placeholder="Type a message..."
          value={messageInput}
          onChange={(event) => setMessageInput(event.target.value)}
        />
        <SendButton type="submit" disabled={!messageInput.trim()}>
          Send
        </SendButton>
      </InputContainer>
    </ChatContainer>
  );
}
