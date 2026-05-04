import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  getUserByEmail,
  getUserById,
  checkUserExists,
  createUser,
  updateLastSeen,
} from "../db.js";

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// ── REGISTER ──────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (username.trim().length < 2) {
      return res.status(400).json({ error: "Username must be at least 2 characters" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Check duplicate
    const existing = await checkUserExists(email, username);
    if (existing) {
      const field = existing.email === email.toLowerCase().trim() ? "Email" : "Username";
      return res.status(409).json({ error: `${field} already taken` });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user in Supabase
    const user = await createUser({ username, email, passwordHash });
    const token = signToken(user.id);

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("Register error:", err.message);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Get user with password hash
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Compare password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Update last seen
    await updateLastSeen(user.id);

    const token = signToken(user.id);

    // Don't send password_hash to client
    const { password_hash, ...safeUser } = user;
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Login failed" });
  }
});

// ── ME (verify token + get user) ─────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getUserById(decoded.sub);

    if (!user) return res.status(401).json({ error: "User not found" });

    await updateLastSeen(user.id);
    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;