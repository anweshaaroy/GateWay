import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "../utils/audit.js";

const allowedDomains = ["@iitrpr.ac.in", "@campus.edu"];

function validInstitutionalEmail(email) {
  return allowedDomains.some((domain) => email.endsWith(domain));
}

function signToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random secret with at least 32 characters.");
  }
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

export const register = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = String(req.body.role || "").trim().toLowerCase();
  const entryNumber = String(req.body.entryNumber || "").trim().toUpperCase();
  const name = String(req.body.name || "").trim();

  if (!email || !password || !role) throw httpError(400, "Email, password, and resident role are required.");
  if (!validInstitutionalEmail(email)) throw httpError(400, `Only institutional addresses ending with ${allowedDomains.join(" or ")} are allowed.`);
  if (password.length < 8) throw httpError(400, "Password must contain at least 8 characters.");
  // Public registration cannot create admin or guard accounts.
  if (!["student", "faculty"].includes(role)) throw httpError(403, "Public registration is limited to Student and Faculty accounts.");
  if (role === "student" && !entryNumber) throw httpError(400, "Student entry / roll number is required.");
  if (await User.exists({ email })) throw httpError(409, "An account with this email already exists.");

  const user = await User.create({ name, email, password, role, entryNumber: role === "student" ? entryNumber : null });
  await writeAudit(req, { action: "USER_REGISTERED", message: `New ${role} account registered.`, metadata: { userId: String(user._id) } });
  res.status(201).json({ success: true, token: signToken(user), user: user.toSafeObject() });
});

export const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) throw httpError(400, "Email and password are required.");

  const user = await User.findOne({ email }).select("+password");
  if (!user || !user.isActive || !(await user.comparePassword(password))) throw httpError(401, "Invalid email or password.");

  req.user = user;
  await writeAudit(req, { action: "USER_LOGIN", message: "User signed in successfully." });
  res.json({ success: true, token: signToken(user), user: user.toSafeObject() });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});
