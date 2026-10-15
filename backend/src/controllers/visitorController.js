import Visitor from "../models/Visitor.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { createUniquePasscode, createUniqueVisitorId } from "../utils/createCodes.js";
import { writeAudit } from "../utils/audit.js";

function dateIsValid(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function fileInfo(file) {
  if (!file) return { name: "", url: null };
  return { name: file.originalname, url: `/uploads/${file.filename}` };
}

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

  if (!name || !email || !idType || !rawIdNumber || !hostName || !hostAddress || !purpose || !arrivalDate || !exitDate) {
    throw httpError(400, "Complete all required visitor, host, purpose, and visit-date fields.");
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, "Enter a valid visitor email address.");
  if (idType === "Aadhaar Card" && !/^\d{12}$/.test(rawIdNumber)) throw httpError(400, "Aadhaar number must contain exactly 12 digits.");
  if (idType === "Passport" && !/^[A-Za-z]\d{7}$/.test(rawIdNumber)) throw httpError(400, "Passport number must contain one letter followed by seven digits.");
  if (!["Aadhaar Card", "Passport"].includes(idType)) throw httpError(400, "Unsupported identity document type.");
  if (!dateIsValid(arrivalDate) || !dateIsValid(exitDate)) throw httpError(400, "Visit dates must be valid dates in YYYY-MM-DD format.");
  if (exitDate < arrivalDate) throw httpError(400, "Departure date cannot be earlier than arrival date.");

  const visitorFile = req.files?.visitorDocument?.[0];
  const hostFile = req.files?.hostDocument?.[0];
  const visitorProof = fileInfo(visitorFile);
  const hostProof = fileInfo(hostFile);
  const durationDays = Math.round((new Date(`${exitDate}T00:00:00Z`) - new Date(`${arrivalDate}T00:00:00Z`)) / 86400000) + 1;

  const visitor = await Visitor.create({
    id: await createUniqueVisitorId(),
    passcode: await createUniquePasscode(),
    requester: req.user._id,
    name,
    email,
    idType,
    idNumber: idType === "Aadhaar Card" ? "[Aadhaar Redacted]" : rawIdNumber.toUpperCase(),
    idDocName: visitorProof.name || "visitor_proof.pdf",
    idDocUrl: visitorProof.url,
    hostName,
    hostEmail: req.user.email,
    hostAddress,
    hostIdDocType,
    hostDocName: hostProof.name || "host_id.jpg",
    hostDocUrl: hostProof.url,
    purpose,
    arrivalDate,
    exitDate,
    durationDays,
    approvalStatus: "Pending Approval",
    status: "Pending",
    requestTimestamp: new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    blacklisted: false,
    visitHistory: [{ action: "REQUEST_CREATED", actor: req.user._id, notes: "Visitor pre-approval request submitted." }],
  });

  await writeAudit(req, { action: "VISITOR_REQUEST_CREATED", visitor, message: `Visitor request ${visitor.id} submitted.` });
  res.status(201).json({ success: true, message: "Visitor request submitted for approval.", visitor });
});

export const getMyVisitorRequests = asyncHandler(async (req, res) => {
  const visitors = await Visitor.find({ requester: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, count: visitors.length, visitors });
});

export const getVisitorRequest = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ id: req.params.id });
  if (!visitor) throw httpError(404, "Visitor request not found.");
  const isOwner = String(visitor.requester) === String(req.user._id);
  const hasOperationsAccess = ["admin", "guard"].includes(req.user.role);
  if (!isOwner && !hasOperationsAccess) throw httpError(403, "You cannot view this visitor request.");
  res.json({ success: true, visitor });
});
