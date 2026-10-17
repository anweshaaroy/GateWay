import React, { useState, useEffect } from "react";
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
  ShieldAlert,
  UserPlus,
  Calendar,
  IdCard,
  Building,
  Phone,
  Mail,
  CheckCircle,
  QrCode,
  Printer,
} from "lucide-react";

// Real Hardware Optical QR Scanner Modal
function CameraScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let html5QrCode = null;
    setErrorMsg("");

    const timer = setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode("qr-scanner-box");

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            html5QrCode
              .stop()
              .then(() => {
                onScanSuccess(decodedText);
              })
              .catch(() => {
                onScanSuccess(decodedText);
              });
          },
          () => {
            // Frame parsing loop
          }
        );
      } catch (err) {
        console.error("Camera launch error:", err);
        setErrorMsg(
          "Camera access denied or device not found. Please click the lock icon near address bar and allow camera access."
        );
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (html5QrCode) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch((e) => console.log(e));
      }
    };
  }, [isOpen, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Hardware Optical QR Scanner</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
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

// Instant Spot Walk-In Registration & QR Modal
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
  const [idDocUrl, setIdDocUrl] = useState("");
  const [generatedPass, setGeneratedPass] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setVisitorName("");
      setPhone("");
      setVisitorEmail("");
      setHostName("");
      setPurpose("Personal / Guest");
      setGeneratedPass(null);
      setIdDocName("");
      setIdDocUrl("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calculate Duration in Days
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffTime = Math.max(0, end - start);
  const calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdDocName(file.name);
      const url = URL.createObjectURL(file);
      setIdDocUrl(url);
    }
  };

  const handleCreatePass = (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !phone.trim() || !hostName.trim()) {
      alert("Please fill in Visitor Name, Phone Number, and Host details.");
      return;
    }

    // Standard 4-digit numeric passcode matching table audit format
    const randomDigits = Math.floor(1000 + Math.random() * 9000).toString();

    const newVisitorObj = {
      id: `spot_${Date.now()}`,
      passcode: randomDigits,
      name: visitorName.trim(),
      email: visitorEmail.trim() || `${phone.trim()}@visitor.spot`,
      phone: phone.trim(),
      hostName: hostName.trim(),
      hostAddress: "Campus Spot Clearance",
      hostIdDocType: "Official Security Spot Permit",
      purpose: purpose,
      arrivalDate: fromDate,
      exitDate: toDate,
      durationDays: calculatedDays,
      idType: idType,
      idDocName: idDocName || "walk_in_id_scan.jpg",
      idDocUrl:
        idDocUrl ||
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
      approvalStatus: "Approved",
      status: "Pending",
      requestTimestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      blacklisted: false,
    };

    setGeneratedPass(newVisitorObj);
    onRegisterSuccess(newVisitorObj, false);
  };

  const handleImmediateCheckIn = () => {
    if (generatedPass) {
      onRegisterSuccess(generatedPass, true);
      onClose();
    }
  };

  const handleSendEmailPass = () => {
    if (!generatedPass) return;

    const targetEmail = visitorEmail || generatedPass.email;
    const subject = encodeURIComponent(`IIT Ropar GateWay: Approved Campus Pass [${generatedPass.passcode}]`);
    
    const emailBody = encodeURIComponent(
`Hello ${generatedPass.name},

Your Spot Gate Pass for IIT Ropar Campus has been issued successfully.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GATE CLEARANCE PASS DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Passcode: ${generatedPass.passcode}
Visitor Name: ${generatedPass.name}
Host / Dept: ${generatedPass.hostName}
Purpose: ${generatedPass.purpose}
Validity: ${generatedPass.arrivalDate} to ${generatedPass.exitDate} (${generatedPass.durationDays} Days)
Gate Status: Approved for Instant Entry
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please show this Passcode or the verification QR code to the security guard at the gate.

Security Administration Desk
IIT Ropar Main Gate Terminal`
    );

    window.open(`mailto:${targetEmail}?subject=${subject}&body=${emailBody}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden flex flex-col">
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Instant Walk-in Spot Registration</h3>
              <p className="text-xs text-slate-400">
                Issue immediate gate passes for unscheduled campus entries
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[82vh] overflow-y-auto">
          {/* Left Form Side */}
          <div className="md:col-span-7 space-y-4">
            <form onSubmit={handleCreatePass} className="space-y-3.5">
              {/* Visitor Name & Phone */}
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
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
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
                      className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Visitor Email (For e-Pass Dispatch) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Visitor Email Address (Optional for e-Pass)
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder="e.g. visitor@gmail.com"
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              {/* Host Name / Department */}
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
                    placeholder="e.g. Prof. Sharma / Main Admin Building"
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
              </div>

              {/* Purpose of Visit Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Purpose of Visit *
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-500 outline-none cursor-pointer"
                >
                  <option value="Personal / Guest">Personal / Guest</option>
                  <option value="Academic Collaboration">Academic Collaboration</option>
                  <option value="Courier / Delivery">Courier / Delivery</option>
                  <option value="Facility Maintenance">Facility Maintenance</option>
                </select>
              </div>

              {/* Date to Date Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pass Validity (Date to Date) *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      required
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full text-xs font-semibold pl-9 pr-2 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="date"
                      required
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full text-xs font-semibold pl-9 pr-2 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-sky-700 font-semibold mt-1">
                  Stay Duration: <strong>{calculatedDays} Days</strong>
                </div>
              </div>

              {/* ID Proof Section */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Identification Proof
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white outline-none cursor-pointer"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Govt Organization ID">Govt Organization ID</option>
                  </select>
                  <label className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer text-xs text-slate-600 transition truncate">
                    <IdCard className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{idDocName || "Attach Document"}</span>
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
                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-md flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Issue Instant Pass & Generate QR</span>
              </button>
            </form>
          </div>

          {/* Right Pass Preview Side */}
          <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-between">
            <div className="w-full text-center">
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                Generated Passcard
              </span>

              {generatedPass ? (
                <div className="mt-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm w-full flex flex-col items-center">
                  <div className="w-32 h-32 bg-slate-900 rounded-xl p-2 flex items-center justify-center shadow-inner">
                    <div className="w-full h-full border-2 border-dashed border-sky-400 rounded-lg flex flex-col items-center justify-center text-white text-center">
                      <QrCode className="w-12 h-12 text-sky-400 animate-pulse" />
                      <span className="text-[9px] font-mono mt-1 text-slate-300">SCAN AT GATE</span>
                    </div>
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
                    <div className="text-slate-800 font-bold truncate">
                      {generatedPass.name}
                    </div>
                    <div className="text-slate-500 text-[11px] truncate">
                      Host: {generatedPass.hostName}
                    </div>
                    <div className="text-[11px] text-sky-700 font-semibold">
                      Validity: {generatedPass.arrivalDate} ➔ {generatedPass.exitDate}
                    </div>
                    <div className="inline-block mt-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      {generatedPass.purpose}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center px-4">
                  <QrCode className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                  <p className="text-xs font-medium">
                    Fill the form and click "Issue Pass" to view verification QR & Passcode.
                  </p>
                </div>
              )}
            </div>

            {/* Actions CTA Section */}
            {generatedPass && (
              <div className="w-full space-y-2 mt-4">
                <button
                  onClick={handleImmediateCheckIn}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Scan & Check-In Now</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSendEmailPass}
                    className="border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold py-2 px-2.5 rounded-xl text-[11px] transition flex items-center justify-center space-x-1 cursor-pointer truncate"
                  >
                    <Mail className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
                    <span>Send e-Pass</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-2.5 rounded-xl text-[11px] transition flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>Print Slip</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuardTerminal({ visitors, onStatusChange, onAddVisitor }) {
  const [query, setQuery] = useState("");
  const [isCamOpen, setIsCamOpen] = useState(false);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);

  // Overstay Calculation (Inside Campus and duration limit crossed)
  const isOverstayed = (v) => {
    return v.status === "Inside Campus" && v.durationDays && v.durationDays <= 2;
  };

  const insideCount = visitors.filter((v) => v.status === "Inside Campus").length;
  const pendingCount = visitors.filter((v) => v.status === "Pending").length;
  const overstayedCount = visitors.filter(isOverstayed).length;

  const filtered = visitors.filter(
    (v) =>
      v.passcode?.toLowerCase().includes(query.toLowerCase()) ||
      v.email?.toLowerCase().includes(query.toLowerCase()) ||
      v.name?.toLowerCase().includes(query.toLowerCase()) ||
      v.hostName?.toLowerCase().includes(query.toLowerCase())
  );

  // Handlers for Spot Pass Creation
  const handleSpotPassCreated = (newVisitor, autoCheckIn) => {
    if (onAddVisitor) {
      onAddVisitor(newVisitor);
    }
    if (autoCheckIn && onStatusChange) {
      onStatusChange(newVisitor.id, "Inside Campus");
    }
  };

  // CSV Audit Log Export Function
  const handleExportCSV = () => {
    if (!visitors || visitors.length === 0) {
      alert("No visitor audit records found to export.");
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
      `"${v.passcode || ""}"`,
      `"${v.name || ""}"`,
      `"${v.email || ""}"`,
      `"${v.hostName || ""}"`,
      `"${v.hostAddress || ""}"`,
      `"${v.purpose || ""}"`,
      `"${v.approvalStatus || ""}"`,
      `"${v.status || ""}"`,
      `"${v.checkInTime || "—"}"`,
      `"${v.checkOutTime || "—"}"`,
      `"${v.blacklisted ? "YES" : "NO"}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `IIT_Ropar_Gate_Audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Optical QR Recognition Handler
  const handleScanSuccess = (decodedText) => {
    setIsCamOpen(false);
    const matched = visitors.find(
      (v) =>
        v.passcode?.toLowerCase() === decodedText.trim().toLowerCase() ||
        v.id?.toLowerCase() === decodedText.trim().toLowerCase()
    );

    if (!matched) {
      alert(`Access Rejected: QR code "${decodedText}" not found in registered database!`);
      return;
    }

    if (matched.blacklisted) {
      alert(
        `🚨 SECURITY ALERT: ${matched.name} (${matched.passcode}) has been BLACKLISTED by Security Admin! Entry is strictly prohibited.`
      );
      return;
    }

    if (matched.approvalStatus !== "Approved") {
      alert(`Entry Denied: Pass status is currently "${matched.approvalStatus}".`);
      return;
    }

    if (matched.status !== "Inside Campus") {
      onStatusChange(matched.id, "Inside Campus");
      alert(`Verified: ${matched.name} (${matched.passcode}) Check-IN recorded successfully!`);
    } else {
      onStatusChange(matched.id, "Completed");
      alert(`Verified: ${matched.name} (${matched.passcode}) Check-OUT recorded successfully!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards with Overstay Widget */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Currently Inside</p>
            <p className="text-2xl font-bold text-emerald-600 mt-0.5">{insideCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-500 font-semibold uppercase">Overstay Alerts</p>
            <p className="text-2xl font-bold text-rose-600 mt-0.5">{overstayedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-500 font-semibold uppercase">Expected Today</p>
            <p className="text-2xl font-bold text-amber-600 mt-0.5">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={handleExportCSV}
          className="bg-sky-600 p-4 rounded-2xl text-white shadow-sm flex items-center justify-between cursor-pointer hover:bg-sky-700 transition"
        >
          <div>
            <p className="text-xs text-sky-200 font-semibold uppercase">Security Audit</p>
            <p className="text-sm font-bold mt-1">Download CSV</p>
          </div>
          <div className="p-2.5 bg-white/10 rounded-xl">
            <Download className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Bar: Search, Optical Scanner & Instant Spot Pass */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-1/2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Type 4-digit Passcode, Email ID, Host Name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          {/* Instant Walk-In Spot Pass Button */}
          <button
            onClick={() => setIsSpotModalOpen(true)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Issue Spot Pass</span>
          </button>

          {/* Launch Scanner */}
          <button
            onClick={() => setIsCamOpen(true)}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
            <span>Optical Scanner</span>
          </button>
        </div>
      </div>

      {/* Gate Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Passcode</th>
                <th className="py-3 px-3">Visitor Name</th>
                <th className="py-3 px-3">Host & Location</th>
                <th className="py-3 px-3">Purpose</th>
                <th className="py-3 px-3">Clearance</th>
                <th className="py-3 px-3">Gate Status</th>
                <th className="py-3 px-3">Check-IN Time</th>
                <th className="py-3 px-3">Check-OUT Time</th>
                <th className="py-3 px-3 text-right">Gate Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => {
                const overstay = isOverstayed(item);
                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50 transition ${
                      overstay ? "bg-amber-50/70 border-l-4 border-amber-500" : ""
                    } ${item.blacklisted ? "bg-rose-50 border-l-4 border-rose-600" : ""}`}
                  >
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {item.passcode}
                      {item.blacklisted && (
                        <span className="block text-[10px] text-rose-600 font-sans font-bold">
                          BLACKLISTED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <div className="text-[11px] text-slate-500">{item.email}</div>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <div className="font-medium text-slate-800">
                        {item.hostName} ({item.hostAddress})
                      </div>
                      <div className="text-slate-500 text-[11px]">{item.hostIdDocType}</div>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <span className="font-semibold text-slate-700">{item.purpose}</span>
                      <div className="text-[10px] text-slate-400">
                        {item.arrivalDate} to {item.exitDate}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          item.approvalStatus === "Approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {item.approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
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
                        <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                          OVERSTAY
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">
                      {item.checkInTime && item.checkInTime !== "—" ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <Clock className="w-3 h-3" />
                          <span>{item.checkInTime}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-700">
                      {item.checkOutTime && item.checkOutTime !== "—" ? (
                        <span className="inline-flex items-center space-x-1 text-slate-700 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Clock className="w-3 h-3" />
                          <span>{item.checkOutTime}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {item.approvalStatus === "Approved" && !item.blacklisted ? (
                        <div className="inline-flex space-x-1.5">
                          <button
                            onClick={() => onStatusChange(item.id, "Inside Campus")}
                            className="p-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            title="Record Check-IN"
                          >
                            <LogIn className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onStatusChange(item.id, "Completed")}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                            title="Record Check-OUT"
                          >
                            <LogOut className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-rose-500">
                          {item.blacklisted ? "Blocked (Flagged)" : "Locked"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optical Camera Modal */}
      <CameraScannerModal
        isOpen={isCamOpen}
        onClose={() => setIsCamOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Spot Walk-In Pass Registration Modal */}
      <SpotRegistrationModal
        isOpen={isSpotModalOpen}
        onClose={() => setIsSpotModalOpen(false)}
        onRegisterSuccess={handleSpotPassCreated}
      />
    </div>
  );
}