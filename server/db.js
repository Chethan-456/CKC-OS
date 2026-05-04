import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default supabase;

const PALETTE = [
  { hex: "#4FC1FF", bg: "rgba(79,193,255,.22)" },
  { hex: "#FF6B9D", bg: "rgba(255,107,157,.22)" },
  { hex: "#4EC9B0", bg: "rgba(78,201,176,.22)" },
  { hex: "#CE9178", bg: "rgba(206,145,120,.22)" },
  { hex: "#DCDCAA", bg: "rgba(220,220,170,.22)" },
  { hex: "#C586C0", bg: "rgba(197,134,192,.22)" },
];

function getInitials(username) {
  return username
    .split(" ")
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

// ── Get user count to assign palette color ────────────────────
export async function getNextColor() {
  const { count } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });
  return PALETTE[(count || 0) % PALETTE.length];
}

// ── Get user by ID (for WebSocket auth) ──────────────────────
export async function getUserById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, color, initials, created_at")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data;
}

// ── Get user by email (for login) ────────────────────────────
export async function getUserByEmail(email) {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, email, color, initials, password_hash, created_at")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  return data;
}

// ── Check if username or email already exists ─────────────────
export async function checkUserExists(email, username) {
  const { data } = await supabase
    .from("users")
    .select("id, email, username")
    .or(`email.eq.${email.toLowerCase().trim()},username.eq.${username.trim()}`)
    .limit(1);

  return data?.[0] || null;
}

// ── Create new user ───────────────────────────────────────────
export async function createUser({ username, email, passwordHash }) {
  const color = await getNextColor();
  const initials = getInitials(username);

  const { data, error } = await supabase
    .from("users")
    .insert({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      color,
      initials,
    })
    .select("id, username, email, color, initials, created_at")
    .single();

  if (error) throw error;
  return data;
}

// ── Update last_seen ──────────────────────────────────────────
export async function updateLastSeen(id) {
  await supabase
    .from("users")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", id);
}