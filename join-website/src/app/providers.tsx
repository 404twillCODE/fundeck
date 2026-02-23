"use client";

import { AuthProvider } from "@/games/blackjack/contexts/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
