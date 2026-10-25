import AuditLog from "../models/AuditLog.js";

export async function writeAudit(req, { action, visitor = null, message = "", metadata = {} }) {
  return AuditLog.create({
    action,
    actor: req.user?._id ?? null,
    visitor: visitor?._id ?? null,
    message,
    metadata,
    ip: req.ip || "",
    userAgent: req.get("user-agent") || "",
  });
}
