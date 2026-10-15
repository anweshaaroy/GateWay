import React, { useState } from "react";
import { ShieldCheck, Mail, IdCard, ChevronDown, LogIn } from "lucide-react";

export default function LoginModal({ isOpen, onLogin }) {
  const [roleSelect, setRoleSelect] = useState("resident");
  const [residentType, setResidentType] = useState("student");
  const [email, setEmail] = useState("");
  const [entryNumber, setEntryNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const ALLOWED_DOMAINS = ["@iitrpr.ac.in", "@campus.edu"];

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    z
    e.preventDefault();
    setErrorMsg("");

    const cleanEmail = email.trim().toLowerCase();
    const isDomainValid = ALLOWED_DOMAINS.some((domain) => cleanEmail.endsWith(domain));

    // Institutional Domain Validation
    if (!isDomainValid) {
      setErrorMsg(
        `Access Denied: Only institutional IDs ending with ${ALLOWED_DOMAINS.join(" or ")} are authorized.`
      );
      return;
    }

    // Student Roll Number Requirement (Only checks if provided, no pattern restriction)
    if (roleSelect === "resident" && residentType === "student" && !entryNumber.trim()) {
      setErrorMsg("Please enter your Student Entry / Roll Number.");
      return;
    }

    // Direct Login Authentication
    const finalRole = roleSelect === "resident" ? residentType : roleSelect;
    onLogin({
      role: finalRole,
      mainRole: roleSelect,
      email: cleanEmail,
      entryNumber: finalRole === "student" ? entryNumber.trim().toUpperCase() : null,
      isVerified: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-8 relative overflow-hidden">
        {/* Header Icon & Title */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-[#0284c7] text-white p-3 rounded-2xl shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">GateWay Portal</h2>
            <p className="text-xs text-slate-500 font-medium">
              Sign in to access your designated campus dashboard
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Login Portal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Select Login Portal *
            </label>
            <div className="relative">
              <select
                value={roleSelect}
                onChange={(e) => {
                  setRoleSelect(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-[#0284c7] appearance-none shadow-sm cursor-pointer outline-none text-slate-800"
              >
                <option value="resident">Resident: Student / Faculty</option>
                <option value="admin">Security Admin Desk</option>
                <option value="guard">Guard Terminal Post</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Resident Sub-Category (Student / Faculty) */}
          {roleSelect === "resident" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Resident Category *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 border border-slate-200 rounded-xl p-2.5 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="resType"
                    value="student"
                    checked={residentType === "student"}
                    onChange={() => setResidentType("student")}
                    className="text-[#0284c7] focus:ring-[#0284c7]"
                  />
                  <span className="text-xs font-bold text-slate-700">Student</span>
                </label>
                <label className="flex items-center space-x-2 border border-slate-200 rounded-xl p-2.5 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="resType"
                    value="faculty"
                    checked={residentType === "faculty"}
                    onChange={() => setResidentType("faculty")}
                    className="text-[#0284c7] focus:ring-[#0284c7]"
                  />
                  <span className="text-xs font-bold text-slate-700">Faculty</span>
                </label>
              </div>
            </div>
          )}

          {/* Institutional Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institutional Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@iitrpr.ac.in"
                className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0284c7] outline-none"
              />
            </div>
          </div>

          {/* Student Roll Number (Any format allowed) */}
          {roleSelect === "resident" && residentType === "student" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Entry / Roll Number *
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  placeholder="e.g. Roll Number as per ID card"
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0284c7] font-mono uppercase outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Enter your roll / entry number as registered on your ID card.
              </p>
            </div>
          )}

          {/* Direct Authentication Submit Button */}
          <button
            type="submit"
            className="w-full mt-3 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-md shadow-sky-600/20 flex items-center justify-center space-x-2 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Authenticate & Enter Portal</span>
          </button>
        </form>
      </div>
    </div>
  );
}