import React, { useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  UserCheck,
  Hourglass,
  AlertTriangle,
  Download,
  Search,
  Camera,
  LogIn,
  LogOut,
  Clock,
  X,
  UserPlus,
  Calendar,
  IdCard,
  Building,
  Phone,
  Mail,
  CheckCircle,
  QrCode,
  Printer,
  ShieldAlert,
  Loader2,
  RefreshCw,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

// Camera QR Scanner Modal Component
function CameraScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode = null;
    setErrorMsg("");
    setIsInitializing(true);

    const timer = setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("qr-scanner-box");

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decodedText) => {
            html5QrCode
              .stop()
              .then(() => onScanSuccess(decodedText))
              .catch(() => onScanSuccess(decodedText));
          },
          () => {}
        );
        setIsInitializing(false);
      } catch (err) {
        console.error("Camera launch error:", err);
        setErrorMsg("Camera access denied or device not found. Please permit camera access.");
        setIsInitializing(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (html5QrCode) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch((e) => console.debug("QR Stop Cleanup:", e));
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">Optical Gate Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          {errorMsg ? (
            <div className="p-6 text-center text-rose-400 text-xs bg-rose-950/30 border border-rose-800/40 rounded-2xl w-full">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <p className="font-semibold">{errorMsg}</p>
            </div>
          ) : (
            <div className="w-full bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-square flex items-center justify-center relative">
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 bg-slate-900/90 z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                  <span className="text-xs font-medium">Starting Optical Lens...</span>
                </div>
              )}
              <div id="qr-scanner-box" className="w-full h-full" />
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3 text-center">
            Point camera directly at visitor's physical or digital QR passcode.
          </p>
        </div>
      </div>
    </div>
  );
}

