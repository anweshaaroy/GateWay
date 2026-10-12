import React, { useState } from "react";
import LoginModal from "./components/LoginModal";
import ResidentPortal from "./components/ResidentPortal";
import AdminDesk from "./components/AdminDesk";
import GuardTerminal from "./components/GuardTerminal";
import { LargeDocModal, QrGeneratedModal } from "./components/Modals";
import { ShieldCheck, LogOut } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("resident");
  const [activePass, setActivePass] = useState(null);

  // In-memory visitor directory (No localStorage)
  const [visitors, setVisitors] = useState([
    {
      id: "VIS-9021",
      passcode: "4102",
      name: "Vikram Rathore",
      email: "vikram.rathore@outlook.com",
      idType: "Aadhaar Card",
      idNumber: "[Aadhaar Redacted]",
      idDocName: "vikram_id.jpg",
      idDocUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80",
      hostName: "Dr. A. Verma",
      hostEmail: "averma@iitrpr.ac.in",
      hostAddress: "Faculty Qtr A-102",
      hostIdDocType: "Faculty Official ID",
      hostDocName: "faculty_id.jpg",
      hostDocUrl: null,
      purpose: "Academic Collaboration",
      arrivalDate: "2026-10-04",
      exitDate: "2026-10-05",
      durationDays: 2,
      approvalStatus: "Approved",
      status: "Inside Campus",
      checkInTime: "04 Oct 2026, 09:15 AM",
      checkOutTime: "—",
      requestTimestamp: "2026-10-04 08:30 AM",
      blacklisted: false,
      visitHistory: [],
    },
    {
      id: "VIS-9022",
      passcode: "7829",
      name: "Pooja Hegde",
      email: "pooja.hegde@gmail.com",
      idType: "Passport",
      idNumber: "Z5829104",
      idDocName: "pooja_passport.jpg",
      idDocUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80",
      hostName: "Mansi Verma",
      hostEmail: "mansi.2026csm1042@iitrpr.ac.in",
      hostAddress: "Girls Hostel 4, Room 218",
      hostIdDocType: "Student College ID Card",
      hostDocName: "student_card.jpg",
      hostDocUrl: null,
      purpose: "Personal / Guest",
      arrivalDate: "2026-10-06",
      exitDate: "2026-10-08",
      durationDays: 3,
      approvalStatus: "Pending Approval",
      status: "Pending",
      checkInTime: "—",
      checkOutTime: "—",
      requestTimestamp: "2026-10-06 10:15 AM",
      blacklisted: false,
      visitHistory: [],
    },
  ]);

  const [inspectDoc, setInspectDoc] = useState(null);
  const [approvedQrPass, setApprovedQrPass] = useState(null);

  // Authentication & Dynamic Routing
  const handleLogin = (user) => {
    setCurrentUser(user);
    if (user.mainRole === "resident" || user.role === "student" || user.role === "faculty") {
      setActiveTab("resident");
    } else if (user.mainRole === "admin" || user.role === "admin") {
      setActiveTab("admin");
    } else {
      setActiveTab("guard");
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setActivePass(null);
    setActiveTab("resident");
  };

  const handlePassCreated = (newPass) => {
    const formattedPass = {
      ...newPass,
      id: newPass.id || `VIS-${Math.floor(1000 + Math.random() * 9000)}`,
      passcode: newPass.passcode || Math.floor(1000 + Math.random() * 9000).toString(),
      approvalStatus: "Pending Approval",
      status: "Pending",
      checkInTime: "—",
      checkOutTime: "—",
      requestTimestamp: new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      blacklisted: false,
      visitHistory: [],
    };
    setVisitors((prev) => [formattedPass, ...prev]);
    setActivePass(formattedPass);
  };

  const handleApprove = (id) => {
    setVisitors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, approvalStatus: "Approved" } : v))
    );
    const pass = visitors.find((v) => v.id === id);
    if (pass) {
      setApprovedQrPass({ ...pass, approvalStatus: "Approved" });
    }
  };

  const handleReject = (id) => {
    setVisitors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, approvalStatus: "Rejected" } : v))
    );
  };

  // Feature 2: Blacklist / Flag Toggle
  const handleToggleBlacklist = (id) => {
    setVisitors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, blacklisted: !v.blacklisted } : v))
    );
  };

  // Guard Check-In & Check-Out Tracker
  const handleStatusChange = (id, newStatus) => {
    const now = new Date();
    const formattedDateTime =
      now.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setVisitors((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        if (newStatus === "Inside Campus") {
          return { ...v, status: newStatus, checkInTime: formattedDateTime };
        } else if (newStatus === "Completed") {
          return { ...v, status: newStatus, checkOutTime: formattedDateTime };
        }
        return { ...v, status: newStatus };
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      <LoginModal isOpen={!currentUser} onLogin={handleLogin} />

      {currentUser && (
        <>
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-sky-600 text-white p-2 rounded-xl shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-tight text-slate-900">GateWay</h1>
                  <p className="text-xs text-slate-500 font-medium">Smart Campus Access & Pre-Approval System</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-slate-500">Signed in as:</span>
                  <strong className="text-slate-800 font-mono">
                    {currentUser.email} ({currentUser.role?.toUpperCase()})
                  </strong>
                </div>

                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                  title="Sign out of current terminal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
            {activeTab === "resident" && (
              <ResidentPortal
                activeUser={currentUser}
                onPassCreated={handlePassCreated}
                activePass={activePass}
              />
            )}
            {activeTab === "admin" && (
              <AdminDesk
                visitors={visitors}
                onApprove={handleApprove}
                onReject={handleReject}
                onToggleBlacklist={handleToggleBlacklist}
                onOpenDocModal={(docType, fileName, entityName, fileUrl) =>
                  setInspectDoc({ docType, fileName, entityName, fileUrl })
                }
              />
            )}
            {activeTab === "guard" && (
              <GuardTerminal
                visitors={visitors}
                onStatusChange={handleStatusChange}
              />
            )}
          </main>
        </>
      )}

      {/* Global Document Inspection & Approval Modals */}
      <LargeDocModal
        isOpen={Boolean(inspectDoc)}
        onClose={() => setInspectDoc(null)}
        docData={inspectDoc}
      />

      <QrGeneratedModal
        isOpen={Boolean(approvedQrPass)}
        onClose={() => setApprovedQrPass(null)}
        passData={approvedQrPass}
      />
    </div>
  );
}