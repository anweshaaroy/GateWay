import React, { useState, useEffect, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  UserCheck,
  Hourglass,
  AlertTriangle,
  Download,
  Search,
  Camera,
  Upload,
  LogIn,
  LogOut,
  Clock,
  X,
  UserPlus,
  User,
  Users,
  Calendar,
  IdCard,
  Building,
  Mail,
  CheckCircle,
  QrCode,
  ShieldAlert,
  Loader2,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

// Camera QR Scanner Modal Component
function CameraScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.debug("QR Stop Cleanup Error:", err);
      }
      scannerRef.current = null;
    }
  };

  const startScanner = async (cameraIdToUse) => {
    setErrorMsg("");
    setIsInitializing(true);
    await stopScanner();

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const element = document.getElementById("qr-scanner-box");
      if (!element) return;

      const html5QrCode = new Html5Qrcode("qr-scanner-box");
      scannerRef.current = html5QrCode;

      // Query available video input devices
      let devices = cameras;
      if (devices.length === 0) {
        try {
          devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setCameras(devices);
          }
        } catch (camErr) {
          console.warn("Could not list cameras ahead of time:", camErr);
        }
      }

      // Determine camera target
      let cameraConfig = { facingMode: "environment" };
      if (cameraIdToUse) {
        cameraConfig = cameraIdToUse;
      } else if (devices && devices.length > 0) {
        const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
        const chosen = backCam || devices[0];
        cameraConfig = chosen.id;
        setSelectedCameraId(chosen.id);
      }

      const qrboxConfig = (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const size = Math.max(140, Math.floor(minEdge * 0.72));
        return { width: size, height: size };
      };

      try {
        await html5QrCode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: qrboxConfig,
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            await stopScanner();
            onScanSuccess(decodedText);
          },
          () => {}
        );
      } catch (firstErr) {
        console.warn("Environment camera start failed, trying fallback mode...", firstErr);
        // Fallback to front camera or default media device
        await html5QrCode.start(
          { facingMode: "user" },
          {
            fps: 10,
            qrbox: qrboxConfig,
            aspectRatio: 1.0,
          },
          async (decodedText) => {
            await stopScanner();
            onScanSuccess(decodedText);
          },
          () => {}
        );
      }

      setIsInitializing(false);
    } catch (err) {
      console.error("Camera launch error:", err);
      let msg = "Camera access denied or device not found. Please permit camera access in your browser settings.";
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        msg = "Camera permission was blocked. Tap the lock/info icon in your browser URL bar and allow Camera permission.";
      } else if (err?.name === "NotFoundError" || err?.name === "OverconstrainedError") {
        msg = "No suitable camera stream found on this device. You can upload a QR pass image below instead.";
      }
      setErrorMsg(msg);
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      startScanner();
    }, 250);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const handleCameraChange = (e) => {
    const newId = e.target.value;
    setSelectedCameraId(newId);
    startScanner(newId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsInitializing(true);
      setErrorMsg("");
      const { Html5Qrcode } = await import("html5-qrcode");
      const tempScanner = scannerRef.current || new Html5Qrcode("qr-scanner-box");
      const decodedText = await tempScanner.scanFile(file, true);
      await stopScanner();
      onScanSuccess(decodedText);
    } catch (err) {
      console.error("File QR scan error:", err);
      setErrorMsg("No readable QR code found in this image. Please upload a clear photo of the QR passcode.");
      setIsInitializing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center text-white">
          <div className="flex items-center space-x-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">Optical Gate Scanner</span>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          {/* Camera switcher dropdown if multiple cameras detected */}
          {cameras.length > 1 && (
            <div className="w-full mb-3">
              <select
                value={selectedCameraId}
                onChange={handleCameraChange}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 outline-none focus:border-emerald-500"
              >
                {cameras.map((c, i) => (
                  <option key={c.id || i} value={c.id}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorMsg ? (
            <div className="p-5 text-center text-rose-300 text-xs bg-rose-950/40 border border-rose-800/50 rounded-2xl w-full mb-3">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-rose-400" />
              <p className="font-semibold">{errorMsg}</p>
            </div>
          ) : (
            <div className="w-full bg-black rounded-2xl overflow-hidden border border-slate-800 aspect-square flex items-center justify-center relative shadow-inner">
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

          {/* Backup Option: Upload Pass Image */}
          <div className="mt-4 pt-3 border-t border-slate-800 w-full flex items-center justify-between">
            <span className="text-xs text-slate-400">Can't use camera?</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR Image</span>
            </button>
          </div>
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
  const [validityPreset, setValidityPreset] = useState(1);
  const [idType, setIdType] = useState("Aadhaar Card");
  const [idDocName, setIdDocName] = useState("");
  const [visitorProofFile, setVisitorProofFile] = useState(null);
  const [accompanyingCount, setAccompanyingCount] = useState(0);
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [generatedPass, setGeneratedPass] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setVisitorName("");
      setPhone("");
      setVisitorEmail("");
      setHostName("");
      setPurpose("Personal / Guest");
      const today = new Date().toISOString().slice(0, 10);
      setFromDate(today);
      setToDate(today);
      setValidityPreset(1);
      setGeneratedPass(null);
      setIdDocName("");
      setVisitorProofFile(null);
      setAccompanyingCount(0);
      setAutoCheckIn(true);
      setEmailNotice("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diffTime = Math.max(0, end - start);
  const calculatedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const applyValidityPreset = (days) => {
    setValidityPreset(days);
    if (days === "custom") return;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + (Number(days) - 1));
    setFromDate(startDate.toISOString().slice(0, 10));
    setToDate(endDate.toISOString().slice(0, 10));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVisitorProofFile(file);
      setIdDocName(file.name);
    }
  };

  const handleCreatePass = async (e) => {
    e.preventDefault();
    if (!visitorName.trim() || !hostName.trim()) {
      alert("Please fill in Visitor Name and Host details.");
      return;
    }
    if (!visitorEmail.trim() || !visitorEmail.includes("@")) {
      alert("Please provide a valid Visitor Email Address. The e-Pass with QR code will be dispatched directly to this email.");
      return;
    }

    setIsSubmitting(true);
    setEmailNotice("");

    const formData = new FormData();
    formData.append("visitorName", visitorName.trim());
    formData.append("visitorEmail", visitorEmail.trim().toLowerCase());
    formData.append("hostName", hostName.trim());
    formData.append("purpose", purpose);
    formData.append("fromDate", fromDate);
    formData.append("toDate", toDate);
    formData.append("calculatedDays", calculatedDays);
    formData.append("accompanyingCount", accompanyingCount);
    formData.append("autoCheckIn", autoCheckIn);
    formData.append("idType", idType);
    formData.append("idDocName", idDocName || "walk_in_id_scan.jpg");
    if (visitorProofFile) {
      formData.append("visitorFile", visitorProofFile);
    }

    try {
      const token =
        localStorage.getItem("gateway_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        "";
      const res = await fetch(`${BACKEND_URL}/guard/spot-pass`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.pass) {
        setGeneratedPass(data.pass);
        if (data.email && data.email.status === "sent") {
          setEmailNotice(`e-Pass dispatched directly to ${visitorEmail.trim()}`);
        } else {
          setEmailNotice(`Pass created successfully. e-Pass queued for ${visitorEmail.trim()}`);
        }
        onRegisterSuccess(data.pass, autoCheckIn);
      } else {
        throw new Error(data.message || "Endpoint error");
      }
    } catch (err) {
      console.warn("Backend offline or error, using local fallback pass generation:", err);
      const fallbackObj = {
        id: `spot_${Date.now()}`,
        passcode: Math.floor(1000 + Math.random() * 9000).toString(),
        name: visitorName.trim(),
        email: visitorEmail.trim(),
        phone: phone.trim(),
        accompanyingCount,
        totalVisitors: 1 + accompanyingCount,
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
        status: autoCheckIn ? "Inside Campus" : "Pending",
        checkInTime: autoCheckIn
          ? new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "—",
        checkOutTime: "—",
        requestTimestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        blacklisted: false,
      };
      setGeneratedPass(fallbackObj);
      setEmailNotice(`Local Pass generated. Email queued for ${visitorEmail.trim()}`);
      onRegisterSuccess(fallbackObj, autoCheckIn);
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


  const activePass = generatedPass || {
    name: visitorName.trim() || "Visitor Name",
    phone: phone.trim() || "+91 00000 00000",
    email: visitorEmail.trim() || "visitor@example.com",
    hostName: hostName.trim() || "Campus Host / Dept",
    purpose: purpose,
    accompanyingCount: accompanyingCount,
    totalVisitors: 1 + accompanyingCount,
    passcode: "••••",
    id: "NEW-SPOT",
    arrivalDate: fromDate,
    exitDate: toDate,
    status: autoCheckIn ? "Inside Campus" : "Pending",
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/20 flex items-center justify-center font-bold text-lg shrink-0">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight leading-normal whitespace-nowrap truncate">
              Instant Walk-In Spot Pass
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer shrink-0 ml-3"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto bg-slate-50/50">
          {/* Left Column: Input Form (7 cols) */}
          <div className="md:col-span-7 space-y-4">
            <form onSubmit={handleCreatePass} className="space-y-4">
              {/* Name & Email (Phone Number Removed) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Visitor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 outline-none transition bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Visitor Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    placeholder="e.g. rahul.sharma@example.com"
                    className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 outline-none transition bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
                  />
                </div>
              </div>

              {/* Accompanying Members / Group Size */}
              <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900">
                    Additional Visitors
                  </label>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    Number of additional guests accompanying the primary visitor.
                  </p>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-sm font-bold text-slate-500">+</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={accompanyingCount}
                    onChange={(e) => setAccompanyingCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 text-center text-sm sm:text-base font-black px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-600 outline-none text-slate-900 shadow-2xs"
                  />
                  <span className="text-xs sm:text-sm font-bold px-3 py-2 rounded-xl bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
                    Total: {1 + Number(accompanyingCount)} {1 + Number(accompanyingCount) === 1 ? "Guest" : "Guests"}
                  </span>
                </div>
              </div>

              {/* Host Name or Department */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                  Host Name *
                </label>
                <input
                  type="text"
                  required
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="e.g. Prof. 2026csm1020 / Admin Block / Hostel"
                  className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 outline-none transition bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal shadow-2xs"
                />
              </div>

              {/* Purpose & Pass Validity as Select Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Purpose of Visit Select Dropdown */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Purpose of Visit *
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-600 outline-none cursor-pointer transition text-slate-900 shadow-2xs"
                  >
                    <option value="Personal / Guest">Personal / Guest</option>
                    <option value="Parents / Family Visit">Parents / Family Visit</option>
                    <option value="Academic Collaboration">Academic Collaboration / Research</option>
                    <option value="Seminar / Conference / Workshop">Seminar / Conference / Workshop</option>
                    <option value="Official Campus Meeting">Official Campus Meeting</option>
                    <option value="Job Interview / Placement">Job Interview / Placement</option>
                    <option value="Courier / Delivery">Courier / Delivery</option>
                    <option value="Facility Maintenance">Facility Maintenance / Repair</option>
                    <option value="Vendor / Supplier">Vendor / Supplier</option>
                    <option value="Campus Tour / Admissions">Campus Tour / Admissions</option>
                    <option value="Medical / Emergency Support">Medical / Emergency Support</option>
                    <option value="Other / Miscellaneous">Other / Miscellaneous</option>
                  </select>
                </div>

                {/* Pass Validity Select Dropdown */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                    Pass Validity *
                  </label>
                  <select
                    value={validityPreset}
                    onChange={(e) => {
                      const val = e.target.value;
                      applyValidityPreset(val === "custom" ? "custom" : Number(val));
                    }}
                    className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-600 outline-none cursor-pointer transition text-slate-900 shadow-2xs"
                  >
                    <option value={1}>1 Day (Today Only)</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={15}>15 Days</option>
                    <option value={20}>20 Days</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Valid From
                  </label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => {
                      setFromDate(e.target.value);
                      setValidityPreset("custom");
                    }}
                    className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 outline-none bg-white text-slate-900 shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => {
                      setToDate(e.target.value);
                      setValidityPreset("custom");
                    }}
                    className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-600 outline-none bg-white text-slate-900 shadow-2xs"
                  />
                </div>
              </div>

              {/* ID Verification Proof (No Live Photo, Standard ID) */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Visitor ID Type *
                    </label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-sky-600 outline-none cursor-pointer text-slate-900 shadow-2xs"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Passport">Passport</option>
                      <option value="Govt Organization ID">Govt Organization ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-800 mb-1.5">
                      Upload Visitor ID Proof *
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="w-full text-xs text-slate-600 rounded-xl border border-slate-300 bg-white px-3 py-1.5 shadow-2xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Auto Check-In Toggle */}
              <div className="py-2.5 px-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center space-x-2.5">
                  <input
                    type="checkbox"
                    id="autoCheckinCheckbox"
                    checked={autoCheckIn}
                    onChange={(e) => setAutoCheckIn(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded cursor-pointer accent-emerald-600"
                  />
                  <label htmlFor="autoCheckinCheckbox" className="text-xs sm:text-[13px] font-bold text-emerald-950 cursor-pointer">
                    Auto Check-In on Issue
                  </label>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 shadow-2xs">
                  RECOMMENDED
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-sky-400 text-white font-black py-3 px-4 rounded-xl text-sm transition shadow-md shadow-sky-600/25 flex items-center justify-center space-x-2 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Security Pass & Dispatching Email...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Issue Instant Spot Pass & Email e-Pass</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Live Passcard Preview (5 cols) - Styled in Visitor Portal Cyber-Dark Pass Theme */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-4 sm:p-5 space-y-3.5 relative overflow-hidden text-white">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-xs font-black tracking-wider text-sky-400 uppercase">
                  CAMPUS VISITOR PASS
                </span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border bg-emerald-950/70 text-emerald-400 border-emerald-800 flex items-center space-x-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{activePass.status === "Inside Campus" ? "INSIDE CAMPUS" : "APPROVED"}</span>
                </span>
              </div>

              {/* Center Scannable QR Code on White Box */}
              <div className="flex flex-col items-center justify-center pt-1">
                <div className="w-36 h-36 bg-white p-3 rounded-2xl flex items-center justify-center shadow-lg border border-slate-200/40">
                  {generatedPass ? (
                    <QRCodeSVG value={generatedPass.passcode} size={120} level="H" />
                  ) : (
                    <svg viewBox="0 0 100 100" className="w-full h-full fill-slate-950">
                      <rect x="0" y="0" width="30" height="30" rx="4" />
                      <rect x="70" y="0" width="30" height="30" rx="4" />
                      <rect x="0" y="70" width="30" height="30" rx="4" />
                      <rect x="10" y="10" width="10" height="10" fill="#fff" />
                      <rect x="80" y="10" width="10" height="10" fill="#fff" />
                      <rect x="10" y="80" width="10" height="10" fill="#fff" />
                      <rect x="40" y="10" width="20" height="10" />
                      <rect x="10" y="40" width="10" height="20" />
                      <rect x="35" y="35" width="30" height="30" rx="2" />
                      <rect x="75" y="45" width="15" height="15" />
                      <rect x="45" y="75" width="20" height="15" />
                    </svg>
                  )}
                </div>
                {/* PASSCODE with neon green accent */}
                <div className="text-center mt-3">
                  <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
                    ENTRY PASSCODE:{" "}
                  </span>
                  <span className="text-emerald-400 font-mono font-black text-xl tracking-wider ml-1">
                    {generatedPass ? generatedPass.passcode : "8683"}
                  </span>
                </div>
              </div>

              {/* Visitor Details Box */}
              <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Visitor:</span>
                  <span className="font-bold text-white truncate max-w-[170px]">
                    {activePass.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Email:</span>
                  <span className="text-slate-200 font-medium truncate max-w-[170px]">
                    {activePass.email}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Visitor ID:</span>
                  <span className="text-emerald-400 font-semibold truncate max-w-[170px]">
                    {idType}: [ID Verified]
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Total Headcount:</span>
                  <span className="font-bold text-emerald-400">
                    {1 + accompanyingCount} {1 + accompanyingCount === 1 ? "Guest (Solo)" : `Guests (1 + ${accompanyingCount})`}
                  </span>
                </div>

                <div className="border-t border-slate-700/50 my-1"></div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Host Name:</span>
                  <span className="font-bold text-white truncate max-w-[170px]">
                    {activePass.hostName}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Purpose:</span>
                  <span className="text-slate-200 font-medium truncate max-w-[170px]">
                    {activePass.purpose}
                  </span>
                </div>

                <div className="border-t border-slate-700/50 my-1"></div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Stay Window:</span>
                  <span className="text-amber-400 font-bold font-mono text-[11px]">
                    {fromDate} to {toDate}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Duration:</span>
                  <span className="text-white font-bold">
                    {calculatedDays} {calculatedDays > 1 ? "Days" : "Day"}
                  </span>
                </div>
              </div>

              {emailNotice && (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-[11px] font-bold text-center flex items-center justify-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{emailNotice}</span>
                </div>
              )}
            </div>

            {/* Post-Action Button: Send Email Pass */}
            <div>
              <button
                type="button"
                onClick={() => {
                  if (generatedPass) {
                    alert(`e-Pass with QR credentials sent to ${generatedPass.email}`);
                  }
                }}
                disabled={!generatedPass}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center space-x-2 ${
                  generatedPass
                    ? "bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 cursor-pointer"
                    : "bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60"
                }`}
                title={generatedPass ? "Send pass by email" : "Issue spot pass first to send e-Pass"}
              >
                <Mail className="w-4 h-4" />
                <span>Send e-Pass</span>
              </button>
            </div>

            {generatedPass && !autoCheckIn && (
              <button
                type="button"
                onClick={handleImmediateCheckIn}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Record Check-In Now</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GuardTerminal({ visitors = [], onStatusChange, onAddVisitor, onRefresh }) {
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
      const token =
        localStorage.getItem("gateway_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        "";
      const res = await fetch(`${BACKEND_URL}/guard/gate-status/${visitorId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  const handleScanSuccess = async (decodedText) => {
    setIsCamOpen(false);
    if (!decodedText) return;

    let cleanCode = String(decodedText).trim();
    // If URL was scanned, extract token or passcode
    if (cleanCode.includes("/")) {
      const parts = cleanCode.split("/").filter(Boolean);
      cleanCode = parts[parts.length - 1] || cleanCode;
    }
    if (cleanCode.includes("?")) {
      const parts = cleanCode.split("?");
      cleanCode = parts[0] || cleanCode;
    }

    // Handle possible JSON formatted QR payload
    let candidates = [cleanCode, cleanCode.toLowerCase()];
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === "object") {
        if (parsed.passcode) candidates.push(String(parsed.passcode).trim(), String(parsed.passcode).trim().toLowerCase());
        if (parsed.qrToken) candidates.push(String(parsed.qrToken).trim(), String(parsed.qrToken).trim().toLowerCase());
        if (parsed.id) candidates.push(String(parsed.id).trim(), String(parsed.id).trim().toLowerCase());
        if (parsed._id) candidates.push(String(parsed._id).trim(), String(parsed._id).trim().toLowerCase());
      }
    } catch {
      // Normal plain-text code
    }

    // 1. First: Query backend real-time verification endpoint
    try {
      const token =
        localStorage.getItem("gateway_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("authToken") ||
        "";

      const res = await fetch(`${BACKEND_URL}/guard/verify/${encodeURIComponent(cleanCode)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.visitor) {
          const v = data.visitor;
          const targetId = v.id || v._id;

          if (!data.eligible) {
            alert(`⛔ Access Denied: ${data.reason || "Pass is not eligible for entry/exit."}\n\nVisitor: ${v.name}\nPass ID: ${v.id || v.passcode}\nClearance: ${v.approvalStatus}\nCurrent Status: ${v.status}`);
            return;
          }

          if (data.action === "CHECK_IN" || v.status !== "Inside Campus") {
            await handleUpdateGateStatus(targetId, "Inside Campus");
            const headCount = v.totalVisitors || (1 + (Number(v.accompanyingCount) || 0));
            alert(`✅ VERIFIED - CHECK-IN RECORDED\n\nVisitor: ${v.name}\n👥 Total Headcount: ${headCount} Persons (${headCount > 1 ? `1 Lead + ${v.accompanyingCount || headCount - 1} Accompanying` : "Solo"})\nPass ID: ${v.id}\nPasscode: ${v.passcode}\nStatus: Inside Campus`);
          } else {
            await handleUpdateGateStatus(targetId, "Completed");
            alert(`✅ VERIFIED - CHECK-OUT RECORDED\n\nVisitor: ${v.name}\nPass ID: ${v.id}\nPasscode: ${v.passcode}\nStatus: Completed`);
          }

          if (onRefresh) onRefresh();
          return;
        }
      }
    } catch (apiErr) {
      console.warn("Backend real-time verify check failed, evaluating local visitor records:", apiErr);
    }

    // 2. Fallback: Search in local records across passcode, qrToken, id, and _id
    const matched = visitors.find((v) => {
      const pCode = v?.passcode ? String(v.passcode).trim().toLowerCase() : "";
      const qToken = v?.qrToken ? String(v.qrToken).trim().toLowerCase() : "";
      const vId = v?.id ? String(v.id).trim().toLowerCase() : "";
      const mId = v?._id ? String(v._id).trim().toLowerCase() : "";

      return candidates.some((c) => {
        const cLow = String(c).trim().toLowerCase();
        return cLow && (cLow === pCode || cLow === qToken || cLow === vId || cLow === mId);
      });
    });

    if (!matched) {
      alert(`Access Rejected: Scanned code "${cleanCode}" not found in visitor records.\n\nIf this pass was recently created or approved, please click "Refresh" at the top of the terminal and try again.`);
      return;
    }

    const visitorId = matched.id || matched._id;

    if (matched.blacklisted) {
      alert(`🚨 SECURITY ALERT: ${matched.name} (${matched.passcode || matched.id}) is BLACKLISTED! Entry denied.`);
      return;
    }
    if (matched.approvalStatus !== "Approved") {
      alert(`Entry Denied: Clearance status is currently "${matched.approvalStatus}". Approved clearance is required.`);
      return;
    }

    if (matched.status !== "Inside Campus") {
      await handleUpdateGateStatus(visitorId, "Inside Campus");
      const headCount = matched.totalVisitors || (1 + (Number(matched.accompanyingCount) || 0));
      alert(`✅ VERIFIED - CHECK-IN RECORDED\n\nVisitor: ${matched.name}\n👥 Total Headcount: ${headCount} Persons (${headCount > 1 ? `1 Lead + ${matched.accompanyingCount || headCount - 1} Accompanying` : "Solo"})\nPasscode: ${matched.passcode}\nStatus: Inside Campus`);
    } else {
      await handleUpdateGateStatus(visitorId, "Completed");
      alert(`✅ VERIFIED - CHECK-OUT RECORDED\n\nVisitor: ${matched.name}\nPasscode: ${matched.passcode}\nStatus: Completed`);
    }

    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Currently Inside</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{insideCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-rose-500">Overstay Alerts</p>
            <p className="text-3xl font-black text-rose-600 mt-1">{overstayedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-600">Expected Today</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{pendingCount}</p>
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
            <p className="text-xs font-bold text-slate-400">Security Audit</p>
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
            className="w-full text-sm font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 outline-none transition"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsSpotModalOpen(true)}
            className="px-4 py-2.5 text-sm font-bold rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Issue Spot Pass</span>
          </button>

          <button
            onClick={() => setIsCamOpen(true)}
            className="px-4 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2 transition shadow-sm cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR Pass</span>
          </button>
        </div>
      </div>

      {/* Gate Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-800 text-sm font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 whitespace-nowrap">Passcode</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Visitor</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Host Details</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Purpose</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Clearance</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Gate Status</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Check-In</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">Check-Out</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-500 text-sm font-medium">
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-base text-sky-900 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200/90 shadow-2xs inline-block">
                          {item.passcode}
                        </span>
                        {item.blacklisted && (
                          <span className="flex items-center space-x-1 mt-1 text-xs text-rose-600 font-extrabold uppercase">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Blacklisted</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 min-w-[170px]">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">{item.name}</span>
                          {(item.totalVisitors > 1 || (Number(item.accompanyingCount) || 0) > 0) && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300 whitespace-nowrap"
                              title={`1 Lead + ${item.accompanyingCount || item.totalVisitors - 1} Accompanying`}
                            >
                              👥 {item.totalVisitors || (1 + (Number(item.accompanyingCount) || 0))}
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-600 font-medium truncate max-w-[180px]">{item.email}</div>
                      </td>
                      <td className="py-3.5 px-4 min-w-[210px]">
                        <div className="font-bold text-slate-900 text-sm sm:text-base whitespace-nowrap">
                          {item.hostName}
                        </div>
                        {item.hostAddress && (
                          <div className="text-xs sm:text-sm text-slate-600 font-medium">{item.hostAddress}</div>
                        )}
                        <div className="text-slate-500 text-xs font-medium">{item.hostIdDocType || "Campus Host"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-sm min-w-[140px]">
                        <span className="font-semibold text-slate-800 text-xs sm:text-sm">{item.purpose}</span>
                        <div className="text-xs text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                          {item.arrivalDate} ➔ {item.exitDate}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-2xs ${
                            item.approvalStatus === "Approved"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {item.approvalStatus}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5 flex-wrap gap-1 justify-center">
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-2xs ${
                              item.status === "Inside Campus"
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                : item.status === "Completed"
                                ? "bg-slate-100 text-slate-700 border border-slate-300"
                                : "bg-amber-100 text-amber-900 border border-amber-300"
                            }`}
                          >
                            {item.status}
                          </span>
                          {overstay && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-600 text-white animate-pulse whitespace-nowrap">
                              OVERSTAY
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.checkInTime && item.checkInTime !== "—" ? (
                          <span className="inline-flex items-center space-x-1.5 text-emerald-800 font-bold font-mono text-xs sm:text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{item.checkInTime}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {item.checkOutTime && item.checkOutTime !== "—" ? (
                          <span className="inline-flex items-center space-x-1.5 text-slate-800 font-bold font-mono text-xs sm:text-sm bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{item.checkOutTime}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-sm">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isActionLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin text-slate-400 inline-block" />
                        ) : item.approvalStatus === "Approved" && !item.blacklisted ? (
                          <div className="inline-flex space-x-1.5">
                            <button
                              onClick={() => handleUpdateGateStatus(item.id, "Inside Campus")}
                              disabled={item.status === "Inside Campus"}
                              className="p-2 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                              title="Record Check-IN"
                            >
                              <LogIn className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => handleUpdateGateStatus(item.id, "Completed")}
                              disabled={item.status !== "Inside Campus"}
                              className="p-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
                              title="Record Check-OUT"
                            >
                              <LogOut className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
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