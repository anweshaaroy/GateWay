import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { writeAudit } from "../utils/audit.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function emailConfigured() {
  return Boolean(process.env.BREVO_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS));
}

async function writeEmailAuditSafely(req, event) {
  try {
    await writeAudit(req, event);
  } catch (auditError) {
    // Email status should reflect delivery, not a separate audit persistence failure.
    console.error("Could not write pass-email audit event:", auditError.message);
  }
}

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: { user, pass },
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
  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production" || String(process.env.DEMO_MODE || "").toLowerCase() === "true") {
      console.log(`[Dev/Demo Mode] Email not configured. Simulating pass email delivery to ${visitor.email}`);
      visitor.emailDeliveryStatus = "sent";
      visitor.emailSentAt = new Date();
      visitor.emailError = "";
      await visitor.save();
      await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_SENT", visitor, message: `[Simulated] Approved QR visitor pass emailed to ${visitor.email}.` });
      return { status: "sent", message: `e-Pass issued! (Simulated email to ${visitor.email})` };
    }
    visitor.emailDeliveryStatus = "failed";
    visitor.emailError = "Email service is not configured. Add BREVO_API_KEY in Render Environment Variables.";
    await visitor.save();
    await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_FAILED", visitor, message: "Pass email was not sent because email service is not configured." });
    return { status: "failed", message: visitor.emailError };
  }

  visitor.emailDeliveryStatus = "pending";
  visitor.emailError = "";
  await visitor.save();

  try {
    const qrDataUrl = await QRCode.toDataURL(visitor.qrToken, { errorCorrectionLevel: "H", width: 360, margin: 2 });
    const qrBase64 = qrDataUrl.split(",")[1];
    const qrBuffer = Buffer.from(qrBase64, "base64");
    
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || "anwesharoy0177@gmail.com").trim();
    const replyToEmail = (process.env.SMTP_USER || "2026csm1042@iitrpr.ac.in").trim();
    let from = process.env.MAIL_FROM;
    if (!from || from.includes("example.com")) {
      from = `GateWay Campus Visitor Portal <${senderEmail}>`;
    }

    const passName = escapeHtml(visitor.name);
    const passId = escapeHtml(visitor.id);
    const hostName = escapeHtml(visitor.hostName);
    const purpose = escapeHtml(visitor.purpose);
    const arrivalDate = escapeHtml(visitor.arrivalDate);
    const exitDate = escapeHtml(visitor.exitDate);
    const totalCount = visitor.totalVisitors || (1 + (visitor.accompanyingCount || 0));
    const headcountText = totalCount > 1 ? `${totalCount} Persons (1 Lead + ${visitor.accompanyingCount || 0} Accompanying)` : "1 Person (Individual Pass)";

    const emailSubject = `Approved Campus Visitor Pass — ${visitor.id}`;
    const emailText = `Hello ${visitor.name},\n\nYour visitor pass has been approved.\nPass ID: ${visitor.id}\nHost: ${visitor.hostName}\nPurpose: ${visitor.purpose}\nVisit dates: ${visitor.arrivalDate} to ${visitor.exitDate}\nTotal Headcount: ${headcountText}\n\nPresent the attached QR code at the campus gate. Carry the original identity document and follow campus security instructions. This pass is valid only for the approved dates and may be refused if revoked or blacklisted.`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&amp;margin=3&amp;data=${encodeURIComponent(visitor.qrToken)}`;
    const emailHtml = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55"><div style="max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden"><div style="background:#075985;color:#fff;padding:22px 26px"><h1 style="margin:0;font-size:22px">GateWay Campus Visitor Pass</h1><p style="margin:6px 0 0">Visitor pre-approval confirmation</p></div><div style="padding:24px 26px"><p>Hello ${passName},</p><p>Your campus visitor pass has been <strong style="color:#047857">approved</strong>.</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Pass ID</td><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${passId}</strong></td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Host</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${hostName}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Purpose</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${purpose}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Visit dates</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${arrivalDate} to ${exitDate}</td></tr><tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;color:#64748b">Headcount</td><td style="padding:8px;border-bottom:1px solid #e2e8f0"><strong>${escapeHtml(headcountText)}</strong></td></tr></table><div style="text-align:center;margin:24px 0"><img src="${qrImageUrl}" alt="Visitor pass QR code" width="220" height="220" style="display:inline-block;border:2px solid #cbd5e1;border-radius:12px;padding:6px;background:#ffffff"/><p style="font-size:12px;color:#64748b;margin-top:8px">Present this QR code at the campus gate.</p></div><div style="background:#f8fafc;border-radius:10px;padding:14px;font-size:13px"><strong>Important instructions</strong><ul><li>Carry the original identity document submitted with your request.</li><li>Pass is valid only during the approved visit dates.</li><li>Gate entry is subject to final security verification.</li></ul></div><p style="font-size:12px;color:#64748b;margin-top:22px">This message was generated automatically by GateWay. Do not reply to this email.</p></div></div></body></html>`;

    // 1. If Brevo API key is available, use HTTPS (Port 443) — bypasses Render SMTP port blocks
    if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) {
      const brevoApiKey = process.env.BREVO_API_KEY.trim();
      const brevoPayload = {
        sender: { name: "GateWay Campus Visitor Portal", email: senderEmail },
        replyTo: { name: "IIT Ropar GateWay Portal", email: replyToEmail },
        to: [{ email: visitor.email, name: visitor.name }],
        subject: emailSubject,
        htmlContent: emailHtml,
        textContent: emailText,
        attachment: [{
          name: `GateWay-${visitor.id}-QR.png`,
          content: qrBase64,
        }],
      };

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(brevoPayload),
      });

      const brevoData = await brevoRes.json();
      if (!brevoRes.ok) {
        throw new Error(brevoData.message || `Brevo API HTTP ${brevoRes.status}`);
      }

      visitor.emailDeliveryStatus = "sent";
      visitor.emailSentAt = new Date();
      visitor.emailError = "";
      await visitor.save();
      await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_SENT", visitor, message: `Approved QR visitor pass emailed to ${visitor.email} via Brevo HTTPS.` });
      return { status: "sent", message: `Pass email sent to ${visitor.email}.` };
    }

    // 2. Fallback to direct Nodemailer SMTP (works on localhost)
    const transporter = createTransport();

    await transporter.sendMail({
      from,
      to: visitor.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
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
    console.error("GateWay pass email delivery failed:", error.code || "EMAIL_ERROR", error.message);
    visitor.emailDeliveryStatus = "failed";
    visitor.emailError = String(error.code || error.message || "Email delivery failed").slice(0, 500);
    await visitor.save();
    await writeEmailAuditSafely(req, { action: "VISITOR_PASS_EMAIL_FAILED", visitor, message: "QR visitor pass email delivery failed.", metadata: { errorCode: error.code || "EMAIL_ERROR" } });
    return { status: "failed", message: `Pass was approved, but email delivery failed (${visitor.emailError}).` };
  }
}

