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
  Sparkles,
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
          `Access Denied: ${userEmail} is unauthorized. Please use your official (@iitrpr.ac.in) email address.`
        );
        return;
      }

      // 2. Student Roll Number Requirement
      if (roleSelect === "resident" && residentType === "student" && !entryNumber.trim()) {
        setErrorMsg("Please enter your Student Roll Number to proceed.");
        return;
      }

      // 3. Dispatch Auth Data
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
      setErrorMsg("Authentication failed. Please verify credentials and try again.");
    }
  };

  const residentOptions = [
    { id: "student", label: "Student", icon: GraduationCap },
    { id: "faculty", label: "Faculty", icon: Briefcase },
    { id: "official", label: "Official", icon: Building2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/85 backdrop-blur-xl">
      {/* Background Decorative Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative w-full max-w-4xl bg-slate-900/90 border border-slate-800/80 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 backdrop-blur-2xl">
        
        {/* Left Branding Side (IIT Ropar Themed Hero) */}
        <div className="md:col-span-5 bg-gradient-to-br from-sky-900/40 via-slate-900 to-slate-950 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Campus Security Framework</span>
            </div>

            <div className="flex items-center space-x-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">GateWay</h1>
                <p className="text-xs uppercase tracking-widest text-sky-400 font-bold">Portal Access</p>
              </div>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed mt-4">
              Secure single-sign-on verification engineered exclusively for IIT Ropar residents, administrators, and gate surveillance posts.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/60 space-y-3">
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Institutional 256-bit OAuth Handshake</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300">
              <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span>Strict Whitelisted Access Control</span>
            </div>
          </div>
        </div>

        {/* Right Form Interaction Side */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-center bg-slate-900/60">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Sign In to Dashboard</h2>
            <p className="text-xs text-slate-400 mt-1">Select your access privilege and authenticate via institutional mail.</p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-400 text-xs leading-relaxed animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
              <div className="font-medium">{errorMsg}</div>
            </div>
          )}

          <div className="space-y-5">
            {/* Login Portal Selector */}
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
                Designated Terminal *
              </label>
              <div className="relative">
                <select
                  value={roleSelect}
                  onChange={(e) => {
                    setRoleSelect(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full text-sm font-medium px-4 py-3 rounded-xl bg-slate-800/70 border border-slate-700/80 text-white hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition appearance-none cursor-pointer"
                >
                  <option value="resident">Resident (Student / Faculty / Official)</option>
                  <option value="admin">Security Administration Desk</option>
                  <option value="guard">Guard Terminal Post</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Resident Role Pills (Segmented Selector) */}
            {roleSelect === "resident" && (
              <div>
                <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
                  Classification *
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
                        className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "bg-sky-500/15 border-sky-400 text-sky-400 shadow-sm shadow-sky-500/10"
                            : "bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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

            {/* Student ID Card Input */}
            {roleSelect === "resident" && residentType === "student" && (
              <div className="transition-all duration-200">
                <label className="block text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2">
                  Student Entry / Roll Number *
                </label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={entryNumber}
                    onChange={(e) => setEntryNumber(e.target.value)}
                    placeholder="e.g. 2024CSB1001"
                    className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono uppercase tracking-wider"
                  />
                </div>
              </div>
            )}

            {/* Google Single Sign-On Button */}
            <div className="pt-2 flex flex-col items-center">
              <div className="w-full flex justify-center py-1">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMsg("Google Sign-In failed or was cancelled.")}
                  theme="filled_black"
                  shape="pill"
                  size="large"
                  text="continue_with"
                  width="100%"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-3 text-center">
                Institutional login restricted to verified <span className="text-slate-300 font-mono font-medium">@iitrpr.ac.in</span> accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}