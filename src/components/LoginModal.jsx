import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { ShieldCheck, ChevronDown, IdCard } from "lucide-react";

export default function LoginModal({ isOpen, onLogin }) {
  const [roleSelect, setRoleSelect] = useState("resident");
  const [residentType, setResidentType] = useState("student"); // "student" | "faculty" | "official"
  const [entryNumber, setEntryNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Shudhu IIT Ropar er domain allow kora holo
  const ALLOWED_DOMAINS = ["@iitrpr.ac.in"];

  if (!isOpen) return null;

  // Google SSO Response Handler
  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const userEmail = decoded.email?.toLowerCase() || "";

      // 1. Strict Domain Whitelisting (Only @iitrpr.ac.in)
      const isDomainValid = ALLOWED_DOMAINS.some((domain) => userEmail.endsWith(domain));

      if (!isDomainValid) {
        setErrorMsg(
          `Access Denied: (${userEmail}) is not authorized. Only official institute accounts (@iitrpr.ac.in) are permitted.`
        );
        return;
      }

      // 2. Student Roll Number Requirement
      if (roleSelect === "resident" && residentType === "student" && !entryNumber.trim()) {
        setErrorMsg("Please enter your Student Entry / Roll Number before signing in.");
        return;
      }

      // 3. Dispatch to Global App State
      const finalRole = roleSelect === "resident" ? residentType : roleSelect;
      onLogin({
        name: decoded.name,
        role: finalRole,
        mainRole: roleSelect,
        email: userEmail,
        entryNumber: finalRole === "student" ? entryNumber.trim().toUpperCase() : null,
        picture: decoded.picture,
        isVerified: true,
      });
    } catch (err) {
      console.error("Token decoding error:", err);
      setErrorMsg("Failed to authenticate account. Please try again.");
    }
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
              IIT Ropar Institutional Access
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        <div className="space-y-4">
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
                <option value="resident">Resident: Student / Faculty / Official</option>
                <option value="admin">Security Admin Desk</option>
                <option value="guard">Guard Terminal Post</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Resident Sub-Category (Student / Faculty / Official) */}
          {roleSelect === "resident" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Resident Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {["student", "faculty", "official"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setResidentType(type);
                      setErrorMsg("");
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border capitalize transition ${
                      residentType === type
                        ? "border-[#0284c7] bg-sky-50 text-[#0284c7]"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Student Roll Number */}
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
                Enter your roll number before signing in with Google.
              </p>
            </div>
          )}

          {/* Google SSO Login Button */}
          <div className="pt-3 flex flex-col items-center">
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErrorMsg("Google Sign-In failed or was cancelled.")}
                shape="pill"
                text="signin_with"
                theme="outline"
                size="large"
                width="100%"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Requires an active <strong>@iitrpr.ac.in</strong> account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}