export async function sendRejectedPassEmail(req, visitor, reason) {
  const cleanReason = String(reason || "Rejected by Security Admin.").trim();

  // Collect recipients: Both Visitor and Host
  const recipients = [];
  const hostEmail = (visitor.hostEmail || visitor.requester?.email || "").trim().toLowerCase();
  const hostName = (visitor.hostName || visitor.requester?.name || "Campus Resident").trim();
  const visitorEmail = (visitor.email || "").trim().toLowerCase();
  const visitorName = (visitor.name || "Visitor").trim();

  const emailRegex = /^\S+@\S+\.\S+$/;

  if (visitorEmail && emailRegex.test(visitorEmail)) {
    recipients.push({ email: visitorEmail, name: visitorName, role: "Visitor" });
  }

  if (hostEmail && emailRegex.test(hostEmail) && hostEmail !== visitorEmail) {
    recipients.push({ email: hostEmail, name: hostName, role: "Host" });
  }

  if (recipients.length === 0) {
    console.warn(`[Pass Rejection Email] No valid email found for visitor ${visitor.id}`);
    return { status: "not_sent", message: "No valid email address found for host or visitor." };
  }

  if (!emailConfigured()) {
    if (process.env.NODE_ENV !== "production" || String(process.env.DEMO_MODE || "").toLowerCase() === "true") {
      const recipientList = recipients.map((r) => r.email).join(", ");
      console.log(`[Dev/Demo Mode] Email not configured. Simulating pass rejection email to ${recipientList}`);
      await writeEmailAuditSafely(req, {
        action: "VISITOR_PASS_REJECTION_EMAIL_SENT",
        visitor,
        message: `[Simulated] Rejection notification emailed to ${recipientList}. Reason: ${cleanReason}`,
      });
      return { status: "sent", message: `Rejection notice simulated for ${recipientList}.` };
    }
    return { status: "failed", message: "Email service is not configured." };
  }

  try {
    const senderEmail = (process.env.BREVO_SENDER_EMAIL || "anwesharoy0177@gmail.com").trim();
    const replyToEmail = (process.env.SMTP_USER || "2026csm1042@iitrpr.ac.in").trim();
    let from = process.env.MAIL_FROM;
    if (!from || from.includes("example.com")) {
      from = `GateWay Campus Visitor Portal <${senderEmail}>`;
    }

    const passName = escapeHtml(visitor.name);
    const passId = escapeHtml(visitor.id);
    const hostEscaped = escapeHtml(hostName);
    const purpose = escapeHtml(visitor.purpose);
    const arrivalDate = escapeHtml(visitor.arrivalDate);
    const exitDate = escapeHtml(visitor.exitDate);
    const escapedReason = escapeHtml(cleanReason);
    const totalCount = visitor.totalVisitors || (1 + (visitor.accompanyingCount || 0));
    const headcountText = totalCount > 1 ? `${totalCount} Persons (1 Lead + ${visitor.accompanyingCount || 0} Accompanying)` : "1 Person (Individual Pass)";

    const emailSubject = `GateWay Pass Request Update: Rejected (${visitor.id} - ${visitor.name})`;
    const emailText = `Hello,\n\nYour campus visitor pass request has been rejected by Campus Security.\n\nPass ID: ${visitor.id}\nVisitor Name: ${visitor.name}\nHost: ${hostName}\nPurpose: ${visitor.purpose}\nVisit Dates: ${visitor.arrivalDate} to ${visitor.exitDate}\nTotal Headcount: ${headcountText}\n\nReason for Rejection:\n${cleanReason}\n\nNext Steps:\nIf you believe this was due to incomplete or unclear documents, the host resident can submit a fresh request with verified identity proofs via the GateWay portal.\nFor queries, contact campus security at ${replyToEmail}.\n\nGateWay Campus Security Pre-Approval System`;

    const emailHtml = `<!doctype html>
<html>
<body style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.55;background:#f8fafc;padding:20px 0;margin:0">
  <div style="max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#ffffff">
    <div style="background:#991b1b;color:#ffffff;padding:24px 28px">
      <h1 style="margin:0;font-size:22px;letter-spacing:-0.5px">GateWay Campus Visitor Portal</h1>
      <p style="margin:6px 0 0;font-size:14px;opacity:0.9">Pass Pre-Clearance Update &mdash; Request Rejected</p>
    </div>
    <div style="padding:26px 28px">
      <p style="font-size:15px;margin-top:0">Dear Resident / Visitor,</p>
      <p style="font-size:14px;color:#334155">The campus visitor pass request for <strong>${passName}</strong> has been reviewed and <strong>rejected</strong> by Campus Security.</p>
      
      <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #dc2626;border-radius:8px;padding:14px 16px;margin:20px 0">
        <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px">Reason for Rejection</div>
        <div style="font-size:14px;font-weight:600;color:#7f1d1d;margin-top:4px">${escapedReason}</div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin:18px 0;font-size:14px">
        <tr>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;width:35%">Pass ID</td>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-weight:700">${passId}</td>
        </tr>
        <tr>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0;color:#64748b">Visitor Name</td>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0"><strong>${passName}</strong></td>
        </tr>
        <tr>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0;color:#64748b">Host Resident</td>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0">${hostEscaped}</td>
        </tr>
        <tr>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0;color:#64748b">Requested Dates</td>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0">${arrivalDate} to ${exitDate}</td>
        </tr>
        <tr>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0;color:#64748b">Total Headcount</td>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0">${escapeHtml(headcountText)}</td>
        </tr>
        <tr>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0;color:#64748b">Purpose</td>
          <td style="padding:9px 8px;border-bottom:1px solid #e2e8f0">${purpose}</td>
        </tr>
      </table>

      <div style="background:#f8fafc;border-radius:10px;padding:16px;font-size:13px;color:#475569;margin-top:22px;border:1px solid #e2e8f0">
        <strong style="color:#0f172a;display:block;margin-bottom:6px">Instructions &amp; Next Steps</strong>
        <ul style="margin:0;padding-left:18px;line-height:1.6">
          <li>Entry into campus with this pass is strictly prohibited.</li>
          <li>If rejection was due to unclear or invalid documents, the host resident can submit a fresh request with high-resolution documents via the GateWay portal.</li>
          <li>For security clarifications, contact the Campus Security Office at <a href="mailto:${replyToEmail}" style="color:#0284c7;text-decoration:none">${replyToEmail}</a>.</li>
        </ul>
      </div>

      <p style="font-size:12px;color:#94a3b8;margin-top:24px;margin-bottom:0">This is an automated notification from GateWay. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>`;

    // 1. If Brevo API key is available, use HTTPS (Port 443)
    if (process.env.BREVO_API_KEY && process.env.BREVO_API_KEY.trim()) {
      const brevoApiKey = process.env.BREVO_API_KEY.trim();
      const toList = recipients.map((r) => ({ email: r.email, name: r.name }));

      const brevoPayload = {
        sender: { name: "GateWay Campus Visitor Portal", email: senderEmail },
        replyTo: { name: "IIT Ropar GateWay Security", email: replyToEmail },
        to: toList,
        subject: emailSubject,
        htmlContent: emailHtml,
        textContent: emailText,
      };

      const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(brevoPayload),
      });

      const brevoData = await brevoRes.json();
      if (!brevoRes.ok) {
        throw new Error(brevoData.message || `Brevo API HTTP ${brevoRes.status}`);
      }

      await writeEmailAuditSafely(req, {
        action: "VISITOR_PASS_REJECTION_EMAIL_SENT",
        visitor,
        message: `Pass rejection notice emailed to ${recipients.map((r) => `${r.role}: ${r.email}`).join(", ")} via Brevo HTTPS. Reason: ${cleanReason}`,
      });

      return { status: "sent", message: `Rejection email delivered to ${recipients.map((r) => r.email).join(", ")}.` };
    }

    // 2. Fallback to direct Nodemailer SMTP (localhost)
    const transporter = createTransport();
    const toAddresses = recipients.map((r) => r.email).join(", ");

    await transporter.sendMail({
      from,
      to: toAddresses,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    await writeEmailAuditSafely(req, {
      action: "VISITOR_PASS_REJECTION_EMAIL_SENT",
      visitor,
      message: `Pass rejection notice emailed to ${toAddresses} via SMTP. Reason: ${cleanReason}`,
    });

    return { status: "sent", message: `Rejection email sent to ${toAddresses}.` };
  } catch (error) {
    console.error("GateWay pass rejection email delivery failed:", error.code || "EMAIL_ERROR", error.message);
    await writeEmailAuditSafely(req, {
      action: "VISITOR_PASS_REJECTION_EMAIL_FAILED",
      visitor,
      message: "Pass rejection email delivery failed.",
      metadata: { errorCode: error.code || "EMAIL_ERROR", error: error.message },
    });
    return { status: "failed", message: `Pass was rejected, but email delivery failed (${error.message}).` };
  }
}
