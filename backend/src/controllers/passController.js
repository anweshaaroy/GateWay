import Visitor from "../models/Visitor.js";
import asyncHandler from "../utils/asyncHandler.js";
import { httpError } from "../utils/httpError.js";
import { sendApprovedPassEmail } from "../services/passEmail.js";

export const sendPassEmail = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findOne({ id: req.params.id });
  if (!visitor) throw httpError(404, "Visitor request not found.");
  const owner = String(visitor.requester) === String(req.user._id);
  if (!owner && !["admin", "guard"].includes(req.user.role)) throw httpError(403, "You cannot send this visitor pass.");
  if (visitor.approvalStatus !== "Approved") throw httpError(409, "The pass can only be emailed after Admin approval.");
  const email = await sendApprovedPassEmail(req, visitor);
  res.status(email.status === "sent" ? 200 : 502).json({ success: email.status === "sent", message: email.message, email, visitor, pass: visitor });
});

