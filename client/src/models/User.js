import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 100, default: "" },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  // Password is required for password-based accounts; Google-only accounts use googleId.
  password: {
    type: String,
    minlength: 8,
    select: false,
    required: function passwordRequired() { return !this.googleId; },
  },
  googleId: { type: String, unique: true, sparse: true, trim: true },
  role: { type: String, enum: ["student", "faculty", "admin", "guard"], required: true },
  entryNumber: { type: String, trim: true, uppercase: true, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    entryNumber: this.entryNumber,
  };
};

export default mongoose.model("User", userSchema);
