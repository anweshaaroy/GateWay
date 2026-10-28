import React, { useState, useEffect } from "react";
import LoginModal from "./components/LoginModal";
import ResidentPortal from "./components/ResidentPortal";
import AdminDesk from "./components/AdminDesk";
import GuardTerminal from "./components/GuardTerminal";
import { LargeDocModal, QrGeneratedModal } from "./components/Modals";
import { ShieldCheck, LogOut, Clock } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";
const SESSION_DURATION_MS = 10 * 60 * 1000; // 10 minutes session limit

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("resident");
  const [activePass, setActivePass] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION_MS);

  const [inspectDoc, setInspectDoc] = useState(null);
  const [approvedQrPass, setApprovedQrPass] = useState(null);

  // Helper method to resolve available authentication token
  const getAuthToken = () => {
    return (
      localStorage.getItem("gateway_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  };

  // Complete sign out and clean up session tokens
  const handleSignOut = () => {
    localStorage.removeItem("gateway_token");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("gateway_user");
    localStorage.removeItem("gateway_session_start");
    setCurrentUser(null);
    setActivePass(null);
    setActiveTab("resident");
    setVisitors([]);
    setTimeLeft(SESSION_DURATION_MS);
  };

  // Handle portal routing based on user role and record session start
  const handleLogin = (user, isNewSession = true) => {
    setCurrentUser(user);
    localStorage.setItem("gateway_user", JSON.stringify(user));
    if (isNewSession) {
      localStorage.setItem("gateway_session_start", String(Date.now()));
    }

    const role = user.mainRole || user.role;
    if (
      role === "resident" ||
      role === "student" ||
      role === "faculty" ||
      role === "official"
    ) {
      setActiveTab("resident");
    } else if (role === "admin") {
      setActiveTab("admin");
    } else {
      setActiveTab("guard");
    }
  };

  // Restore authenticated session from localStorage on page refresh
  useEffect(() => {
    const token = getAuthToken();
    const sessionStart = Number(localStorage.getItem("gateway_session_start") || 0);
    const storedUser = localStorage.getItem("gateway_user");

    if (!token || !sessionStart) return;

    const elapsed = Date.now() - sessionStart;
    if (elapsed >= SESSION_DURATION_MS) {
      // 10-minute session has expired
      handleSignOut();
      return;
    }

    // Optimistically restore session so page does not flash login modal
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        handleLogin(parsed, false);
      } catch (err) {
        console.error("Failed to parse stored user session:", err);
      }
    }

    // Verify token validity with backend API
    fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Session expired or invalid");
        return res.json();
      })
      .then((data) => {
        if (data?.success && data?.user) {
          handleLogin(data.user, false);
        } else {
          handleSignOut();
        }
      })
      .catch(() => {
        // If server cannot authenticate token, log out
        handleSignOut();
      });
  }, []);

  // 10-minute session timer: count down and auto-logout on expiration
  useEffect(() => {
    if (!currentUser) return;

    const tick = () => {
      const sessionStart = Number(localStorage.getItem("gateway_session_start") || Date.now());
      const elapsed = Date.now() - sessionStart;
      const remaining = Math.max(0, SESSION_DURATION_MS - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        alert("Your 10-minute session has expired. Please sign in again.");
        handleSignOut();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const formatSessionTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Fetch all registered passes from backend API with authentication headers
  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      let res = await fetch(`${BACKEND_URL}/passes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        res = await fetch(`${BACKEND_URL}/visitors`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      const data = await res.json();
      let list = [];
      if (data.success && Array.isArray(data.passes)) {
        list = data.passes;
      } else if (data.success && Array.isArray(data.visitors)) {
        list = data.visitors;
      } else if (Array.isArray(data)) {
        list = data;
      }
      setVisitors(list);

      // Keep activePass synchronized with latest backend status
      if (list.length > 0) {
        setActivePass((prev) => {
          if (!prev) return list[0];
          const match = list.find((v) => (v.id || v._id) === (prev.id || prev._id));
          return match || prev;
        });
      }
    } catch (err) {
      console.error("Failed to load visitors or passes from backend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchVisitors();
    }
  }, [currentUser]);

  // Pre-registration pass creation handler
  const handlePassCreated = (newPass) => {
    setVisitors((prev) => [newPass, ...prev]);
    setActivePass(newPass);
    fetchVisitors();
  };

  // Spot registration handler issued by security guard
  const handleAddVisitor = (newVisitor) => {
    setVisitors((prev) => [newVisitor, ...prev]);
    fetchVisitors();
  };

  // Pass approval status sync
  const handleApprove = (id) => {
    setVisitors((prev) =>
      prev.map((v) => {
        const vid = v.id || v._id;
        return vid === id ? { ...v, approvalStatus: "Approved" } : v;
      })
    );
    const pass = visitors.find((v) => (v.id || v._id) === id);
    if (pass) {
      setApprovedQrPass({ ...pass, approvalStatus: "Approved" });
    }
    fetchVisitors();
  };

  // Pass rejection status sync
  const handleReject = (id) => {
    setVisitors((prev) =>
      prev.map((v) => {
        const vid = v.id || v._id;
        return vid === id ? { ...v, approvalStatus: "Rejected" } : v;
      })
    );
    fetchVisitors();
  };

  // Blacklist and security flag status sync
  const handleToggleBlacklist = (id) => {
    setVisitors((prev) =>
      prev.map((v) => {
        const vid = v.id || v._id;
        return vid === id ? { ...v, blacklisted: !v.blacklisted } : v;
      })
    );
    fetchVisitors();
  };

  // Campus entry and exit tracking
  const handleStatusChange = (id, newStatus, timestamp) => {
    const defaultTime =
      new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const recordTime = timestamp || defaultTime;

    setVisitors((prev) =>
      prev.map((v) => {
        const vid = v.id || v._id;
        if (vid !== id) return v;
        if (newStatus === "Inside Campus") {
          return { ...v, status: newStatus, checkInTime: recordTime };
        } else if (newStatus === "Completed") {
          return { ...v, status: newStatus, checkOutTime: recordTime };
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

                <div
                  className="hidden md:flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs"
                  title="Session will expire after 10 minutes"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-slate-500">Session:</span>
                  <strong className="font-mono text-slate-800">{formatSessionTime(timeLeft)}</strong>
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
                onRefresh={fetchVisitors}
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
                onAddVisitor={handleAddVisitor}
              />
            )}
          </main>
        </>
      )}

      {/* Verification Modals */}
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