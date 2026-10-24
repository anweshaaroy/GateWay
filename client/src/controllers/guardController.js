import Visitor from "../models/Visitor.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { findVisitorByIdOrCode, isWithinVisitDates } from "../utils/visitorLookup.js";
import { writeAudit } from "../utils/audit.js";
import { createUniquePasscode, createUniqueVisitorId } from "../utils/createCodes.js";

function timeLabel() {
  return new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function eligibility(visitor) {
  if (visitor.approvalStatus !== "Approved") return { allowed: false, reason: "Pass has not been approved." };
  if (visitor.blacklisted) return { allowed: false, reason: "Visitor is blacklisted. Entry is blocked." };
  if (!isWithinVisitDates(visitor)) return { allowed: false, reason: "Pass is outside its approved visit dates." };
  if (visitor.status === "Inside Campus") return { allowed: false, reason: "Visitor is already checked in." };
  if (visitor.status === "Completed") return { allowed: false, reason: "Visit is already completed." };
  return { allowed: true, reason: "Pass is valid for check-in." };
}


export const listGuardVisitors = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  const filter = {};
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ id: regex }, { passcode: regex }, { name: regex }, { email: regex }, { hostName: regex }, { hostAddress: regex }];
  }
  const visitors = await Visitor.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, count: visitors.length, visitors });
});

function validWalkInDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export const createWalkInVisitor = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const idType = String(body.idType || "").trim();
  const rawIdNumber = String(body.idNumber || "").trim();
  const hostName = String(body.hostName || "").trim();
  const hostAddress = String(body.hostAddress || "Campus Spot Clearance").trim();
  const purpose = String(body.purpose || "Personal / Guest").trim();
  const arrivalDate = String(body.arrivalDate || "").trim();
  const exitDate = String(body.exitDate || "").trim();
  if (!name || !email || !idType || !rawIdNumber || !hostName || !arrivalDate || !exitDate) throw httpError(400, "Complete the required walk-in visitor, identity, host, and date fields.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw httpError(400, "Enter a valid visitor email address or leave it blank to use a walk-in placeholder.");
  if (idType === "Aadhaar Card" && !/^\d{12}$/.test(rawIdNumber)) throw httpError(400, "Aadhaar number must contain exactly 12 digits.");
  if (idType === "Passport" && !/^[A-Za-z]\d{7}$/.test(rawIdNumber)) throw httpError(400, "Passport number must contain one letter followed by seven digits.");
  if (!["Aadhaar Card", "Passport"].includes(idType)) throw httpError(400, "Unsupported identity document type.");
  if (!validWalkInDate(arrivalDate) || !validWalkInDate(exitDate) || exitDate < arrivalDate) throw httpError(400, "Enter a valid visit window with departure on or after arrival.");
  const visitorFile = req.files?.visitorDocument?.[0];
  const hostFile = req.files?.hostDocument?.[0];
  const durationDays = Math.round((new Date(`${exitDate}T00:00:00Z`) - new Date(`${arrivalDate}T00:00:00Z`)) / 86400000) + 1;
  const visitor = await Visitor.create({
    id: await createUniqueVisitorId(),
    passcode: await createUniquePasscode(),
    requester: req.user._id,
    name, email, idType,
    idNumber: idType === "Aadhaar Card" ? "[Aadhaar Redacted]" : rawIdNumber.toUpperCase(),
    idDocName: visitorFile?.originalname || "",
    idDocStorageName: visitorFile?.filename || null,
    idDocUrl: visitorFile ? "pending" : null,
    hostName,
    hostEmail: req.user.email,
    hostAddress,
    hostIdDocType: "Official Security Spot Permit",
    hostDocName: hostFile?.originalname || "",
    hostDocStorageName: hostFile?.filename || null,
    hostDocUrl: hostFile ? "pending" : null,
    purpose, arrivalDate, exitDate, durationDays,
    approvalStatus: "Approved",
    status: "Pending",
    requestTimestamp: timeLabel(),
    blacklisted: false,
    visitHistory: [{ action: "REQUEST_CREATED", actor: req.user._id, notes: "Walk-in pass issued by security." }],
  });
  visitor.idDocUrl = visitorFile ? `/api/visitors/${visitor.id}/documents/visitor` : null;
  visitor.hostDocUrl = hostFile ? `/api/visitors/${visitor.id}/documents/host` : null;
  await visitor.save();
  await writeAudit(req, { action: "WALK_IN_PASS_CREATED", visitor, message: `Walk-in pass ${visitor.id} issued by security.` });
  res.status(201).json({ success: true, message: "Walk-in pass issued.", visitor });
});

