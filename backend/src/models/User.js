import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 120, default: "" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254, index: true },
  googleId: { type: String, unique: true, sparse: true, index: true },
  role: { type: String, enum: ["student", "faculty", "official", "admin", "guard"], required: true, index: true },
  residentType: { type: String, enum: ["student", "faculty", "official", null], default: null },
  entryNumber: { type: String, trim: true, uppercase: true, default: null },
  isActive: { type: Boolean, default: true, index: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true, toJSON: { virtuals: false } });

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    mainRole: ["student", "faculty", "official"].includes(this.role) ? "resident" : this.role,
    residentType: this.residentType || (["student", "faculty", "official"].includes(this.role) ? this.role : null),
    entryNumber: this.entryNumber,
  };
};

export default mongoose.model("User", userSchema);
