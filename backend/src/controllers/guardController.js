import Visitor from "../models/Visitor.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { createQrToken, createUniquePasscode, createUniqueVisitorId } from "../utils/createCodes.js";
import { findVisitorByIdOrCode, isWithinVisitDates, timeLabel } from "../utils/visitorLookup.js";
import { writeAudit } from "../utils/audit.js";
import { sendApprovedPassEmail } from "../services/passEmail.js";

function eligibilityForNextAction(visitor) {
  if (visitor.approvalStatus !== "Approved") return { allowed: false, action: null, reason: "Pass has not been approved." };
  if (visitor.status === "Completed") return { allowed: false, action: null, reason: "Visit is already completed." };
  if (visitor.status === "Inside Campus") {
    // Always permit a visitor to exit, even if their pass was later blacklisted or the dates elapsed.
    return { allowed: true, action: "CHECK_OUT", reason: "Visitor is inside campus; check-out is available." };
  }
  if (visitor.blacklisted) return { allowed: false, action: null, reason: "Visitor is blacklisted. Entry is blocked." };
  if (!isWithinVisitDates(visitor)) return { allowed: false, action: null, reason: "Pass is outside its approved visit dates." };
  return { allowed: true, action: "CHECK_IN", reason: "Pass is valid for check-in." };
}

export const verifyPass = asyncHandler(async (req, res) => {
  const code = String(req.params.value || "").trim();
  const visitor = await findVisitorByIdOrCode(code);
  if (!visitor) throw httpError(404, "No visitor pass matches this QR code or passcode.");
  const result = eligibilityForNextAction(visitor);
  res.json({ success: true, eligible: result.allowed, action: result.action, reason: result.reason, visitor });
});

export const changeGateStatus = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ id: req.params.visitorId });
  if (!visitor) throw httpError(404, "Visitor request not found.");
  const targetStatus = String(req.body?.status || "").trim();
  const eligibility = eligibilityForNextAction(visitor);

  if (targetStatus === "Inside Campus") {
    if (visitor.status === "Inside Campus") throw httpError(409, "Visitor is already checked in.");
    if (!eligibility.allowed || eligibility.action !== "CHECK_IN") throw httpError(409, eligibility.reason || "This pass cannot check in.");
    visitor.status = "Inside Campus";
    visitor.checkInTime = timeLabel();
    visitor.checkOutTime = "—";
    visitor.visitHistory.push({ action: "CHECK_IN", actor: req.user._id, notes: "Gate entry recorded by the authorized Guard/Admin." });
    await visitor.save();
    await writeAudit(req, { action: "VISITOR_CHECK_IN", visitor, message: `Visitor ${visitor.id} checked in at the gate.` });
  } else if (targetStatus === "Completed") {
    if (visitor.status !== "Inside Campus") throw httpError(409, "Only a visitor currently inside campus can check out.");
    visitor.status = "Completed";
    visitor.checkOutTime = timeLabel();
    visitor.visitHistory.push({ action: "CHECK_OUT", actor: req.user._id, notes: "Gate exit recorded by the authorized Guard/Admin." });
    await visitor.save();
    await writeAudit(req, { action: "VISITOR_CHECK_OUT", visitor, message: `Visitor ${visitor.id} checked out at the gate.` });
  } else {
    throw httpError(400, "Gate status must be 'Inside Campus' or 'Completed'.");
  }
  res.json({ success: true, message: `Gate status updated to ${visitor.status}.`, visitor });
});

export const createSpotPass = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = String(body.visitorName || "").trim();
  const phone = String(body.phone || "").trim();
  const emailInput = String(body.visitorEmail || "").trim().toLowerCase();
  const hostName = String(body.hostName || "").trim();
  const purpose = String(body.purpose || "Personal / Guest").trim();
  const arrivalDate = String(body.fromDate || "").trim();
  const exitDate = String(body.toDate || "").trim();
  const idType = ["Passport", "Aadhaar Card"].includes(body.idType) ? body.idType : "Aadhaar Card";
  if (!name || !phone || !hostName || !arrivalDate || !exitDate) throw httpError(400, "Visitor name, phone, host, and dates are required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrivalDate) || !/^\d{4}-\d{2}-\d{2}$/.test(exitDate) || exitDate < arrivalDate) throw httpError(400, "Enter valid visit dates; departure cannot be before arrival.");
  if (emailInput && !/^\S+@\S+\.\S+$/.test(emailInput)) throw httpError(400, "Enter a valid visitor email or leave it blank.");
  const durationDays = Math.round((new Date(`${exitDate}T00:00:00Z`) - new Date(`${arrivalDate}T00:00:00Z`)) / 86400000) + 1;
  const email = emailInput || `walkin-${phone.replace(/\D/g, "").slice(-12)}@invalid.local`;
  const visitor = await Visitor.create({
    id: await createUniqueVisitorId(), passcode: await createUniquePasscode(), qrToken: createQrToken(), requester: req.user._id,
    name, email, phone, idType, idNumber: "[Walk-in ID verified by guard]", idDocName: String(body.idDocName || "").slice(0, 160), idDocUrl: null,
    hostName, hostEmail: req.user.email, hostAddress: "Campus Main Facility", hostIdDocType: "Instant Guard Permit", hostDocName: "", hostDocUrl: null,
    purpose, arrivalDate, exitDate, durationDays, approvalStatus: "Approved", status: "Pending", requestTimestamp: timeLabel(), blacklisted: false,
    emailDeliveryStatus: "not_sent", visitHistory: [{ action: "WALK_IN_PASS_CREATED", actor: req.user._id, notes: "Walk-in pass issued by gate security." }],
  });
  await writeAudit(req, { action: "WALK_IN_PASS_CREATED", visitor, message: `Walk-in visitor pass ${visitor.id} issued by security.` });
  let emailResult = { status: "not_sent", message: "No visitor email provided for the walk-in pass." };
  if (emailInput) emailResult = await sendApprovedPassEmail(req, visitor);
  res.status(201).json({ success: true, message: "Walk-in pass created.", pass: visitor, visitor, email: emailResult });
});

export const searchVisitors = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim().slice(0, 100);
  if (!q) return res.json({ success: true, count: 0, visitors: [] });
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const visitors = await Visitor.find({ $or: [{ id: regex }, { passcode: regex }, { name: regex }, { email: regex }, { hostName: regex }, { hostAddress: regex }] }).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, count: visitors.length, visitors });
});

function csvCell(value) {
  let text = String(value ?? "");
  // Avoid spreadsheet formula injection in exported user-controlled fields.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export const exportAuditCsv = asyncHandler(async (_req, res) => {
  const visitors = await Visitor.find().sort({ createdAt: -1 }).lean();
  const headers = ["Visitor ID", "Passcode", "Visitor Name", "Visitor Email", "Host Name", "Host Address", "Purpose", "Arrival Date", "Exit Date", "Approval Status", "Gate Status", "Check-in Time", "Check-out Time", "Blacklisted", "Email Delivery"];
  const rows = visitors.map((item) => [item.id, item.passcode, item.name, item.email, item.hostName, item.hostAddress, item.purpose, item.arrivalDate, item.exitDate, item.approvalStatus, item.status, item.checkInTime, item.checkOutTime, item.blacklisted ? "YES" : "NO", item.emailDeliveryStatus]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="gateway-audit-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`\uFEFF${csv}`);
});
