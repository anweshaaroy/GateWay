import Visitor from "../models/Visitor.js";
import AuditLog from "../models/AuditLog.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { writeAudit } from "../utils/audit.js";

async function getRequestOr404(id) {
  const visitor = await Visitor.findOne({ id });
  if (!visitor) throw httpError(404, "Visitor request not found.");
  return visitor;
}

export const listVisitorRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.blacklisted === "true") filter.blacklisted = true;
  if (req.query.blacklisted === "false") filter.blacklisted = false;
  if (req.query.q) {
    const q = String(req.query.q).trim().slice(0, 100);
    filter.$or = [
      { id: new RegExp(escapeRegex(q), "i") }, { passcode: new RegExp(escapeRegex(q), "i") },
      { name: new RegExp(escapeRegex(q), "i") }, { email: new RegExp(escapeRegex(q), "i") },
      { hostName: new RegExp(escapeRegex(q), "i") }, { hostAddress: new RegExp(escapeRegex(q), "i") },
    ];
  }
  const visitors = await Visitor.find(filter).populate("requester", "name email role entryNumber").sort({ createdAt: -1 });
  res.json({ success: true, count: visitors.length, visitors });
});

function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export const approveVisitorRequest = asyncHandler(async (req, res) => {
  const visitor = await getRequestOr404(req.params.id);
  if (visitor.approvalStatus !== "Pending Approval") throw httpError(409, "Only pending requests can be approved.");
  visitor.approvalStatus = "Approved";
  visitor.status = "Pending";
  visitor.rejectionReason = "";
  visitor.visitHistory.push({ action: "APPROVED", actor: req.user._id, notes: "Request approved by Security Admin." });
  await visitor.save();
  await writeAudit(req, { action: "VISITOR_REQUEST_APPROVED", visitor, message: `Visitor request ${visitor.id} approved.` });
  res.json({ success: true, message: "Visitor request approved.", visitor });
});

export const rejectVisitorRequest = asyncHandler(async (req, res) => {
  const visitor = await getRequestOr404(req.params.id);
  if (visitor.approvalStatus !== "Pending Approval") throw httpError(409, "Only pending requests can be rejected.");
  const reason = String(req.body.reason || "").trim().slice(0, 500);
  if (!reason) throw httpError(400, "Provide a reason for rejection.");
  visitor.approvalStatus = "Rejected";
  visitor.status = "Rejected";
  visitor.rejectionReason = reason;
  visitor.visitHistory.push({ action: "REJECTED", actor: req.user._id, notes: reason });
  await visitor.save();
  await writeAudit(req, { action: "VISITOR_REQUEST_REJECTED", visitor, message: `Visitor request ${visitor.id} rejected.`, metadata: { reason } });
  res.json({ success: true, message: "Visitor request rejected.", visitor });
});

export const toggleBlacklist = asyncHandler(async (req, res) => {
  const visitor = await getRequestOr404(req.params.id);
  visitor.blacklisted = !visitor.blacklisted;
  visitor.visitHistory.push({ action: visitor.blacklisted ? "BLACKLISTED" : "UNBLACKLISTED", actor: req.user._id, notes: visitor.blacklisted ? "Entry blocked by Security Admin." : "Entry block removed by Security Admin." });
  await visitor.save();
  await writeAudit(req, { action: visitor.blacklisted ? "VISITOR_BLACKLISTED" : "VISITOR_UNBLACKLISTED", visitor, message: `Visitor ${visitor.id} ${visitor.blacklisted ? "blacklisted" : "removed from blacklist"}.` });
  res.json({ success: true, visitor });
});

export const dashboardStats = asyncHandler(async (_req, res) => {
  const [total, pending, approved, rejected, insideCampus, blacklisted] = await Promise.all([
    Visitor.countDocuments(),
    Visitor.countDocuments({ approvalStatus: "Pending Approval" }),
    Visitor.countDocuments({ approvalStatus: "Approved" }),
    Visitor.countDocuments({ approvalStatus: "Rejected" }),
    Visitor.countDocuments({ status: "Inside Campus" }),
    Visitor.countDocuments({ blacklisted: true }),
  ]);
  res.json({ success: true, stats: { total, pending, approved, rejected, insideCampus, blacklisted } });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const logs = await AuditLog.find().populate("actor", "name email role").populate("visitor", "id name passcode").sort({ createdAt: -1 }).limit(limit);
  res.json({ success: true, count: logs.length, logs });
});
