// Supabase server-side configuration
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "YOUR_SUPABASE_URL";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "YOUR_SERVICE_ROLE_KEY";

let supabase = null;

if (
  SUPABASE_URL &&
  SUPABASE_SERVICE_KEY &&
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_SERVICE_KEY !== "YOUR_SERVICE_ROLE_KEY"
) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log("✅ Supabase client initialized for leaderboard");
} else {
  console.warn("⚠️ Supabase not configured. Leaderboard will use in-memory storage only.");
}

module.exports = {
  supabase,
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
};
