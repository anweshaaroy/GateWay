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
} from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

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
      } else {
        alert("Approval failed: " + data.message);
      }
    } catch (err) {
      console.error("Approve API Error:", err);
      if (onApprove) onApprove(id);
    }
  };

  // Synchronize visitor rejection with backend
  const handleRejectPass = async (id) => {
    const token = getAuthToken();
    try {
      const res = await fetch(`${BACKEND_URL}/admin/reject/${id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        if (onReject) onReject(id);
        fetchPasses();
      } else {
        alert("Reject failed: " + data.message);
      }
    } catch (err) {
      console.error("Reject API Error:", err);
      if (onReject) onReject(id);
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

  const handleDownloadProof = (e, fileUrl, fileName, holderName, docType) => {
    e.stopPropagation();
    if (!fileUrl) return;

    const safeFileName =
      fileName ||
      `${holderName ? holderName.replace(/\s+/g, "_") : "ID"}_${docType || "Proof"}.jpg`;

    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = safeFileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenDoc = (docType, docName, holderName, docUrl) => {
    if (onOpenDocModal) {
      onOpenDocModal(docType, docName, holderName, docUrl);
    } else {
      setActiveDoc({ docType, docName, holderName, docUrl });
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
  const academicCount = visitors.filter((v) =>
    v?.purpose?.toLowerCase().includes("academic")
  ).length;
  const personalCount = totalCount - academicCount;
  const facultyHostCount = visitors.filter((v) =>
    v?.hostAddress?.toLowerCase().includes("faculty")
  ).length;
  const hostelHostCount = totalCount - facultyHostCount;

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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-sky-600" />
            <span>Security Officer Pre-Approval Desk</span>
          </h2>
          <p className="text-xs text-slate-500">
            Cross-verify and download uploaded visitor & host ID proofs before issuing gate clearance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchPasses}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh passes"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-600" : ""}`} />
          </button>
          <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-800 rounded-lg border border-amber-200">
            Pending: {pendingVisitors.length}
          </span>
          <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200">
            Approved: {approvedCount}
          </span>
          <span className="text-xs font-bold px-3 py-1 bg-rose-100 text-rose-800 rounded-lg border border-rose-200">
            Flagged: {blacklistedCount}
          </span>
        </div>
      </div>

      {/* Visual Demographic Analytics */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 pb-3">
          <BarChart3 className="w-5 h-5 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-800">Live Demographic & Security Ratio Meters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div className="flex justify-between font-semibold text-slate-700">
              <span className="flex items-center space-x-1">
                <GraduationCap className="w-4 h-4 text-sky-600" />
                <span>Academic ({academicCount})</span>
              </span>
              <span>Personal ({personalCount})</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-sky-600 h-full transition-all duration-500"
                style={{ width: `${totalCount ? (academicCount / totalCount) * 100 : 50}%` }}
              ></div>
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{ width: `${totalCount ? (personalCount / totalCount) * 100 : 50}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400">Purpose classification ratio</p>
          </div>

          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
            <div className="flex justify-between font-semibold text-slate-700">
              <span className="flex items-center space-x-1">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>Faculty Qtrs ({facultyHostCount})</span>
              </span>
              <span>Hostels ({hostelHostCount})</span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: `${totalCount ? (facultyHostCount / totalCount) * 100 : 50}%` }}
              ></div>
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${totalCount ? (hostelHostCount / totalCount) * 100 : 50}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400">Premises allocation distribution</p>
          </div>

          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div className="flex justify-between font-semibold text-slate-700">
              <span className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-slate-600" />
                <span>Clearance Rate</span>
              </span>
              <span className="text-emerald-700 font-bold">
                {totalCount ? Math.round((approvedCount / totalCount) * 100) : 0}%
              </span>
            </div>
            <div className="flex space-x-2 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                {pendingVisitors.length} Pending
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
                {blacklistedCount} Flagged
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Overall gate pass approval ratio</p>
          </div>
        </div>
      </div>

      {/* Pending Queue Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-sky-600" />
          <span>Pending Authorization Queue</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Passcode</th>
                <th className="py-3 px-3">Visitor Info & Request Time</th>
                <th className="py-3 px-3">Visitor ID Proof</th>
                <th className="py-3 px-3">Host Info & Location</th>
                <th className="py-3 px-3">Host ID Proof</th>
                <th className="py-3 px-3">Clearance Status</th>
                <th className="py-3 px-3 text-right">Approval Decision</th>
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
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {v.passcode}
                      {v.blacklisted && (
                        <span className="block text-[10px] text-rose-600 font-sans font-bold">
                          FLAGGED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-800">{v.name || v.visitorName}</span>
                      <div className="text-[11px] text-slate-500">{v.email || v.visitorEmail}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Requested: <strong>{v.requestTimestamp || v.createdAt?.slice(0, 10) || "Just now"}</strong>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenDoc(v.idType, v.idDocName, v.name || v.visitorName, v.idDocUrl)}
                          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-l-xl border border-slate-300 bg-white hover:bg-sky-50 hover:border-sky-500 transition shadow-xs text-xs font-semibold cursor-pointer"
                        >
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-extrabold text-sky-700">
                            {vExt}
                          </span>
                          <span className="text-slate-800 underline decoration-slate-300 underline-offset-2 truncate max-w-[85px]">
                            {v.idDocName || "Visitor_ID"}
                          </span>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button
                          onClick={(e) =>
                            handleDownloadProof(e, v.idDocUrl, v.idDocName, v.name || v.visitorName, v.idType)
                          }
                          className="p-1.5 rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 hover:bg-sky-100 hover:text-sky-700 text-slate-600 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-xs">
                      <div className="font-semibold text-slate-900">{v.hostName}</div>
                      <div className="text-slate-500">{v.hostAddress}</div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          onClick={() =>
                            handleOpenDoc(v.hostIdDocType, v.hostDocName, v.hostName, v.hostDocUrl)
                          }
                          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-l-xl border border-slate-300 bg-white hover:bg-amber-50 hover:border-amber-500 transition shadow-xs text-xs font-semibold cursor-pointer"
                        >
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-extrabold text-amber-700">
                            {hExt}
                          </span>
                          <span className="text-slate-800 underline decoration-slate-300 underline-offset-2">
                            {v.hostIdDocType || "Host_Proof"}
                          </span>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                        <button
                          onClick={(e) =>
                            handleDownloadProof(e, v.hostDocUrl, v.hostDocName, v.hostName, v.hostIdDocType)
                          }
                          className="p-1.5 rounded-r-xl border border-l-0 border-slate-300 bg-slate-50 hover:bg-amber-100 text-slate-600 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        Pending Review
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => handleApprovePass(vid)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectPass(vid)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-sm cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleToggleBlacklist(vid, v.blacklisted)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            v.blacklisted
                              ? "bg-rose-600 text-white border-rose-700"
                              : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border-slate-200"
                          }`}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pendingVisitors.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
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
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-base">Campus Registered Visitors Master Directory</h3>
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {["ALL", "Approved", "Pending Approval", "Rejected", "Blacklisted"].map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  filter === type
                    ? "bg-white text-sky-700 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {type === "Pending Approval" ? "Pending" : type}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Passcode</th>
                <th className="py-3 px-4">Visitor</th>
                <th className="py-3 px-4">Host Details</th>
                <th className="py-3 px-4">Host ID Type</th>
                <th className="py-3 px-4">Stay Duration</th>
                <th className="py-3 px-4">Security Clearance</th>
                <th className="py-3 px-4">Gate Status</th>
                <th className="py-3 px-4 text-right">Security Action</th>
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
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">
                      {v.passcode}
                      {v.blacklisted && (
                        <span className="block text-[10px] text-rose-600 font-sans font-bold">
                          FLAGGED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {v.name || v.visitorName}
                      <div className="text-[11px] text-slate-400 font-normal">{v.email || v.visitorEmail}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-slate-900">{v.hostName}</div>
                      <div className="text-[11px] text-slate-500">{v.hostAddress}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">{v.hostIdDocType}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      <div>{v.arrivalDate} to {v.exitDate}</div>
                      <div className="text-[11px] text-sky-600 font-semibold">{v.durationDays} Days</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          approvalStatus === "Approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : approvalStatus === "Rejected"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {approvalStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          v.status === "Inside Campus"
                            ? "bg-emerald-100 text-emerald-700"
                            : v.status === "Completed"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {v.status || "Expected"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleBlacklist(vid, v.blacklisted)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          v.blacklisted
                            ? "bg-rose-600 text-white border-rose-700"
                            : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border-slate-200"
                        }`}
                      >
                        <ShieldAlert className="w-4 h-4" />
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
    </div>
  );
}