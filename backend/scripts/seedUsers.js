import "dotenv/config";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import { connectDB } from "../src/config/db.js";

async function upsertSeedUser({ role, name, email, password }) {
  if (!email || !password) return;
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    console.log(`${role} account already exists: ${normalizedEmail} (password was not changed)`);
    return;
  }
  await User.create({ role, name: name || role, email: normalizedEmail, password });
  console.log(`Created ${role} account: ${normalizedEmail}`);
}

try {
  await connectDB();
  await upsertSeedUser({ role: "admin", name: process.env.SEED_ADMIN_NAME, email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD });
  await upsertSeedUser({ role: "guard", name: process.env.SEED_GUARD_NAME, email: process.env.SEED_GUARD_EMAIL, password: process.env.SEED_GUARD_PASSWORD });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
