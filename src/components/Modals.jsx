import React, { useState, useEffect } from "react";
import {
  FileText,
  FileCheck2,
  ShieldCheck,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCcw,
  X,
  Loader2,
  Download,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000/api";

export function LargeDocModal({ isOpen, onClose, docData }) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const ext = docData?.fileName?.split(".").pop().toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);
  const isPdf = ext === "pdf";

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleResetControls = () => {
    setScale(1);
    setRotation(0);
  };

  const handleModalClose = () => {
    handleResetControls();
    onClose();
  };

  // Securely resolve and fetch remote document binary
  useEffect(() => {
    if (!isOpen || !docData?.fileUrl) {
      setBlobUrl(null);
      setErrorMsg("");
      setLoading(false);
      return;
    }

    let active = true;
    let createdBlob = null;

    const loadDocument = async () => {
      setLoading(true);
      setErrorMsg("");

      let targetUrl = docData.fileUrl;
      // Resolve relative path to full backend server address
      if (targetUrl.startsWith("/")) {
        const backendBase = BACKEND_URL.replace(/\/api\/?$/, "");
        targetUrl = `${backendBase}${targetUrl}`;
      }

      // If already a local blob/data URL, render immediately
      if (targetUrl.startsWith("blob:") || targetUrl.startsWith("data:")) {
        setBlobUrl(targetUrl);
        setLoading(false);
        return;
      }

      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("authToken");

      try {
        const res = await fetch(targetUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }

        const blob = await res.blob();
        if (!active) return;

        createdBlob = URL.createObjectURL(blob);
        setBlobUrl(createdBlob);
      } catch (err) {
        if (!active) return;
        console.error("Document fetch error:", err);
        setErrorMsg(err.message || "Could not load document preview.");
        // Fallback to target URL
        setBlobUrl(targetUrl);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDocument();

    return () => {
      active = false;
      if (createdBlob) {
        URL.revokeObjectURL(createdBlob);
      }
    };
  }, [isOpen, docData?.fileUrl]);

  if (!isOpen || !docData) return null;

  const currentPreviewUrl = blobUrl || docData.fileUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-300 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-sky-600/30 rounded-xl border border-sky-400/30 text-sky-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {docData.docType} Inspection Viewer
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Campus Security Pre-Clearance Console
              </p>
            </div>
          </div>

          {/* Interactive Inspection Controls */}
          <div className="flex items-center space-x-1.5">
            {isImage && currentPreviewUrl && !loading && !errorMsg && (
              <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700 mr-2">
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Rotate 90deg"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetControls}
                  className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition cursor-pointer"
                  title="Reset View"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            {currentPreviewUrl && (
              <a
                href={currentPreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={docData.fileName || "document"}
                className="p-1.5 bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition flex items-center space-x-1 text-xs px-2.5 mr-2 cursor-pointer"
                title="Download or Open Fullscreen"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open Full</span>
              </a>
            )}

            <button
              onClick={handleModalClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition flex items-center justify-center cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Strip */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
          <div>
            <span className="font-semibold text-slate-500 uppercase text-[10px]">
              Holder:{" "}
            </span>
            <strong className="text-slate-900">{docData.entityName}</strong>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sky-700 font-bold bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
              {docData.fileName}
            </span>
            <span className="font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase text-[10px]">
              {ext}
            </span>
          </div>
        </div>

        {/* Live Document Canvas */}
        <div className="p-6 overflow-hidden flex-1 bg-slate-100 flex items-center justify-center min-h-[440px] relative select-none">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3 p-8 text-center">
              <Loader2 className="w-9 h-9 text-sky-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Loading document securely from server...</p>
              <p className="text-xs text-slate-400">Verifying security clearance credentials</p>
            </div>
          ) : errorMsg && !blobUrl ? (
            <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3 max-w-md shadow-sm">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h4 className="font-bold text-sm text-slate-800">Could not preview document inline</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
              {currentPreviewUrl && (
                <a
                  href={currentPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Document in New Tab</span>
                </a>
              )}
            </div>
          ) : currentPreviewUrl ? (
            isImage ? (
              <div className="overflow-hidden flex items-center justify-center w-full h-full">
                <img
                  src={currentPreviewUrl}
                  alt="Document Verification"
                  className="max-h-[500px] w-auto max-w-full rounded-xl object-contain shadow-md border border-slate-300 bg-white transition-transform duration-200"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg)`,
                  }}
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={currentPreviewUrl}
                title="PDF Verification"
                className="w-full h-[540px] rounded-xl border border-slate-300 shadow-sm bg-white"
              />
            ) : (
              <iframe
                src={currentPreviewUrl}
                title="Document Verification"
                className="w-full h-[540px] rounded-xl border border-slate-300 shadow-sm bg-white"
              />
            )
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <FileCheck2 className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                Sample Mock Entry (No Live File Attached)
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-500 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Digital Security Verification Active</span>
            </span>
            {isImage && currentPreviewUrl && !loading && (
              <span className="text-[11px] font-mono text-slate-400">
                Scale: {Math.round(scale * 100)}% | Rotation: {rotation}&deg;
              </span>
            )}
          </div>
          <button
            onClick={handleModalClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Dismiss Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

export function QrGeneratedModal({ isOpen, onClose, passData }) {
  if (!isOpen || !passData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center">
        <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full mb-3">
          <CheckCircle className="w-3.5 h-3.5" /> APPROVED &amp; QR TOKEN GENERATED
        </div>
        <h3 className="text-lg font-extrabold text-slate-900">{passData.name}</h3>
        <p className="text-xs text-slate-500 font-mono mb-4">
          Passcode: {passData.passcode}
        </p>

        <div className="bg-white p-3.5 rounded-2xl shadow-inner border border-slate-200 inline-block mb-3">
          <QRCodeSVG value={passData.passcode} size={140} level="H" />
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Visitor is now cleared for scanning at any Guard Gate Terminal.
        </p>
        <button
          onClick={onClose}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
        >
          Done &amp; Refresh Queue
        </button>
      </div>
    </div>
  );
}