// Spot Walk-In Registration Modal
function SpotRegistrationModal({ isOpen, onClose, onRegisterSuccess }) {
  const [visitorName, setVisitorName] = useState("");
  const [phone, setPhone] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [hostName, setHostName] = useState("");
  const [purpose, setPurpose] = useState("Personal / Guest");
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [idType, setIdType] = useState("Aadhaar Card");
  const [idDocName, setIdDocName] = useState("");
  const [generatedPass, setGeneratedPass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setVisitorName("");
      setPhone("");
      setVisitorEmail("");
      setHostName("");
      setPurpose("Personal / Guest");
      setGeneratedPass(null);
      setIdDocName("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffTime = Math.max(0, end - start);
  const calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdDocName(file.name);
    }
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !phone.trim() || !hostName.trim()) {
      alert("Please fill in Visitor Name, Phone Number, and Host details.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      visitorName: visitorName.trim(),
      phone: phone.trim(),
      visitorEmail: visitorEmail.trim(),
      hostName: hostName.trim(),
      purpose,
      fromDate,
      toDate,
      calculatedDays,
      idType,
      idDocName: idDocName || "walk_in_id.jpg",
    };

    try {
      const res = await fetch(`${BACKEND_URL}/guard/spot-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success && data.pass) {
        setGeneratedPass(data.pass);
        onRegisterSuccess(data.pass, false);
      } else {
        throw new Error(data.message || "Endpoint error");
      }
    } catch (err) {
      console.warn("Backend offline or unreachable, using local fallback pass generation:", err);
      const fallbackObj = {
        id: `spot_${Date.now()}`,
        passcode: Math.floor(1000 + Math.random() * 9000).toString(),
        name: visitorName.trim(),
        email: visitorEmail.trim() || `${phone.trim()}@visitor.spot`,
        phone: phone.trim(),
        hostName: hostName.trim(),
        hostAddress: "Campus Main Facility",
        hostIdDocType: "Instant Guard Permit",
        purpose,
        arrivalDate: fromDate,
        exitDate: toDate,
        durationDays: calculatedDays,
        idType,
        idDocName: idDocName || "walk_in_id_scan.jpg",
        approvalStatus: "Approved",
        status: "Pending",
        requestTimestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        blacklisted: false,
      };
      setGeneratedPass(fallbackObj);
      onRegisterSuccess(fallbackObj, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImmediateCheckIn = () => {
    if (generatedPass) {
      onRegisterSuccess(generatedPass, true);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col">
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-wide">Instant Walk-In Spot Pass</h3>
              <p className="text-xs text-slate-400">Issue on-demand gate passes for unregistered arrivals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[82vh] overflow-y-auto">
          <div className="md:col-span-7 space-y-4">
            <form onSubmit={handleCreatePass} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Visitor Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder="e.g. visitor@gmail.com"
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Host Name or Department *
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="e.g. Admin Block / Dept Head"
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Purpose of Visit *
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer transition"
                >
                  <option value="Personal / Guest">Personal / Guest</option>
                  <option value="Official Meeting">Official Meeting</option>
                  <option value="Courier / Delivery">Courier / Delivery</option>
                  <option value="Facility Maintenance">Facility Maintenance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pass Validity *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      required
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full text-xs font-semibold pl-9 pr-2 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      required
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full text-xs font-semibold pl-9 pr-2 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-sky-700 font-semibold mt-1">
                  Stay Duration: <strong>{calculatedDays} Day(s)</strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  ID Verification Proof
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white outline-none cursor-pointer"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Govt Organization ID">Govt Organization ID</option>
                  </select>
                  <label className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer text-xs text-slate-600 transition truncate">
                    <IdCard className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{idDocName || "Attach Photo ID"}</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Security Pass...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Issue Instant Pass & Generate QR</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between">
            <div className="w-full text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Generated Passcard
              </span>
              {generatedPass ? (
                <div className="mt-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full flex flex-col items-center">
                  <div className="w-32 h-32 bg-white rounded-xl p-2 flex items-center justify-center border border-slate-200">
                    <QRCodeSVG value={generatedPass.passcode} size={110} level="H" />
                  </div>

                  <div className="mt-3 text-center">
                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">
                      Verification Passcode
                    </span>
                    <span className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                      {generatedPass.passcode}
                    </span>
                  </div>

                  <div className="w-full mt-3 pt-3 border-t border-slate-100 text-left space-y-1 text-xs">
                    <div className="text-slate-800 font-bold truncate">{generatedPass.name}</div>
                    <div className="text-slate-500 text-[11px] truncate">
                      Host: {generatedPass.hostName}
                    </div>
                    <div className="text-[11px] text-sky-700 font-semibold">
                      Validity: {generatedPass.arrivalDate} ➔ {generatedPass.exitDate}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                  <QrCode className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-medium">
                    Fill the form and submit to view instantaneous QR & verification credentials.
                  </p>
                </div>
              )}
            </div>

            {generatedPass && (
              <div className="w-full space-y-2 mt-4">
                <button
                  onClick={handleImmediateCheckIn}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Scan & Check-In Immediately</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="w-full border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-2.5 rounded-xl text-[11px] transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Print Gate Slip</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuardTerminal({ visitors = [], onStatusChange, onAddVisitor }) {
  const [query, setQuery] = useState("");
  const [isCamOpen, setIsCamOpen] = useState(false);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [loadingVisitorId, setLoadingVisitorId] = useState(null);

  // Accurate Overstay calculation against today's date
  const isOverstayed = (v) => {
    if (v?.status !== "Inside Campus") return false;
    if (!v?.exitDate) return false;
    const today = new Date().toISOString().slice(0, 10);
    return today > v.exitDate;
  };

  const insideCount = useMemo(
    () => visitors.filter((v) => v?.status === "Inside Campus").length,
    [visitors]
  );
  const pendingCount = useMemo(
    () => visitors.filter((v) => v?.status === "Pending").length,
    [visitors]
  );
  const overstayedCount = useMemo(
    () => visitors.filter(isOverstayed).length,
    [visitors]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter(
      (v) =>
        v?.passcode?.toLowerCase().includes(q) ||
        v?.email?.toLowerCase().includes(q) ||
        v?.name?.toLowerCase().includes(q) ||
        v?.hostName?.toLowerCase().includes(q)
    );
  }, [visitors, query]);

  // Synchronize gate status change with backend API
  const handleUpdateGateStatus = async (visitorId, targetStatus) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setLoadingVisitorId(visitorId);

    try {
      const res = await fetch(`${BACKEND_URL}/guard/gate-status/${visitorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, timestamp }),
      });
      const data = await res.json();
      if (data.success) {
        if (onStatusChange) onStatusChange(visitorId, targetStatus, timestamp);
      } else {
        throw new Error(data.message || "Failed to update on server");
      }
    } catch (err) {
      console.warn("Server unavailable or status patch error, updating local state:", err);
      if (onStatusChange) onStatusChange(visitorId, targetStatus, timestamp);
    } finally {
      setLoadingVisitorId(null);
    }
  };

  const handleSpotPassCreated = (newVisitor, autoCheckIn) => {
    if (onAddVisitor) onAddVisitor(newVisitor);
    if (autoCheckIn) handleUpdateGateStatus(newVisitor.id, "Inside Campus");
  };

  // Export audit table to CSV format
  const handleExportCSV = () => {
    if (!visitors || visitors.length === 0) {
      alert("No visitor records available to export.");
      return;
    }
    const headers = [
      "Passcode",
      "Visitor Name",
      "Email",
      "Host Name",
      "Host Location",
      "Purpose",
      "Clearance",
      "Gate Status",
      "Check-In Time",
      "Check-Out Time",
      "Blacklisted",
    ];
    const rows = visitors.map((v) => [
      `"${v?.passcode || ""}"`,
      `"${v?.name || ""}"`,
      `"${v?.email || ""}"`,
      `"${v?.hostName || ""}"`,
      `"${v?.hostAddress || ""}"`,
      `"${v?.purpose || ""}"`,
      `"${v?.approvalStatus || ""}"`,
      `"${v?.status || ""}"`,
      `"${v?.checkInTime || "—"}"`,
      `"${v?.checkOutTime || "—"}"`,
      `"${v?.blacklisted ? "YES" : "NO"}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Gate_Terminal_Audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScanSuccess = (decodedText) => {
    setIsCamOpen(false);
    const textClean = decodedText.trim().toLowerCase();
    const matched = visitors.find(
      (v) =>
        v?.passcode?.toLowerCase() === textClean ||
        v?.id?.toString().toLowerCase() === textClean
    );

    if (!matched) {
      alert(`Access Rejected: Passcode "${decodedText}" not found in current logs!`);
      return;
    }
    if (matched.blacklisted) {
      alert(`🚨 SECURITY ALERT: ${matched.name} (${matched.passcode}) is BLACKLISTED! Entry denied.`);
      return;
    }
    if (matched.approvalStatus !== "Approved") {
      alert(`Entry Denied: Clearance status is currently "${matched.approvalStatus}".`);
      return;
    }

    if (matched.status !== "Inside Campus") {
      handleUpdateGateStatus(matched.id, "Inside Campus");
      alert(`Verified: ${matched.name} (${matched.passcode}) Check-IN recorded successfully!`);
    } else {
      handleUpdateGateStatus(matched.id, "Completed");
      alert(`Verified: ${matched.name} (${matched.passcode}) Check-OUT recorded successfully!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Currently Inside</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{insideCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Overstay Alerts</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{overstayedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Expected Today</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={handleExportCSV}
          className="bg-slate-900 hover:bg-slate-800 p-5 rounded-2xl text-white shadow-sm flex items-center justify-between cursor-pointer transition"
        >
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Security Audit</p>
            <p className="text-sm font-bold mt-1 tracking-wide">Export CSV Log</p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl">
            <Download className="w-5 h-5 text-sky-400" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search Passcode, Name, Host..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsSpotModalOpen(true)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Issue Spot Pass</span>
          </button>

          <button
            onClick={() => setIsCamOpen(true)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Optical Scanner</span>
          </button>
        </div>
      </div>

      {/* Gate Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Passcode</th>
                <th className="py-3.5 px-4">Visitor</th>
                <th className="py-3.5 px-4">Host & Details</th>
                <th className="py-3.5 px-4">Purpose</th>
                <th className="py-3.5 px-4">Clearance</th>
                <th className="py-3.5 px-4">Gate Status</th>
                <th className="py-3.5 px-4">Check-IN</th>
                <th className="py-3.5 px-4">Check-OUT</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400 text-xs font-medium">
                    No visitor records found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const overstay = isOverstayed(item);
                  const isActionLoading = loadingVisitorId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition ${
                        overstay ? "bg-rose-50/60" : ""
                      } ${item.blacklisted ? "bg-red-50/80" : ""}`}
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                          {item.passcode}
                        </span>
                        {item.blacklisted && (
                          <span className="flex items-center space-x-1 mt-1 text-[10px] text-rose-600 font-bold uppercase">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Blacklisted</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{item.name}</span>
                        <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{item.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-800">
                          {item.hostName} {item.hostAddress ? `(${item.hostAddress})` : ""}
                        </div>
                        <div className="text-slate-500 text-[11px]">{item.hostIdDocType || "Campus Host"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-medium text-slate-700">{item.purpose}</span>
                        <div className="text-[10px] text-slate-400">
                          {item.arrivalDate} ➔ {item.exitDate}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                            item.approvalStatus === "Approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.approvalStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              item.status === "Inside Campus"
                                ? "bg-emerald-100 text-emerald-800"
                                : item.status === "Completed"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {item.status}
                          </span>
                          {overstay && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                              OVERSTAY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {item.checkInTime && item.checkInTime !== "—" ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            <Clock className="w-3 h-3" />
                            <span>{item.checkInTime}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                        {item.checkOutTime && item.checkOutTime !== "—" ? (
                          <span className="inline-flex items-center space-x-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Clock className="w-3 h-3" />
                            <span>{item.checkOutTime}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {isActionLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400 inline-block" />
                        ) : item.approvalStatus === "Approved" && !item.blacklisted ? (
                          <div className="inline-flex space-x-1.5">
                            <button
                              onClick={() => handleUpdateGateStatus(item.id, "Inside Campus")}
                              disabled={item.status === "Inside Campus"}
                              className="p-1.5 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                              title="Record Check-IN"
                            >
                              <LogIn className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdateGateStatus(item.id, "Completed")}
                              disabled={item.status !== "Inside Campus"}
                              className="p-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                              title="Record Check-OUT"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] font-bold text-rose-500">
                            {item.blacklisted ? "Blocked" : "Denied"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CameraScannerModal
        isOpen={isCamOpen}
        onClose={() => setIsCamOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <SpotRegistrationModal
        isOpen={isSpotModalOpen}
        onClose={() => setIsSpotModalOpen(false)}
        onRegisterSuccess={handleSpotPassCreated}
      />
    </div>
  );
}