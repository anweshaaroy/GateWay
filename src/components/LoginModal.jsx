import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { 
  ShieldCheck, 
  ChevronDown, 
  IdCard, 
  GraduationCap, 
  Briefcase, 
  Building2, 
  Lock, 
  AlertCircle,
  X 
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

export default function LoginModal({ isOpen, onLogin, onClose }) {
  const [roleSelect, setRoleSelect] = useState("resident");
  const [residentType, setResidentType] = useState("student");
  const [entryNumber, setEntryNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse) => {
    // Validate roll number strictly for student resident category
    if (roleSelect === "resident" && residentType === "student" && !entryNumber.trim()) {
      setErrorMsg("Please enter your Student Entry / Roll Number before signing in.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // Forward credential token and requested roles to backend auth API
      const res = await fetch(`${BACKEND_URL}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: credentialResponse.credential,
          selectedRole: roleSelect,
          residentType: roleSelect === "resident" ? residentType : null,
          entryNumber: roleSelect === "resident" && residentType === "student" ? entryNumber.trim().toUpperCase() : null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server authentication failed (Status: ${res.status})`);
      }

      const data = await res.json();

      if (!data.success) {
        setErrorMsg(data.message || "Access Denied: Verification failed on server.");
        setLoading(false);
        return;
      }

      // Store authentic session token for future authorized API calls
      if (data.token) {
        localStorage.setItem("gateway_token", data.token);
      }

      if (onLogin) onLogin(data.user);
    } catch (err) {
      console.error("Backend Auth Error:", err);
      setErrorMsg(err.message || "Cannot contact authentication server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const residentOptions = [
    { id: "student", label: "Student", icon: GraduationCap },
    { id: "faculty", label: "Faculty", icon: Briefcase },
    { id: "official", label: "Official", icon: Building2 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-8 md:p-9 relative">
        {/* Optional Modal Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Portal Header */}
        <div className="flex items-center space-x-3.5 mb-6">
          <div className="bg-sky-600 text-white p-3 rounded-2xl shadow-md shadow-sky-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">GateWay Portal</h2>
            <p className="text-xs text-slate-500 font-medium">IIT Ropar Institutional Access</p>
          </div>
        </div>

        {/* Dynamic Error Box */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700 font-semibold leading-relaxed">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
            <div>{errorMsg}</div>
          </div>
        )}

        <div className="space-y-5">
          {/* Main Role Dropdown */}
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
                  if (e.target.value !== "resident") {
                    setEntryNumber("");
                  }
                }}
                className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-slate-300 bg-slate-50/50 hover:bg-white text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-600 appearance-none shadow-sm cursor-pointer outline-none transition"
              >
                <option value="resident">Resident: Student / Faculty / Official</option>
                <option value="admin">Security Admin Desk</option>
                <option value="guard">Guard Terminal Post</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Sub-Category for Residents */}
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
                          ? "border-sky-600 bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-600"
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

          {/* Roll Number Input (Students Only) */}
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
                  className="w-full text-sm pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 font-mono uppercase tracking-wider outline-none text-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Enter your roll number before signing in with Google.
              </p>
            </div>
          )}

          {/* Google SSO Button & Whitelist Notice */}
          <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
            <div className="w-full flex justify-center py-1">
              {loading ? (
                <div className="py-2.5 text-xs font-bold text-sky-600 animate-pulse">
                  Verifying with Security Server...
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setErrorMsg("Google Sign-In failed or was cancelled.")}
                  shape="pill"
                  text="signin_with"
                  theme="outline"
                  size="large"
                  width="100%"
                />
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-3 font-medium">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>
                Requires active <strong className="text-slate-700">@iitrpr.ac.in</strong> account
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}