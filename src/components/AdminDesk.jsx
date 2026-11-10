import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  UserCheck,
  Clock,
  Check,
  X,
  Eye,
  BarChart3,
  GraduationCap,
  Building,
  Users,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  ShieldCheck,
  Maximize2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  PieChart as PieChartIcon,
  Calendar,
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

const REJECTION_REASONS = [
  "Uploaded ID proof is blurry or unreadable",
  "Visitor details do not match the attached identity proof",
  "Host residence or room number could not be verified",
  "Visit dates or requested duration are invalid",
  "Duplicate visitor pass request",
  "Entry restricted as per campus security policy",
];

export default function AdminDesk({
  visitors: externalVisitors = [],
  onApprove,
  onReject,
  onToggleBlacklist,
  onOpenDocModal,
}) {
  const [internalVisitors, setInternalVisitors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [activeDoc, setActiveDoc] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [rejectModalPass, setRejectModalPass] = useState(null);
  const [selectedRejectReason, setSelectedRejectReason] = useState(REJECTION_REASONS[0]);
  const [isRejecting, setIsRejecting] = useState(false);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState("ALL");
  const [drawerCategory, setDrawerCategory] = useState(null);
  const [drawerSearch, setDrawerSearch] = useState("");

  // Helper method to resolve available authentication token
  const getAuthToken = () => {
    return (
      localStorage.getItem("gateway_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  };

  // Direct backend pass fetching to ensure up-to-date queue
  const fetchPasses = async () => {
    setIsLoading(true);
    const token = getAuthToken();
    try {
      const res = await fetch(`${BACKEND_URL}/passes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.passes)) {
        setInternalVisitors(data.passes);
      } else if (data.success && Array.isArray(data.visitors)) {
        setInternalVisitors(data.visitors);
      } else if (Array.isArray(data)) {
        setInternalVisitors(data);
      }
    } catch (err) {
      console.error("Failed to fetch passes from backend:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const visitors = internalVisitors.length > 0 ? internalVisitors : externalVisitors;

  // Safe identifier and status accessors
  const getId = (v) => v?.id || v?._id;
  const getApprovalStatus = (v) => v?.approvalStatus || v?.status || "Pending Approval";

  // Synchronize visitor approval with backend
  const handleApprovePass = async (id) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${BACKEND_URL}/admin/approve/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        if (onApprove) onApprove(id);
        fetchPasses();
        if (data.email && data.email.status === "failed") {
          alert(`Pass Approved! ⚠️ Email notice: ${data.email.message || data.message}`);
        }
      } else {
        alert("Approval failed: " + data.message);
      }
    } catch (err) {
      console.error("Approve API Error:", err);
      if (onApprove) onApprove(id);
    }
  };

  // Synchronize visitor rejection with backend
  const handleRejectPass = async (id, reason) => {
    const token = getAuthToken();
    setIsRejecting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/admin/reject/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: reason || selectedRejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        if (onReject) onReject(id);
        setRejectModalPass(null);
        fetchPasses();
      } else {
        alert("Reject failed: " + data.message);
      }
    } catch (err) {
      console.error("Reject API Error:", err);
      if (onReject) onReject(id);
      setRejectModalPass(null);
    } finally {
      setIsRejecting(false);
    }
  };

  // Synchronize blacklist status toggle with backend
  const handleToggleBlacklist = async (id, currentStatus) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${BACKEND_URL}/admin/blacklist/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ blacklisted: !currentStatus }),
      });
      const data = await res.json();
      if (data.success) {
        if (onToggleBlacklist) onToggleBlacklist(id);
        fetchPasses();
      } else {
        alert("Blacklist update failed: " + data.message);
      }
    } catch (err) {
      console.error("Blacklist API Error:", err);
      if (onToggleBlacklist) onToggleBlacklist(id);
    }
  };

  // Helper to ensure document URLs point to the backend server rather than the SPA frontend
  const resolveDocUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
      return url;
    }
    const backendBase = BACKEND_URL.replace(/\/api\/?$/, "");
    return `${backendBase}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const handleDownloadProof = async (e, fileUrl, fileName, holderName, docType) => {
    e.stopPropagation();
    if (!fileUrl) return;

    const fullUrl = resolveDocUrl(fileUrl);
    const token = getAuthToken();

    try {
      const res = await fetch(fullUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Could not download file");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const safeFileName =
        fileName ||
        `${holderName ? holderName.replace(/\s+/g, "_") : "ID"}_${docType || "Proof"}.jpg`;

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = safeFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fullUrl, "_blank");
    }
  };

  const handleOpenDoc = (docType, docName, holderName, docUrl) => {
    const fullUrl = resolveDocUrl(docUrl);
    if (onOpenDocModal) {
      onOpenDocModal(docType, docName, holderName, fullUrl);
    } else {
      setActiveDoc({ docType, docName, holderName, docUrl: fullUrl });
      setScale(1);
      setRotation(0);
    }
  };

  const closeLocalModal = () => {
    setActiveDoc(null);
    setScale(1);
    setRotation(0);
  };

  // Safe Analytics Metrics Calculation
  const totalCount = visitors.length;
  const pendingVisitors = visitors.filter(
    (v) => getApprovalStatus(v) === "Pending Approval" || getApprovalStatus(v) === "Pending"
  );
  const approvedCount = visitors.filter(
    (v) => getApprovalStatus(v) === "Approved"
  ).length;
  const blacklistedCount = visitors.filter((v) => v?.blacklisted).length;

  // Timeframe calculation for today's vs all-time analytics
  const todayStr = new Date().toISOString().slice(0, 10);
  const isTodayMatch = (v) => {
    return (
      (v.updatedAt && v.updatedAt.slice(0, 10) === todayStr) ||
      (v.createdAt && v.createdAt.slice(0, 10) === todayStr) ||
      (v.requestTimestamp && v.requestTimestamp.includes(todayStr)) ||
      v.arrivalDate === todayStr
    );
  };

  const analyticsPool =
    analyticsTimeframe === "TODAY" ? visitors.filter(isTodayMatch) : visitors;

  // Donut chart decision counts
  const approvedAnalytics = analyticsPool.filter((v) => getApprovalStatus(v) === "Approved").length;
  const rejectedAnalytics = analyticsPool.filter((v) => getApprovalStatus(v) === "Rejected").length;
  const pendingAnalytics = analyticsPool.filter(
    (v) => getApprovalStatus(v) === "Pending Approval" || getApprovalStatus(v) === "Pending"
  ).length;
  const decisionPoolCount = approvedAnalytics + rejectedAnalytics + pendingAnalytics;

  // Percentage calculations
  const approvedPct = decisionPoolCount ? approvedAnalytics / decisionPoolCount : 0;
  const rejectedPct = decisionPoolCount ? rejectedAnalytics / decisionPoolCount : 0;
  const pendingPct = decisionPoolCount ? pendingAnalytics / decisionPoolCount : 0;

  // Donut circumference for r=58
  const CIRCUMFERENCE = 364.42;
  const approvedLen = approvedPct * CIRCUMFERENCE;
  const rejectedLen = rejectedPct * CIRCUMFERENCE;
  const pendingLen = pendingPct * CIRCUMFERENCE;

  const clearanceRate =
    approvedAnalytics + rejectedAnalytics > 0
      ? Math.round((approvedAnalytics / (approvedAnalytics + rejectedAnalytics)) * 100)
      : decisionPoolCount > 0
      ? Math.round((approvedAnalytics / decisionPoolCount) * 100)
      : 0;

  // Real-time campus presence
  const insideCampusCount = visitors.filter((v) => v?.status === "Inside Campus").length;
  const completedCount = visitors.filter((v) => v?.status === "Completed").length;
  const expectedCount = visitors.filter(
    (v) =>
      getApprovalStatus(v) === "Approved" &&
      v?.status !== "Inside Campus" &&
      v?.status !== "Completed"
  ).length;

  // Purpose & premises demographics
  const academicCount = analyticsPool.filter((v) =>
    v?.purpose?.toLowerCase().includes("academic")
  ).length;
  const personalCount = Math.max(0, analyticsPool.length - academicCount);
  const facultyHostCount = analyticsPool.filter((v) =>
    v?.hostAddress?.toLowerCase().includes("faculty")
  ).length;
  const hostelHostCount = Math.max(0, analyticsPool.length - facultyHostCount);

  // Visitors list for slide-over drawer drill-down
  const drawerVisitors = drawerCategory
    ? visitors.filter((v) => {
        const status = getApprovalStatus(v);
        const matchCat =
          drawerCategory === "Approved"
            ? status === "Approved"
            : drawerCategory === "Rejected"
            ? status === "Rejected"
            : status === "Pending Approval" || status === "Pending";
        if (!matchCat) return false;
        if (!drawerSearch.trim()) return true;
        const q = drawerSearch.toLowerCase();
        return (
          v.name?.toLowerCase().includes(q) ||
          v.visitorName?.toLowerCase().includes(q) ||
          v.passcode?.toLowerCase().includes(q) ||
          v.id?.toLowerCase().includes(q) ||
          v.hostName?.toLowerCase().includes(q) ||
          v.hostAddress?.toLowerCase().includes(q) ||
          v.email?.toLowerCase().includes(q)
        );
      })
    : [];

  const filteredDirectory =
    filter === "ALL"
      ? visitors
      : filter === "Blacklisted"
      ? visitors.filter((v) => v?.blacklisted)
      : visitors.filter(
          (v) =>
            getApprovalStatus(v) === filter ||
            (filter === "Pending Approval" && getApprovalStatus(v) === "Pending")
        );

  return (
    <div className="space-y-6">
      {/* Top Banner Metric Summary */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6 text-sky-600 shrink-0" />
            <span>Security Admin Desk</span>
          </h2>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Verify credentials, cross-check identity proofs, and grant campus entry clearance
          </p>
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchPasses}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Refresh passes"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
          </button>
          <span className="text-sm font-bold px-3.5 py-1.5 bg-amber-100 text-amber-900 rounded-xl border border-amber-300 shadow-2xs">
            Pending: {pendingVisitors.length}
          </span>
          <span className="text-sm font-bold px-3.5 py-1.5 bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-300 shadow-2xs">
            Approved: {approvedCount}
          </span>
          <span className="text-sm font-bold px-3.5 py-1.5 bg-rose-100 text-rose-900 rounded-xl border border-rose-300 shadow-2xs">
            Flagged: {blacklistedCount}
          </span>
        </div>
      </div>

      {/* Live Campus Security & Gate Clearance Intelligence (Donut + Live Gate Flow + Demographics) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        {/* Section Header with Timeframe Toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600 border border-sky-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Live Campus Security &amp; Gate Clearance Intelligence
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Real-time IIT Ropar gate activity, decision ratios, and campus presence
              </p>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
            <button
              onClick={() => setAnalyticsTimeframe("TODAY")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                analyticsTimeframe === "TODAY"
                  ? "bg-white text-sky-700 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
            <button
              onClick={() => setAnalyticsTimeframe("ALL")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5 ${
                analyticsTimeframe === "ALL"
                  ? "bg-white text-sky-700 shadow-xs font-black"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>All Time</span>
            </button>
          </div>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
          {/* 1. Clearance Decision Donut Chart */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <PieChartIcon className="w-4 h-4 text-sky-600" />
                <span>Clearance Decision Ratio</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                {decisionPoolCount} Total
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 my-2">
              {/* Interactive SVG Donut */}
              <div className="relative w-[140px] h-[140px] shrink-0">
                <svg viewBox="0 0 160 160" className="w-full h-full transform -rotate-90">
                  {/* Background Track Circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    stroke="#e2e8f0"
                    strokeWidth="16"
                    fill="transparent"
                  />
                  {decisionPoolCount > 0 ? (
                    <>
                      {/* Approved Arc (Emerald) */}
                      {approvedLen > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r="58"
                          stroke="#10b981"
                          strokeWidth="16"
                          strokeDasharray={`${approvedLen} ${CIRCUMFERENCE - approvedLen}`}
                          strokeDashoffset="0"
                          fill="transparent"
                          strokeLinecap="round"
                          className="transition-all duration-700 cursor-pointer hover:opacity-85"
                          onClick={() => {
                            setDrawerCategory("Approved");
                            setDrawerSearch("");
                          }}
                        />
                      )}
                      {/* Rejected Arc (Rose) */}
                      {rejectedLen > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r="58"
                          stroke="#f43f5e"
                          strokeWidth="16"
                          strokeDasharray={`${rejectedLen} ${CIRCUMFERENCE - rejectedLen}`}
                          strokeDashoffset={-approvedLen}
                          fill="transparent"
                          strokeLinecap="round"
                          className="transition-all duration-700 cursor-pointer hover:opacity-85"
                          onClick={() => {
                            setDrawerCategory("Rejected");
                            setDrawerSearch("");
                          }}
                        />
                      )}
                      {/* Pending Arc (Amber) */}
                      {pendingLen > 0 && (
                        <circle
                          cx="80"
                          cy="80"
                          r="58"
                          stroke="#f59e0b"
                          strokeWidth="16"
                          strokeDasharray={`${pendingLen} ${CIRCUMFERENCE - pendingLen}`}
                          strokeDashoffset={-(approvedLen + rejectedLen)}
                          fill="transparent"
                          strokeLinecap="round"
                          className="transition-all duration-700 cursor-pointer hover:opacity-85"
                          onClick={() => {
                            setDrawerCategory("Pending");
                            setDrawerSearch("");
                          }}
                        />
                      )}
                    </>
                  ) : null}
                </svg>

                {/* Center Text inside Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 leading-none">
                    {clearanceRate}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                    Clearance
                  </span>
                </div>
              </div>

              {/* Clickable Legend Badges */}
              <div className="space-y-2 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setDrawerCategory("Approved");
                    setDrawerSearch("");
                  }}
                  className="w-full flex items-center justify-between space-x-3 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 transition cursor-pointer text-left group"
                  title="Click to view Approved visitors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="text-xs font-bold text-emerald-950">Approved</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-black text-emerald-900">{approvedAnalytics}</span>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      ({Math.round(approvedPct * 100)}%)
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600 opacity-60 group-hover:opacity-100 transition" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDrawerCategory("Rejected");
                    setDrawerSearch("");
                  }}
                  className="w-full flex items-center justify-between space-x-3 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 transition cursor-pointer text-left group"
                  title="Click to view Rejected visitors and reasons"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span className="text-xs font-bold text-rose-950">Rejected</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-black text-rose-900">{rejectedAnalytics}</span>
                    <span className="text-[11px] text-rose-700 font-semibold">
                      ({Math.round(rejectedPct * 100)}%)
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-rose-600 opacity-60 group-hover:opacity-100 transition" />
                  </div>
                </button>

                <button
                  onClick={() => {
                    setDrawerCategory("Pending");
                    setDrawerSearch("");
                  }}
                  className="w-full flex items-center justify-between space-x-3 px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 transition cursor-pointer text-left group"
                  title="Click to view Pending authorization queue"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                    <span className="text-xs font-bold text-amber-950">Pending</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs font-black text-amber-900">{pendingAnalytics}</span>
                    <span className="text-[11px] text-amber-700 font-semibold">
                      ({Math.round(pendingPct * 100)}%)
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-600 opacity-60 group-hover:opacity-100 transition" />
                  </div>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium text-center mt-1">
              Click any category badge to inspect visitor details
            </p>
          </div>

          {/* 2. Live Campus Gate Flow */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                <span>Live Campus Gate Flow</span>
              </span>
              <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>

            {/* Currently Inside Campus Featured Metric */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Currently Inside Campus</span>
                <span className="text-xl font-black text-emerald-600 font-mono">
                  {insideCampusCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Non-resident guests physically checked-in at IIT Ropar gates
              </p>
            </div>

            {/* Flow Items: Checked Out & Expected */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-semibold text-[11px]">Checked Out</div>
                <div className="text-lg font-black text-slate-800 font-mono mt-0.5">
                  {completedCount}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Completed visits</div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                <div className="text-slate-500 font-semibold text-[11px]">Expected Today</div>
                <div className="text-lg font-black text-sky-700 font-mono mt-0.5">
                  {expectedCount}
                </div>
                <div className="text-[10px] text-slate-400 font-medium mt-0.5">Approved arrivals</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium text-center">
              Gate status synced with Main &amp; Transit gate terminals
            </p>
          </div>

          {/* 3. Premises & Purpose Demographics */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 flex flex-col justify-between space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-900 text-sm flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-sky-600" />
                <span>Premises &amp; Purpose Allocation</span>
              </span>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                IIT Ropar
              </span>
            </div>

            {/* Purpose Split */}
            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between font-bold text-slate-800 text-xs">
                <span className="flex items-center space-x-1 text-sky-700">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Academic ({academicCount})</span>
                </span>
                <span className="text-amber-700 font-bold">Personal ({personalCount})</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-sky-600 h-full transition-all duration-500"
                  style={{
                    width: `${analyticsPool.length ? (academicCount / analyticsPool.length) * 100 : 50}%`,
                  }}
                ></div>
                <div
                  className="bg-amber-500 h-full transition-all duration-500"
                  style={{
                    width: `${analyticsPool.length ? (personalCount / analyticsPool.length) * 100 : 50}%`,
                  }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Research, faculty meets vs personal visits</p>
            </div>

            {/* Premises Allocation Split */}
            <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex justify-between font-bold text-slate-800 text-xs">
                <span className="flex items-center space-x-1 text-indigo-700">
                  <Building className="w-3.5 h-3.5" />
                  <span>Hostels ({hostelHostCount})</span>
                </span>
                <span className="text-emerald-700 font-bold">Faculty Qtrs ({facultyHostCount})</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-500 h-full transition-all duration-500"
                  style={{
                    width: `${analyticsPool.length ? (hostelHostCount / analyticsPool.length) * 100 : 50}%`,
                  }}
                ></div>
                <div
                  className="bg-emerald-600 h-full transition-all duration-500"
                  style={{
                    width: `${analyticsPool.length ? (facultyHostCount / analyticsPool.length) * 100 : 50}%`,
                  }}
                ></div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Satluj, Beas, Asikni vs Faculty Housing</p>
            </div>

            <p className="text-[11px] text-slate-500 font-medium text-center">
              Campus premises distribution ratio
            </p>
          </div>
        </div>
      </div>

      {/* Pending Queue Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-black text-slate-900 text-lg mb-4 flex items-center space-x-2.5">
          <UserCheck className="w-5 h-5 text-sky-600" />
          <span>Pending Authorization Queue</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-700 uppercase text-xs font-extrabold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Passcode</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Visitor Info &amp; Request Time</th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Visitor ID Proof</th>
                <th className="py-3.5 px-3.5 whitespace-nowrap">Host Info &amp; Location</th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Host ID Proof</th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Clearance Status</th>
                <th className="py-3.5 px-3.5 text-right whitespace-nowrap">Approval Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingVisitors.map((v) => {
                const vid = getId(v);
                const vExt = v?.idDocName?.split(".").pop().toUpperCase() || "DOC";
                const hExt = v?.hostDocName?.split(".").pop().toUpperCase() || "DOC";
                return (
                  <tr
                    key={vid}
                    className={`hover:bg-slate-50 transition ${
                      v.blacklisted ? "bg-rose-50/70" : ""
                    }`}
                  >
                    <td className="py-3.5 px-3.5 font-mono font-black text-base text-slate-900 whitespace-nowrap">
                      {v.passcode}
                      {v.blacklisted && (
                        <span className="block text-[10px] text-rose-600 font-sans font-extrabold mt-0.5">
                          FLAGGED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 min-w-[170px]">
                      <div className="font-bold text-slate-900 text-sm">{v.name || v.visitorName}</div>
                      <div className="text-xs text-slate-600 font-medium">{v.email || v.visitorEmail}</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                        Requested: <strong className="text-slate-700">{v.requestTimestamp || v.createdAt?.slice(0, 10) || "Just now"}</strong>
                      </div>
                    </td>

                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDoc(v.idType, v.idDocName, v.name || v.visitorName, v.idDocUrl)}
                        className="w-[128px] h-[32px] inline-flex items-center justify-between space-x-1.5 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-sky-50 hover:border-sky-400 transition shadow-2xs text-xs font-semibold cursor-pointer group"
                        title={`Click to inspect: ${v.idDocName || "Visitor ID"}`}
                      >
                        <span className="px-1.5 py-0.5 bg-sky-50 border border-sky-200 rounded text-[10px] font-mono font-bold text-sky-700 shrink-0">
                          {vExt}
                        </span>
                        <span className="text-slate-800 underline decoration-slate-300 underline-offset-2 truncate flex-1 text-left text-xs font-medium">
                          {v.idDocName || "Visitor_ID"}
                        </span>
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 transition shrink-0" />
                      </button>
                    </td>

                    <td className="py-3.5 px-3.5 text-sm min-w-[170px]">
                      <div className="font-bold text-slate-900 text-sm">{v.hostName}</div>
                      <div className="text-xs text-slate-600 font-medium">{v.hostAddress}</div>
                    </td>

                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <button
                        onClick={() =>
                          handleOpenDoc(v.hostIdDocType, v.hostDocName, v.hostName, v.hostDocUrl)
                        }
                        className="w-[128px] h-[32px] inline-flex items-center justify-between space-x-1.5 px-2.5 rounded-lg border border-slate-300 bg-white hover:bg-amber-50 hover:border-amber-400 transition shadow-2xs text-xs font-semibold cursor-pointer group"
                        title={`Click to inspect: ${v.hostDocName || v.hostIdDocType || "Host Proof"}`}
                      >
                        <span className="px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded text-[10px] font-mono font-bold text-amber-700 shrink-0">
                          {hExt}
                        </span>
                        <span className="text-slate-800 underline decoration-slate-300 underline-offset-2 truncate flex-1 text-left text-xs font-medium">
                          {v.hostDocName || v.hostIdDocType || "Host_Proof"}
                        </span>
                        <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition shrink-0" />
                      </button>
                    </td>

                    <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap shadow-2xs">
                        Pending Review
                      </span>
                    </td>
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => handleApprovePass(vid)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center space-x-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRejectReason(REJECTION_REASONS[0]);
                            setRejectModalPass(v);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition inline-flex items-center space-x-1 shadow-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleToggleBlacklist(vid, v.blacklisted)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            v.blacklisted
                              ? "bg-rose-600 text-white border-rose-700"
                              : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border-slate-300"
                          }`}
                          title={v.blacklisted ? "Unflag Visitor" : "Flag / Blacklist Visitor"}
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingVisitors.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 font-semibold text-base">
                    No pending requests awaiting authorization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Master Directory Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-sky-600" />
            <h3 className="font-black text-slate-900 text-lg">Campus Registered Visitors Master Directory</h3>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1.5 rounded-xl text-xs sm:text-sm font-bold">
            {["ALL", "Approved", "Pending Approval", "Rejected", "Blacklisted"].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                  filter === type
                    ? "bg-white text-sky-700 shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {type === "Pending Approval" ? "Pending" : type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100/80 text-slate-700 uppercase text-xs font-extrabold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Passcode</th>
                <th className="py-3.5 px-4">Visitor</th>
                <th className="py-3.5 px-4">Host Details</th>
                <th className="py-3.5 px-4">Host ID Type</th>
                <th className="py-3.5 px-4">Stay Duration</th>
                <th className="py-3.5 px-4">Security Clearance</th>
                <th className="py-3.5 px-4">Gate Status</th>
                <th className="py-3.5 px-4 text-right">Security Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDirectory.map((v) => {
                const vid = getId(v);
                const approvalStatus = getApprovalStatus(v);
                return (
                  <tr
                    key={vid}
                    className={`hover:bg-slate-50 transition ${
                      v.blacklisted ? "bg-rose-50/60" : ""
                    }`}
                  >
                    <td className="py-4 px-4 font-mono font-black text-base text-sky-800">
                      {v.passcode}
                      {v.blacklisted && (
                        <span className="block text-xs text-rose-600 font-sans font-extrabold mt-0.5">
                          FLAGGED
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900 text-base">{v.name || v.visitorName}</div>
                      <div className="text-sm text-slate-600 font-medium">{v.email || v.visitorEmail}</div>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <div className="font-bold text-slate-900 text-base">{v.hostName}</div>
                      <div className="text-sm text-slate-600 font-medium">{v.hostAddress}</div>
                    </td>
                    <td className="py-4 px-4 text-sm font-bold text-slate-800">{v.hostIdDocType}</td>
                    <td className="py-4 px-4 text-sm text-slate-700">
                      <div className="font-medium">{v.arrivalDate} to {v.exitDate}</div>
                      <div className="text-xs text-sky-700 font-bold mt-0.5">{v.durationDays} Days</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
                          approvalStatus === "Approved"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : approvalStatus === "Rejected"
                            ? "bg-rose-100 text-rose-900 border border-rose-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {approvalStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                          v.status === "Inside Campus"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : v.status === "Completed"
                            ? "bg-slate-100 text-slate-700 border border-slate-300"
                            : "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}
                      >
                        {v.status || "Expected"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleToggleBlacklist(vid, v.blacklisted)}
                        className={`p-2 rounded-xl border transition cursor-pointer ${
                          v.blacklisted
                            ? "bg-rose-600 text-white border-rose-700"
                            : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border-slate-300"
                        }`}
                        title={v.blacklisted ? "Unflag Visitor" : "Flag / Blacklist Visitor"}
                      >
                        <ShieldAlert className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full-Screen Document Inspection Modal */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-6xl w-[96vw] h-[92vh] overflow-hidden flex flex-col transition-all">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-800 rounded-xl border border-slate-700">
                  <FileText className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-base font-bold tracking-tight">
                    {activeDoc.docType || "Identification Document"} Viewer
                  </h4>
                  <p className="text-xs text-slate-400">Campus Security Pre-Clearance Console</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 space-x-1">
                  <button
                    onClick={() => setScale((s) => Math.min(s + 0.25, 3.5))}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-300 px-2 font-bold select-none">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale((s) => Math.max(s - 0.25, 0.5))}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setScale(1);
                    setRotation(0);
                  }}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) =>
                    handleDownloadProof(
                      e,
                      activeDoc.docUrl,
                      activeDoc.docName,
                      activeDoc.holderName,
                      activeDoc.docType
                    )
                  }
                  className="p-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                </button>

                <button
                  onClick={closeLocalModal}
                  className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-rose-600 text-slate-300 hover:text-white transition cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs shrink-0">
              <span className="text-slate-600">
                Holder: <strong className="text-slate-900">{activeDoc.holderName}</strong>
              </span>
              <span className="font-mono text-sky-700 font-bold text-[11px] bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md">
                {activeDoc.docName || "id_proof.jpg"}
              </span>
            </div>

            <div className="flex-1 w-full bg-slate-200/70 overflow-auto flex items-center justify-center p-6 relative">
              <div className="flex items-center justify-center min-w-full min-h-full">
                <img
                  src={activeDoc.docUrl}
                  alt="ID Document"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                    transition: "transform 0.15s ease-out",
                  }}
                  className="max-h-[70vh] max-w-[85vw] object-contain rounded-lg shadow-lg border border-slate-300 select-none bg-white"
                />
              </div>
            </div>

            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Digital Security Verification Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) =>
                    handleDownloadProof(
                      e,
                      activeDoc.docUrl,
                      activeDoc.docName,
                      activeDoc.holderName,
                      activeDoc.docType
                    )
                  }
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Download File</span>
                </button>
                <button
                  onClick={closeLocalModal}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  Dismiss Viewer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Rejection Reason Modal */}
      {rejectModalPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4.5 bg-rose-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-800 flex items-center justify-center text-rose-200 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">Reject Visitor Request</h3>
                  <p className="text-xs text-rose-200 mt-0.5 font-medium">
                    Pass ID: <span className="font-mono font-black">{rejectModalPass.id || rejectModalPass._id}</span> &bull; {rejectModalPass.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => setRejectModalPass(null)}
                className="text-rose-200 hover:text-white p-1.5 rounded-xl hover:bg-rose-800/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4.5 text-sm">
              <div>
                <label className="block text-slate-900 font-extrabold mb-1 text-sm">
                  Select Rejection Reason:
                </label>
                <p className="text-xs text-slate-500 mb-3 font-medium">
                  Select the campus clearance violation. An official notice will be emailed to both the Host and Visitor.
                </p>

                <div className="space-y-2">
                  {REJECTION_REASONS.map((reason, idx) => {
                    const isSelected = selectedRejectReason === reason;
                    return (
                      <label
                        key={idx}
                        onClick={() => setSelectedRejectReason(reason)}
                        className={`flex items-start space-x-3 p-3.5 rounded-xl border text-sm cursor-pointer transition ${
                          isSelected
                            ? "border-rose-500 bg-rose-50 text-rose-950 font-bold shadow-xs"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
                        }`}
                      >
                        <input
                          type="radio"
                          name="rejectionReason"
                          value={reason}
                          checked={isSelected}
                          onChange={() => setSelectedRejectReason(reason)}
                          className="mt-1 text-rose-600 focus:ring-rose-500 cursor-pointer w-4 h-4"
                        />
                        <span className="leading-relaxed">
                          {reason}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Recipients Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 text-xs mb-1">Email Delivery Notification:</div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Visitor:</span>
                  <span className="font-mono font-semibold text-slate-800 truncate max-w-[280px]">{rejectModalPass.email || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Host Resident:</span>
                  <span className="font-mono font-semibold text-slate-800 truncate max-w-[280px]">
                    {rejectModalPass.hostEmail || rejectModalPass.requester?.email || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isRejecting}
                onClick={() => setRejectModalPass(null)}
                className="px-4.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-sm transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={() =>
                  handleRejectPass(
                    rejectModalPass.id || rejectModalPass._id,
                    selectedRejectReason
                  )
                }
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-60"
              >
                {isRejecting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Notification...</span>
                  </>
                ) : (
                  <>
                    <X className="w-4 h-4" />
                    <span>Confirm Rejection &amp; Send Mail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Quick Slide-Over Modal Drawer (Interactive drill-down from Donut Chart) */}
      {drawerCategory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-2xs animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setDrawerCategory(null)}
          ></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div
              className={`p-5 text-white flex items-center justify-between shrink-0 ${
                drawerCategory === "Approved"
                  ? "bg-emerald-800"
                  : drawerCategory === "Rejected"
                  ? "bg-rose-900"
                  : "bg-amber-800"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  {drawerCategory === "Approved" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  ) : drawerCategory === "Rejected" ? (
                    <XCircle className="w-5 h-5 text-rose-300" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-300" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white">
                    {drawerCategory} Visitors Directory
                  </h3>
                  <p className="text-xs text-white/80 font-medium mt-0.5">
                    {drawerVisitors.length} record{drawerVisitors.length === 1 ? "" : "s"} &bull; IIT Ropar Campus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDrawerCategory(null)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Search & Filter */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by name, passcode, or hostel..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
                />
              </div>
            </div>

            {/* Drawer Visitor List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {drawerVisitors.map((v) => {
                const vid = getId(v);
                return (
                  <div
                    key={vid}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {v.name || v.visitorName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {v.email || v.visitorEmail}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          drawerCategory === "Approved"
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : drawerCategory === "Rejected"
                            ? "bg-rose-100 text-rose-900 border border-rose-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        Pass: {v.passcode}
                      </span>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px] border border-slate-100">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Host Resident:</span>
                        <span className="font-bold text-slate-800">{v.hostName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Hostel / Address:</span>
                        <span className="text-slate-700 truncate max-w-[200px]">{v.hostAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Visit Dates:</span>
                        <span className="text-slate-700 font-medium">
                          {v.arrivalDate} to {v.exitDate}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Purpose:</span>
                        <span className="text-slate-700 font-medium capitalize">
                          {v.purpose || "Personal"}
                        </span>
                      </div>
                    </div>

                    {/* Show Rejection Reason if Rejected */}
                    {drawerCategory === "Rejected" && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900">
                        <span className="font-bold text-rose-800">Rejection Reason: </span>
                        <span>{v.rejectionReason || "Entry restricted as per security policy."}</span>
                      </div>
                    )}

                    {/* Quick action pill button */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {v.id || v._id}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {v.idDocName && (
                          <button
                            onClick={() =>
                              handleOpenDoc(v.idType, v.idDocName, v.name || v.visitorName, v.idDocUrl)
                            }
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 transition cursor-pointer flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>Inspect ID</span>
                          </button>
                        )}
                        {v.hostDocName && (
                          <button
                            onClick={() =>
                              handleOpenDoc(v.hostIdDocType, v.hostDocName, v.hostName, v.hostDocUrl)
                            }
                            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 transition cursor-pointer flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>Host Proof</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {drawerVisitors.length === 0 && (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  No visitors found in this category.
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-500 font-medium">
                Total: <strong>{drawerVisitors.length}</strong> records
              </span>
              <button
                onClick={() => setDrawerCategory(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}