import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "../utils/audit.js";

const allowedDomains = ["@iitrpr.ac.in"];

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

  if (!email || !password || !role || !name) throw httpError(400, "Name, email, password, and resident role are required.");
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


/**
 * Verifies a Google Identity Services ID token on the server, then creates or
 * links a GateWay account and issues a GateWay-owned JWT. Client-supplied role
 * values are only considered when creating a new resident account.
 */
export const googleLogin = asyncHandler(async (req, res) => {
  const credential = String(req.body.credential || "").trim();
  const intent = String(req.body.mode || "login").trim().toLowerCase();
  const requestedRole = String(req.body.role || "").trim().toLowerCase();
  const entryNumber = String(req.body.entryNumber || "").trim().toUpperCase();

  if (!credential) throw httpError(400, "Google did not return an ID credential. Please try again.");
  if (!["login", "register"].includes(intent)) throw httpError(400, "Invalid Google sign-in mode.");
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId || googleClientId.startsWith("your-google-") || !googleClientId.endsWith(".apps.googleusercontent.com")) {
    throw httpError(503, "Google Sign-In is not configured on the server. Set GOOGLE_CLIENT_ID to your real Google OAuth Web Client ID in backend/.env.");
  }

  let googlePayload;
  try {
    const googleClient = new OAuth2Client(googleClientId);
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: googleClientId });
    googlePayload = ticket.getPayload();
  } catch {
    throw httpError(401, "Google could not verify this sign-in. Please try again.");
  }

  if (!googlePayload?.sub || !googlePayload.email || googlePayload.email_verified !== true) {
    throw httpError(401, "Use a Google account with a verified email address.");
  }

  const email = String(googlePayload.email).trim().toLowerCase();
  const hostedDomain = String(googlePayload.hd || "").trim().toLowerCase();
  // Require both the institutional email and Google's Workspace hosted-domain claim.
  // A client-side email suffix check alone is not an authentication control.
  if (!email.endsWith("@iitrpr.ac.in") || hostedDomain !== "iitrpr.ac.in") {
    throw httpError(403, "Use a verified IIT Ropar Google Workspace account ending in @iitrpr.ac.in.");
  }

  let user = await User.findOne({ googleId: googlePayload.sub });
  if (user) {
    if (user.email !== email) {
      throw httpError(409, "The email on this Google account has changed. Contact the GateWay administrator to update your account.");
    }
    if (intent === "register") {
      throw httpError(409, "This Google account is already registered. Switch to Sign in to continue.");
    }
    if (!user.isActive) throw httpError(403, "This GateWay account is disabled. Contact the administrator.");
    req.user = user;
    await writeAudit(req, { action: "GOOGLE_LOGIN", message: "User signed in with Google." });
    return res.json({ success: true, token: signToken(user), user: user.toSafeObject(), authProvider: "google" });
  }

  // A verified, institutional Google identity can be linked to an existing
  // password account by exact email match. The stored role is never overwritten.
  user = await User.findOne({ email }).select("+password");
  if (user) {
    if (user.googleId && user.googleId !== googlePayload.sub) {
      throw httpError(409, "This GateWay account is already linked to a different Google account.");
    }
    if (intent === "register") {
      throw httpError(409, "A GateWay account already exists for this email. Switch to Sign in to continue.");
    }
    if (!user.isActive) throw httpError(403, "This GateWay account is disabled. Contact the administrator.");
    user.googleId = googlePayload.sub;
    if (!user.name && googlePayload.name) user.name = String(googlePayload.name).slice(0, 100);
    await user.save();
    req.user = user;
    await writeAudit(req, { action: "GOOGLE_ACCOUNT_LINKED", message: "Existing account linked to a verified Google identity." });
    return res.json({ success: true, token: signToken(user), user: user.toSafeObject(), authProvider: "google", linked: true });
  }

  if (intent !== "register") {
    throw httpError(404, "No GateWay account is linked to this Google identity. Switch to Create resident account and choose Student or Faculty first.");
  }
  if (!["student", "faculty"].includes(requestedRole)) {
    throw httpError(403, "Google registration is limited to Student and Faculty accounts.");
  }
  if (requestedRole === "student" && !entryNumber) {
    throw httpError(400, "Student entry / roll number is required. Enter it before continuing with Google.");
  }

  user = await User.create({
    name: String(googlePayload.name || email.split("@")[0]).trim().slice(0, 100),
    email,
    googleId: googlePayload.sub,
    role: requestedRole,
    entryNumber: requestedRole === "student" ? entryNumber : null,
  });
  req.user = user;
  await writeAudit(req, { action: "USER_REGISTERED_GOOGLE", message: `New ${requestedRole} account registered with Google.`, metadata: { userId: String(user._id) } });
  return res.status(201).json({ success: true, token: signToken(user), user: user.toSafeObject(), authProvider: "google", created: true });
});