export const verifyPass = asyncHandler(async (req, res) => {
  const code = String(req.params.passcode || "").trim();
  const visitor = await findVisitorByIdOrCode(code);
  if (!visitor) throw httpError(404, "No visitor pass matches this QR code or passcode.");
  const result = eligibility(visitor);
  await writeAudit(req, { action: result.allowed ? "PASS_VERIFIED" : "PASS_VERIFICATION_DENIED", visitor, message: `Pass verification ${result.allowed ? "allowed" : "denied"} for ${visitor.id}.`, metadata: { eligible: result.allowed, reason: result.reason } });
  res.json({ success: true, eligible: result.allowed, reason: result.reason, visitor });
});

export const checkInVisitor = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ id: req.params.id });
  if (!visitor) throw httpError(404, "Visitor request not found.");
  const result = eligibility(visitor);
  if (!result.allowed) throw httpError(409, result.reason);

  visitor.status = "Inside Campus";
  visitor.checkInTime = timeLabel();
  visitor.checkOutTime = "—";
  visitor.visitHistory.push({ action: "CHECK_IN", actor: req.user._id, notes: "QR/passcode verified and entry recorded." });
  await visitor.save();
  await writeAudit(req, { action: "VISITOR_CHECK_IN", visitor, message: `Visitor ${visitor.id} checked in at the gate.` });
  res.json({ success: true, message: "Check-in recorded.", visitor });
});

export const checkOutVisitor = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ id: req.params.id });
  if (!visitor) throw httpError(404, "Visitor request not found.");
  if (visitor.status !== "Inside Campus") throw httpError(409, "Only a visitor currently inside campus can check out.");

  visitor.status = "Completed";
  visitor.checkOutTime = timeLabel();
  visitor.visitHistory.push({ action: "CHECK_OUT", actor: req.user._id, notes: "Exit recorded by Gate Guard." });
  await visitor.save();
  await writeAudit(req, { action: "VISITOR_CHECK_OUT", visitor, message: `Visitor ${visitor.id} checked out at the gate.` });
  res.json({ success: true, message: "Check-out recorded.", visitor });
});

export const searchVisitors = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (!q) return res.json({ success: true, count: 0, visitors: [] });
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const visitors = await Visitor.find({ $or: [{ id: regex }, { passcode: regex }, { name: regex }, { email: regex }, { hostName: regex }, { hostAddress: regex }] }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, count: visitors.length, visitors });
});

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export const exportAuditCsv = asyncHandler(async (req, res) => {
  const visitors = await Visitor.find().sort({ createdAt: -1 }).lean();
  await writeAudit(req, { action: "GATE_AUDIT_CSV_EXPORTED", message: "Gate audit CSV exported." });
  const headers = ["Visitor ID", "Passcode", "Visitor Name", "Visitor Email", "Host Name", "Host Address", "Purpose", "Arrival Date", "Exit Date", "Approval Status", "Gate Status", "Check-in Time", "Check-out Time", "Blacklisted"];
  const rows = visitors.map((item) => [item.id, item.passcode, item.name, item.email, item.hostName, item.hostAddress, item.purpose, item.arrivalDate, item.exitDate, item.approvalStatus, item.status, item.checkInTime, item.checkOutTime, item.blacklisted ? "YES" : "NO"]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="gateway-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`\uFEFF${csv}`);
});
