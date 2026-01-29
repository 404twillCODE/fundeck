export const SOCKET_SERVER =
  process.env.NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER ||
  process.env.NEXT_PUBLIC_SOCKET_SERVER ||
  process.env.REACT_APP_SOCKET_SERVER ||
  "https://multiplayer-blackjack-7df9.onrender.com";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY;
