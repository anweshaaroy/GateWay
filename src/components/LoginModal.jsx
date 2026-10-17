import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { 
  ShieldCheck, 
  ChevronDown, 
  IdCard, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  Lock, 
  AlertCircle 
} from "lucide-react";

export default function LoginModal({ isOpen, onLogin }) {
  const [roleSelect, setRoleSelect] = useState("resident");
  const [residentType, setResidentType] = useState("student"); // "student" | "faculty" | "official"
  const [entryNumber, setEntryNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const ALLOWED_DOMAINS = ["@iitrpr.ac.in"];

  if (!isOpen) return null;

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      const userEmail = decoded.email?.toLowerCase() || "";

      // 1. Strict Domain Whitelisting
      const isDomainValid = ALLOWED_DOMAINS.some((domain) => userEmail.endsWith(domain));

      if (!isDomainValid) {
        setErrorMsg(
          `Access Denied: (${userEmail}) is unauthorized. Only official (@iitrpr.ac.in) accounts are permitted.`
        );
        return;
      }

      // 2. Student Roll Number Requirement
      if (roleSelect === "resident" && residentType === "student" && !entryNumber.trim()) {
        setErrorMsg("Please enter your Student Entry / Roll Number before signing in.");
        return;
      }

      // 3. Dispatch to App State
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
      setErrorMsg("Authentication failed. Please try again.");
    }
  };

  const residentOptions = [
    { id: "student", label: "Student", icon: GraduationCap },
    { id: "faculty", label: "Faculty", icon: Briefcase },
    { id: "official", label: "Official", icon: Building2 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      {/* Clean White Card */}
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-8 md:p-9 relative">
        
        {/* Header Section */}
        <div className="flex items-center space-x-3.5 mb-6">
          <div className="bg-[#0284c7] text-white p-3 rounded-2xl shadow-md shadow-sky-500/20">
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
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700 font-semibold leading-relaxed">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
            <div>{errorMsg}</div>
          </div>
        )}

        <div className="space-y-5">
          {/* Select Login Portal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Login Portal *
            </label>
            <div className="relative">
              <select
                value={roleSelect}
                onChange={(e) => {
                  setRoleSelect(e.target.value);
                  setErrorMsg("");
                }}
                className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white text-slate-800 focus:bg-white focus:ring-2 focus:ring-[#0284c7] focus:border-transparent appearance-none shadow-sm cursor-pointer outline-none transition"
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Resident Category *
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {residentOptions.map(({ id, label, icon: Icon }) => {
                  const isSelected = residentType === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setResidentType(id);
                        setErrorMsg("");
                      }}
                      className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "border-[#0284c7] bg-sky-50/80 text-[#0284c7] shadow-sm ring-1 ring-[#0284c7]"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Student Roll Number (Only visible for students) */}
          {roleSelect === "resident" && residentType === "student" && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Student Entry / Roll Number *
              </label>
              <div className="relative">
                <IdCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  placeholder="e.g. 2024CSB1001"
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#0284c7] focus:border-transparent font-mono uppercase tracking-wider outline-none text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter your roll number before signing in with Google.
              </p>
            </div>
          )}

          {/* Official Google SSO Button */}
          <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
            <div className="w-full flex justify-center py-1">
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
            
            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-3 font-medium">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Requires active <strong className="text-slate-700">@iitrpr.ac.in</strong> account</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}