import Visitor from "../models/Visitor.js";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { createQrToken, createUniquePasscode, createUniqueVisitorId } from "../utils/createCodes.js";
import { writeAudit } from "../utils/audit.js";

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function fileInfo(file) {
  if (!file) return { name: "", url: null };
  return { name: file.originalname, url: `/documents/${encodeURIComponent(file.filename)}` };
}

function toClientVisitor(visitor) {
  if (!visitor) return visitor;
  const value = typeof visitor.toObject === "function" ? visitor.toObject() : { ...visitor };
  if (value.requester && typeof value.requester === "object" && value.requester._id) {
    value.requester = {
      id: String(value.requester._id),
      name: value.requester.name || "",
      email: value.requester.email || "",
      role: value.requester.role || "",
      entryNumber: value.requester.entryNumber || null,
    };
  }
  return value;
}

export const listVisitorsForCurrentUser = asyncHandler(async (req, res) => {
  const filter = ["admin", "guard"].includes(req.user.role) ? {} : { requester: req.user._id };
  const visitors = await Visitor.find(filter).populate("requester", "name email role entryNumber").sort({ createdAt: -1 }).limit(1000);
  res.json({ success: true, count: visitors.length, visitors: visitors.map(toClientVisitor) });
});

export const createVisitorRequest = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const idType = String(body.idType || "").trim();
  const rawIdNumber = String(body.idNumber || "").trim();
  const hostName = String(body.hostName || req.user.name || req.user.email).trim();
  const hostAddress = String(body.hostAddress || "").trim();
  const hostIdDocType = String(body.hostIdDocType || (req.user.role === "student" ? "Student College ID Card" : "Faculty Official ID")).trim();
  const purpose = String(body.purpose || "Personal / Guest").trim();
  const arrivalDate = String(body.arrivalDate || "").trim();
  const exitDate = String(body.exitDate || "").trim();

  if (!name || !email || !idType || !rawIdNumber || !hostName || !hostAddress || !hostIdDocType || !purpose || !arrivalDate || !exitDate) {
    throw httpError(400, "Complete all required visitor, host, purpose, and visit-date fields.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, "Enter a valid visitor email address.");
  if (idType === "Aadhaar Card" && rawIdNumber !== "[Aadhaar Redacted]" && !/^\d{12}$/.test(rawIdNumber)) {
    throw httpError(400, "Aadhaar number must contain exactly 12 digits.");
  }
  if (idType === "Passport" && !/^[A-Za-z]\d{7}$/.test(rawIdNumber)) throw httpError(400, "Passport number must contain one letter followed by seven digits.");
  if (!["Aadhaar Card", "Passport"].includes(idType)) throw httpError(400, "Unsupported identity document type.");
  if (!isDate(arrivalDate) || !isDate(exitDate)) throw httpError(400, "Visit dates must be valid dates in YYYY-MM-DD format.");
  if (exitDate < arrivalDate) throw httpError(400, "Departure date cannot be earlier than arrival date.");

  const visitorFile = req.files?.visitorFile?.[0];
  const hostFile = req.files?.hostFile?.[0];
  if (!visitorFile) throw httpError(400, "Upload the visitor ID proof.");
  if (!hostFile) throw httpError(400, "Upload the host ID proof.");
  const visitorProof = fileInfo(visitorFile);
  const hostProof = fileInfo(hostFile);
  const durationDays = Math.round((new Date(`${exitDate}T00:00:00Z`) - new Date(`${arrivalDate}T00:00:00Z`)) / 86400000) + 1;

  const visitor = await Visitor.create({
    id: await createUniqueVisitorId(),
    passcode: await createUniquePasscode(),
    qrToken: createQrToken(),
    requester: req.user._id,
    name,
    email,
    idType,
    idNumber: idType === "Aadhaar Card" ? "[Aadhaar Redacted]" : rawIdNumber.toUpperCase(),
    idDocName: visitorProof.name,
    idDocUrl: visitorProof.url,
    hostName,
    hostEmail: req.user.email,
    hostAddress,
    hostIdDocType,
    hostDocName: hostProof.name,
    hostDocUrl: hostProof.url,
    purpose,
    arrivalDate,
    exitDate,
    durationDays,
    approvalStatus: "Pending Approval",
    status: "Pending",
    requestTimestamp: new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    blacklisted: false,
    emailDeliveryStatus: "not_sent",
    visitHistory: [{ action: "REQUEST_CREATED", actor: req.user._id, notes: "Visitor pre-approval request submitted." }],
  });

  await writeAudit(req, { action: "VISITOR_REQUEST_CREATED", visitor, message: `Visitor request ${visitor.id} submitted.` });
  const pass = toClientVisitor(visitor);
  res.status(201).json({ success: true, message: "Visitor request submitted for approval.", visitor: pass, pass });
});

export const getVisitorRequest = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ id: req.params.id }).populate("requester", "name email role entryNumber");
  if (!visitor) throw httpError(404, "Visitor request not found.");
  const isOwner = String(visitor.requester?._id || visitor.requester) === String(req.user._id);
  const hasOperationsAccess = ["admin", "guard"].includes(req.user.role);
  if (!isOwner && !hasOperationsAccess) throw httpError(403, "You cannot view this visitor request.");
  res.json({ success: true, visitor: toClientVisitor(visitor) });
});

export async function canAccessDocument(req, filename) {
  if (["admin", "guard"].includes(req.user.role)) return true;
  return Boolean(await Visitor.exists({
    requester: req.user._id,
    $or: [{ idDocUrl: `/documents/${encodeURIComponent(filename)}` }, { hostDocUrl: `/documents/${encodeURIComponent(filename)}` }],
  }));
}

export async function getUserById(id) {
  return User.findById(id);
}
