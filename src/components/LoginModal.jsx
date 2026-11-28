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

// Backend API root URL configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

export default function LoginModal({ isOpen, onLogin, onClose }) {
  const [roleSelect, setRoleSelect] = useState("resident");
  const [residentType, setResidentType] = useState("student");
  const [entryNumber, setEntryNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Return early if the modal is hidden
  if (!isOpen) return null;

  const handleGoogleSuccess = async (credentialResponse) => {
    // Validate entry/roll number strictly for student residents
    if (roleSelect === "resident" && residentType === "student" && !entryNumber.trim()) {
      setErrorMsg("Please enter your Student Entry / Roll Number before signing in.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // Dispatch credential token and requested roles to backend authentication endpoint
      const res = await fetch(`${BACKEND_URL}/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: credentialResponse.credential,
          selectedRole: roleSelect,
          residentType: roleSelect === "resident" ? residentType : null,
          entryNumber:
            roleSelect === "resident" && residentType === "student"
              ? entryNumber.trim().toUpperCase()
              : null,
        }),
      });

      // Handle bad HTTP response codes
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Server authentication failed (Status: ${res.status})`);
      }

      const data = await res.json();

      // Guard against backend verification refusal
      if (!data.success) {
        setErrorMsg(data.message || "Access Denied: Verification failed on server.");
        setLoading(false);
        return;
      }

      // Store authentic session token under all common keys for backward and forward compatibility
      if (data.token) {
        localStorage.setItem("gateway_token", data.token);
        localStorage.setItem("token", data.token);
        localStorage.setItem("authToken", data.token);
      }

      // Pass user payload with active token attached to parent component
      if (onLogin) {
        onLogin({
          ...data.user,
          token: data.token,
        });
      }
    } catch (err) {
      console.error("Backend Auth Error:", err);
      setErrorMsg(err.message || "Cannot contact authentication server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Sub-categories for resident portal
  const residentOptions = [
    { id: "student", label: "Student", icon: GraduationCap },
    { id: "faculty", label: "Faculty", icon: Briefcase },
    { id: "official", label: "Staff", icon: Building2 },
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
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">GateWay Portal</h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-medium">IIT Ropar Institutional Access</p>
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
            <label className="block text-[14px] font-bold text-slate-900 mb-2">
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
                className="w-full text-[15px] font-bold px-4 py-3.5 rounded-xl border border-slate-300 bg-slate-50/60 hover:bg-white text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-600 appearance-none shadow-sm cursor-pointer outline-none transition"
              >
                <option value="resident">Resident Portal</option>
                <option value="admin">Security Admin Desk</option>
                <option value="guard">Security Guard Terminal</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-4 w-4.5 h-4.5 text-slate-500" />
            </div>
          </div>

          {/* Sub-Category for Residents */}
          {roleSelect === "resident" && (
            <div>
              <label className="block text-[14px] font-bold text-slate-900 mb-2">
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
                      className={`flex items-center justify-center space-x-2 py-3 px-3 rounded-xl border text-[15px] transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "border-sky-600 bg-sky-50 text-sky-700 shadow-sm ring-2 ring-sky-600/30 font-bold"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 shrink-0" />
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
              <label className="block text-[14px] font-bold text-slate-900 mb-2">
                Student Roll / Entry No. *
              </label>
              <div className="relative">
                <IdCard className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={entryNumber}
                  onChange={(e) => setEntryNumber(e.target.value)}
                  placeholder="e.g. 2024CSB1001"
                  className="w-full text-base pl-11 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 font-mono uppercase font-bold text-slate-900 tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 placeholder:font-normal outline-none bg-slate-50/50 focus:bg-white transition"
                />
              </div>
            </div>
          )}

          {/* Google SSO Button */}
          <div className="pt-3 border-t border-slate-100 flex flex-col items-center">
            <div className="w-full flex justify-center py-1">
              {loading ? (
                <div className="py-2.5 text-xs font-bold text-sky-600 animate-pulse">
                  Verifying with Security Server...
                </div>
              ) : (
                <div className="rounded-full shadow-md shadow-sky-600/20 hover:shadow-lg hover:shadow-sky-600/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setErrorMsg("Google Sign-In failed or was cancelled.")}
                    shape="pill"
                    text="signin_with"
                    theme="filled_blue"
                    size="large"
                    width="240"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-3 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Requires active <strong className="text-slate-700 font-semibold">@iitrpr.ac.in</strong> account
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}