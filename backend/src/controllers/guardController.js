import Visitor from "../models/Visitor.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { findVisitorByIdOrCode, isWithinVisitDates } from "../utils/visitorLookup.js";
import { writeAudit } from "../utils/audit.js";

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

export const verifyPass = asyncHandler(async (req, res) => {
  const code = String(req.params.passcode || "").trim();
  const visitor = await findVisitorByIdOrCode(code);
  if (!visitor) throw httpError(404, "No visitor pass matches this QR code or passcode.");
  const result = eligibility(visitor);
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

export const exportAuditCsv = asyncHandler(async (_req, res) => {
  const visitors = await Visitor.find().sort({ createdAt: -1 }).lean();
  const headers = ["Visitor ID", "Passcode", "Visitor Name", "Visitor Email", "Host Name", "Host Address", "Purpose", "Arrival Date", "Exit Date", "Approval Status", "Gate Status", "Check-in Time", "Check-out Time", "Blacklisted"];
  const rows = visitors.map((item) => [item.id, item.passcode, item.name, item.email, item.hostName, item.hostAddress, item.purpose, item.arrivalDate, item.exitDate, item.approvalStatus, item.status, item.checkInTime, item.checkOutTime, item.blacklisted ? "YES" : "NO"]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="gateway-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`\uFEFF${csv}`);
});
