import React, { useState } from "react";
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
} from "lucide-react";

export default function AdminDesk({
  visitors,
  onApprove,
  onReject,
  onToggleBlacklist,
  onOpenDocModal,
}) {
  const [filter, setFilter] = useState("ALL");

  // Feature 4: Interactive Demographics & Clearance Analytics
  const totalCount = visitors.length;
  const pendingVisitors = visitors.filter(
    (v) => v.approvalStatus === "Pending Approval"
  );
  const approvedCount = visitors.filter(
    (v) => v.approvalStatus === "Approved"
  ).length;
  const blacklistedCount = visitors.filter((v) => v.blacklisted).length;

  const academicCount = visitors.filter((v) =>
    v.purpose?.toLowerCase().includes("academic")
  ).length;
  const personalCount = totalCount - academicCount;

  const facultyHostCount = visitors.filter((v) =>
    v.hostAddress?.toLowerCase().includes("faculty")
  ).length;
  const hostelHostCount = totalCount - facultyHostCount;

  // Filter Directory Logic
  const filteredDirectory =
    filter === "ALL"
      ? visitors
      : filter === "Blacklisted"
      ? visitors.filter((v) => v.blacklisted)
      : visitors.filter((v) => v.approvalStatus === filter);

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
            Cross-verify uploaded visitor & host ID proofs before issuing gate
            clearance
          </p>
        </div>
        <div className="flex items-center space-x-2">
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

      {/* Feature 4: Visual Analytics Widget */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4 border-b border-slate-100 pb-3">
          <BarChart3 className="w-5 h-5 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Live Demographic & Security Ratio Meters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          {/* Ratio 1: Academic vs Personal */}
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
                style={{
                  width: `${
                    totalCount ? (academicCount / totalCount) * 100 : 50
                  }%`,
                }}
              ></div>
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    totalCount ? (personalCount / totalCount) * 100 : 50
                  }%`,
                }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400">
              Purpose classification ratio
            </p>
          </div>

          {/* Ratio 2: Faculty Quarters vs Hostels */}
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
                style={{
                  width: `${
                    totalCount ? (facultyHostCount / totalCount) * 100 : 50
                  }%`,
                }}
              ></div>
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    totalCount ? (hostelHostCount / totalCount) * 100 : 50
                  }%`,
                }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400">
              Premises allocation distribution
            </p>
          </div>

          {/* Stat 3: Clearance Rate */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col justify-between">
            <div className="flex justify-between font-semibold text-slate-700">
              <span className="flex items-center space-x-1">
                <Users className="w-4 h-4 text-slate-600" />
                <span>Clearance Rate</span>
              </span>
              <span className="text-emerald-700 font-bold">
                {totalCount
                  ? Math.round((approvedCount / totalCount) * 100)
                  : 0}
                %
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
            <p className="text-[10px] text-slate-400">
              Overall gate pass approval ratio
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approval Section */}
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
                const vExt = v.idDocName?.split(".").pop().toUpperCase() || "DOC";
                const hExt = v.hostDocName?.split(".").pop().toUpperCase() || "DOC";
                return (
                  <tr
                    key={v.id}
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
                      <span className="font-semibold text-slate-800">{v.name}</span>
                      <div className="text-[11px] text-slate-500">{v.email}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Requested: <strong>{v.requestTimestamp}</strong>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() =>
                          onOpenDocModal(
                            v.idType,
                            v.idDocName,
                            v.name,
                            v.idDocUrl
                          )
                        }
                        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-sky-50 hover:border-sky-500 transition shadow-xs text-xs font-semibold cursor-pointer"
                      >
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-extrabold text-sky-700">
                          {vExt}
                        </span>
                        <span className="text-slate-800 underline decoration-slate-300 underline-offset-2 truncate max-w-[95px]">
                          {v.idDocName}
                        </span>
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <div className="font-semibold text-slate-900">{v.hostName}</div>
                      <div className="text-slate-500">{v.hostAddress}</div>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() =>
                          onOpenDocModal(
                            v.hostIdDocType,
                            v.hostDocName,
                            v.hostName,
                            v.hostDocUrl
                          )
                        }
                        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-amber-50 hover:border-amber-500 transition shadow-xs text-xs font-semibold cursor-pointer"
                      >
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono font-extrabold text-amber-700">
                          {hExt}
                        </span>
                        <span className="text-slate-800 underline decoration-slate-300 underline-offset-2">
                          {v.hostIdDocType}
                        </span>
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        Pending Review
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="inline-flex items-center space-x-1.5">
                        <button
                          onClick={() => onApprove(v.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-sm cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & QR</span>
                        </button>
                        <button
                          onClick={() => onReject(v.id)}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition flex items-center space-x-1 shadow-sm cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        {/* Feature 2: Toggle Flag Button */}
                        <button
                          onClick={() => onToggleBlacklist(v.id)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            v.blacklisted
                              ? "bg-rose-600 text-white border-rose-700"
                              : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border-slate-200"
                          }`}
                          title={
                            v.blacklisted
                              ? "Remove Flag"
                              : "Flag / Blacklist Visitor"
                          }
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

      {/* Master Directory with Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-base">
              Campus Registered Visitors Master Directory
            </h3>
          </div>

          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {["ALL", "Approved", "Pending Approval", "Rejected", "Blacklisted"].map(
              (type) => (
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
              )
            )}
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
              {filteredDirectory.map((v) => (
                <tr
                  key={v.id}
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
                    {v.name}
                    <div className="text-[11px] text-slate-400 font-normal">
                      {v.email}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <div className="font-semibold text-slate-900">{v.hostName}</div>
                    <div className="text-[11px] text-slate-500">{v.hostAddress}</div>
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-700">
                    {v.hostIdDocType}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    <div>
                      {v.arrivalDate} to {v.exitDate}
                    </div>
                    <div className="text-[11px] text-sky-600 font-semibold">
                      {v.durationDays} Days
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        v.approvalStatus === "Approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : v.approvalStatus === "Rejected"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {v.approvalStatus}
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
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {/* Feature 2: Toggle Flag in Master Directory */}
                    <button
                      onClick={() => onToggleBlacklist(v.id)}
                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                        v.blacklisted
                          ? "bg-rose-600 text-white border-rose-700"
                          : "bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border-slate-200"
                      }`}
                      title={
                        v.blacklisted
                          ? "Remove Flag"
                          : "Flag / Blacklist Visitor"
                      }
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}