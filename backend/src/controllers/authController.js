import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "../utils/audit.js";

const googleClient = new OAuth2Client();
const residentRoles = new Set(["student", "faculty", "official"]);

function normalizedEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function signToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must be set to a random secret with at least 32 characters.");
  }
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function getPrivilegedRole(email) {
  const adminEmail = normalizedEmail(process.env.GOOGLE_ADMIN_EMAIL || "admin@iitrpr.ac.in");
  const guardEmail = normalizedEmail(process.env.GOOGLE_GUARD_EMAIL || "guard@iitrpr.ac.in");
  if (email === adminEmail) return "admin";
  if (email === guardEmail) return "guard";
  return null;
}

function isAllowedInstitutionalEmail(email, hostedDomain) {
  const allowedDomains = String(process.env.ALLOWED_INSTITUTIONAL_DOMAINS || "iitrpr.ac.in,campus.edu")
    .split(",").map((item) => item.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
  const domain = email.split("@").pop();
  if (!allowedDomains.includes(domain)) return false;
  const requireHd = String(process.env.REQUIRE_WORKSPACE_HOSTED_DOMAIN || "true").toLowerCase() !== "false";
  if (requireHd && String(hostedDomain || "").toLowerCase() !== domain) return false;
  return true;
}

async function logRejectedLogin(req, email, reason) {
  try {
    await AuditLog.create({
      action: "GOOGLE_LOGIN_REJECTED",
      message: "Google sign-in was not authorized for GateWay.",
      metadata: { email: email || "unknown", reason },
      ip: req.ip || "",
      userAgent: req.get("user-agent") || "",
    });
  } catch (error) {
    console.error("Could not record rejected Google login audit:", error.message);
  }
}

export const googleLogin = asyncHandler(async (req, res) => {
  const credential = String(req.body.token || req.body.credential || "").trim();
  const audience = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  if (!audience) throw httpError(503, "Google authentication is not configured on the backend.");
  if (!credential) throw httpError(400, "Google ID token is required.");

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
    payload = ticket.getPayload();
  } catch {
    await logRejectedLogin(req, "unknown", "Invalid Google ID token");
    throw httpError(401, "Google identity token could not be verified. Please sign in again.");
  }

  const email = normalizedEmail(payload?.email);
  if (!email || payload?.email_verified !== true || !payload?.sub) {
    await logRejectedLogin(req, email, "Missing verified Google email or subject");
    throw httpError(401, "Google must provide a verified email address.");
  }

  const privilegedRole = getPrivilegedRole(email);
  const selectedRole = String(req.body.selectedRole || "resident").trim().toLowerCase();
  const requestedResidentRole = String(req.body.residentType || "student").trim().toLowerCase();
  const entryNumber = String(req.body.entryNumber || "").trim().toUpperCase();

  // Privileged roles come only from server-side email mappings; never trust the role dropdown.
  let assignedRole = privilegedRole;
  if (!assignedRole) {
    if (selectedRole !== "resident") {
      await logRejectedLogin(req, email, "Attempted to select privileged portal without server mapping");
      throw httpError(403, "This Google account is not configured for the Admin or Guard portal.");
    }
    if (!isAllowedInstitutionalEmail(email, payload?.hd)) {
      await logRejectedLogin(req, email, "Email is not an allowed institutional Workspace identity");
      throw httpError(403, "Use a verified Google Workspace account from an allowed institution.");
    }
    if (!residentRoles.has(requestedResidentRole)) throw httpError(400, "Select Student, Faculty, or Official as the resident category.");
    if (requestedResidentRole === "student" && !entryNumber) throw httpError(400, "Student entry / roll number is required.");
    assignedRole = requestedResidentRole;
  }

  let user = await User.findOne({ email });
  let isFirstLogin = false;
  if (user && !user.isActive) throw httpError(403, "This GateWay account has been disabled. Contact the campus administrator.");

  if (user && user.googleId && user.googleId !== payload.sub) {
    await logRejectedLogin(req, email, "Google subject does not match the linked account");
    throw httpError(409, "This email is linked to a different Google identity. Contact the administrator.");
  }

  if (!user) {
    isFirstLogin = true;
    user = new User({
      name: String(payload.name || email.split("@")[0]).trim().slice(0, 120),
      email,
      googleId: payload.sub,
      role: assignedRole,
      residentType: residentRoles.has(assignedRole) ? assignedRole : null,
      entryNumber: assignedRole === "student" ? entryNumber : null,
      isActive: true,
    });
  } else {
    user.googleId = payload.sub;
    if (payload.name) user.name = String(payload.name).trim().slice(0, 120);
    // Always re-apply privileged role mappings from server config. Existing resident roles are not
    // changed by a role dropdown selection at login.
    if (privilegedRole) {
      user.role = privilegedRole;
      user.residentType = null;
      user.entryNumber = null;
    } else if (!residentRoles.has(user.role)) {
      throw httpError(403, "This account is not eligible for the resident portal.");
    }
  }
  user.lastLoginAt = new Date();
  await user.save();

  req.user = user;
  await writeAudit(req, {
    action: isFirstLogin ? "GOOGLE_USER_CREATED" : "GOOGLE_LOGIN",
    message: isFirstLogin ? `Created ${user.role} account using verified Google identity.` : "User signed in using verified Google identity.",
    metadata: { email, role: user.role, isFirstLogin },
  });

  res.json({ success: true, token: signToken(user), user: user.toSafeObject() });
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toSafeObject() });
});
