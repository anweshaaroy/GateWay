import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { writeAudit } from "../utils/audit.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function writeEmailAuditSafely(req, event) {
  try {
    await writeAudit(req, event);
  } catch (auditError) {
    // Email status should reflect SMTP delivery, not a separate audit persistence failure.
    console.error("Could not write pass-email audit event:", auditError.message);
  }
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

export async function sendApprovedPassEmail(req, visitor) {
  if (visitor.approvalStatus !== "Approved") {
    return { status: "not_sent", message: "The visitor request must be approved before sending a pass." };
  }
  if (!visitor.email || !/^\S+@\S+\.\S+$/.test(visitor.email)) {
    visitor.emailDeliveryStatus = "failed";
    visitor.emailError = "Visitor email address is missing or invalid.";
    await visitor.save();
    await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_FAILED", visitor, message: "Pass email could not be sent because visitor email is invalid." });
    return { status: "failed", message: visitor.emailError };
  }
  if (!smtpConfigured()) {
    if (process.env.NODE_ENV !== "production" || String(process.env.DEMO_MODE || "").toLowerCase() === "true") {
      console.log(`[Dev/Demo Mode] SMTP not configured. Simulating pass email delivery to ${visitor.email}`);
      visitor.emailDeliveryStatus = "sent";
      visitor.emailSentAt = new Date();
      visitor.emailError = "";
      await visitor.save();
      await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_SENT", visitor, message: `[Simulated] Approved QR visitor pass emailed to ${visitor.email}.` });
      return { status: "sent", message: `e-Pass issued! (Simulated email to ${visitor.email} — set SMTP_USER & SMTP_PASS in backend/.env for live delivery)` };
    }
    visitor.emailDeliveryStatus = "failed";
    visitor.emailError = "SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env.";
    await visitor.save();
    await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_FAILED", visitor, message: "Pass email was not sent because SMTP is not configured." });
    return { status: "failed", message: visitor.emailError };
  }

  visitor.emailDeliveryStatus = "pending";
  visitor.emailError = "";
  await visitor.save();

  try {
    const qrDataUrl = await QRCode.toDataURL(visitor.qrToken, { errorCorrectionLevel: "H", width: 360, margin: 2 });
    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBuffer = Buffer.from(qrBase64, "base64");
    const from = process.env.MAIL_FROM || `GateWay Campus Visitor Portal <${process.env.SMTP_USER}>`;
    const passName = escapeHtml(visitor.name);
    const passId = escapeHtml(visitor.id);
    const hostName = escapeHtml(visitor.hostName);
    const purpose = escapeHtml(visitor.purpose);
    const arrivalDate = escapeHtml(visitor.arrivalDate);
    const exitDate = escapeHtml(visitor.exitDate);
    const transporter = createTransport();

    await transporter.sendMail({
      from,
      to: visitor.email,
      subject: `Approved Campus Visitor Pass — ${visitor.id}`,
      text: `Hello ${visitor.name},\n\nYour visitor pass has been approved.\nPass ID: ${visitor.id}\nHost: ${visitor.hostName}\nPurpose: ${visitor.purpose}\nVisit dates: ${visitor.arrivalDate} to ${visitor.exitDate}\n\nPresent the attached QR code at the campus gate. Carry the original identity document and follow campus security instructions. This pass is valid only for the approved dates and may be refused if revoked or blacklisted.`,
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55"><div style="max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden"><div style="background:#075985;color:#fff;padding:22px 26px"><h1 style="margin:0;font-size:22px">GateWay Campus Visitor Pass</h1><p style="margin:6px 0 0">Visitor pre-approval confirmation</p></div><div style="padding:24px 26px"><p>Hello ${passName},</p><p>Your campus visitor pass has been <strong style="color:#047857">approved</strong>.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Pass ID</td><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${passId}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Host</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${hostName}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Purpose</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${purpose}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Visit dates</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${arrivalDate} to ${exitDate}</td></tr></table><div style="text-align:center;margin:24px 0"><img src="cid:gateway-pass-qr" alt="Visitor pass QR code" width="220" height="220" style="display:inline-block"/><p style="font-size:12px;color:#64748b">Present this QR code at the gate.</p></div><div style="background:#f8fafc;border-radius:10px;padding:14px;font-size:13px"><strong>Important instructions</strong><ul><li>Carry the original identity document submitted with your request.</li><li>Pass is valid only during the approved visit dates.</li><li>Gate entry is subject to final security verification.</li></ul></div><p style="font-size:12px;color:#64748b;margin-top:22px">This message was generated automatically by GateWay. Do not reply to this email.</p></div></div></body></html>`,
      attachments: [{ filename: `GateWay-${visitor.id}-QR.png`, content: qrBuffer, contentType: "image/png", cid: "gateway-pass-qr" }],
    });

    visitor.emailDeliveryStatus = "sent";
    visitor.emailSentAt = new Date();
    visitor.emailError = "";
    await visitor.save();
    // Audit persistence must not incorrectly mark a delivered email as failed.
    await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_SENT", visitor, message: `Approved QR visitor pass emailed to ${visitor.email}.` });
    return { status: "sent", message: `Pass email sent to ${visitor.email}.` };
  } catch (error) {
    console.error("GateWay pass email delivery failed:", error.code || "SMTP_ERROR", error.message);
    visitor.emailDeliveryStatus = "failed";
    visitor.emailError = String(error.code || error.message || "SMTP delivery failed").slice(0, 500);
    await visitor.save();
    await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_FAILED", visitor, message: "QR visitor pass email delivery failed.", metadata: { errorCode: error.code || "SMTP_ERROR" } });
    return { status: "failed", message: "Pass was approved, but email delivery failed. Check the backend SMTP settings and retry." };
  }
}
