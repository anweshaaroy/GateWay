import mongoose from "mongoose";

const visitEventSchema = new mongoose.Schema({
  action: { type: String, enum: ["REQUEST_CREATED", "APPROVED", "REJECTED", "BLACKLISTED", "UNBLACKLISTED", "CHECK_IN", "CHECK_OUT"], required: true },
  at: { type: Date, default: Date.now },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  notes: { type: String, trim: true, maxlength: 500, default: "" },
}, { _id: false });

const visitorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  passcode: { type: String, required: true, unique: true, index: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  idType: { type: String, enum: ["Aadhaar Card", "Passport"], required: true },
  // The raw Aadhaar value is never stored. The current UI labels it as redacted.
  idNumber: { type: String, required: true, maxlength: 80 },
  idDocName: { type: String, default: "" },
  idDocUrl: { type: String, default: null },
  hostName: { type: String, required: true, trim: true, maxlength: 120 },
  hostEmail: { type: String, required: true, trim: true, lowercase: true },
  hostAddress: { type: String, required: true, trim: true, maxlength: 250 },
  hostIdDocType: { type: String, required: true, trim: true, maxlength: 100 },
  hostDocName: { type: String, default: "" },
  hostDocUrl: { type: String, default: null },
  purpose: { type: String, required: true, trim: true, maxlength: 500 },
  arrivalDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  exitDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  durationDays: { type: Number, required: true, min: 1 },
  approvalStatus: { type: String, enum: ["Pending Approval", "Approved", "Rejected"], default: "Pending Approval", index: true },
  status: { type: String, enum: ["Pending", "Inside Campus", "Completed", "Rejected"], default: "Pending", index: true },
  checkInTime: { type: String, default: "—" },
  checkOutTime: { type: String, default: "—" },
  requestTimestamp: { type: String, default: "" },
  blacklisted: { type: Boolean, default: false, index: true },
  rejectionReason: { type: String, default: "", maxlength: 500 },
  visitHistory: { type: [visitEventSchema], default: [] },
}, { timestamps: true });

visitorSchema.index({ name: "text", email: "text", hostName: "text", hostAddress: "text", passcode: "text", id: "text" });

export default mongoose.model("Visitor", visitorSchema);
