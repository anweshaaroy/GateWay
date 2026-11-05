import React, { useState, useEffect } from "react";
import { Download, X, Laptop, Smartphone, CheckCircle, ExternalLink } from "lucide-react";

// Global cache for prompt so it survives re-renders
let deferredPromptGlobal = null;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPromptGlobal = e;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    deferredPromptGlobal = null;
    notifyListeners();
  });
}

export function usePwaInstall() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, []);

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true);

  // App is installable as long as it's not already running in standalone window
  const isInstallable = !isStandalone;

  const triggerInstall = async (onShowGuide) => {
    if (deferredPromptGlobal) {
      try {
        deferredPromptGlobal.prompt();
        const choice = await deferredPromptGlobal.userChoice;
        if (choice.outcome === "accepted") {
          deferredPromptGlobal = null;
          notifyListeners();
        }
        return;
      } catch (err) {
        console.error("Installation prompt error:", err);
      }
    }

    // If browser hasn't fired beforeinstallprompt or already installed, show visual guide
    if (onShowGuide) {
      onShowGuide();
    }
  };

  return {
    isInstallable,
    isInstalled: isStandalone,
    hasNativePrompt: Boolean(deferredPromptGlobal),
    triggerInstall,
  };
}

export function InstallButton({ className = "" }) {
  const { isInstallable, triggerInstall } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (!isInstallable) return null;

  return (
    <>
      <button
        onClick={() => triggerInstall(() => setShowGuide(true))}
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition-all duration-150 cursor-pointer ${className}`}
        title="Install GateWay app on your device"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showGuide && <InstallGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}

export function InstallGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Install GateWay App</h3>
              <p className="text-xs text-sky-100">Step-by-step installation guide</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-600">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5 flex items-start space-x-3">
            <Laptop className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-800 text-sm">On PC / Laptop (Chrome or Edge)</h5>
              <p className="mt-1 leading-relaxed">
                Look at the <strong>top-right of your address bar (URL bar)</strong>. Click the small{" "}
                <span className="inline-flex items-center px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[11px] font-bold text-slate-800">
                  <Download className="w-3 h-3 inline mr-1 text-sky-600" /> Install
                </span>{" "}
                or <strong>Computer icon</strong> to download GateWay to your desktop.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-start space-x-3">
            <Smartphone className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-slate-800 text-sm">On Android & iPhone</h5>
              <ul className="mt-1.5 space-y-1 list-disc list-inside leading-relaxed">
                <li>
                  <strong>Android:</strong> Tap the 3 dots menu <span className="font-bold">(⋮)</span> in Chrome and select{" "}
                  <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                </li>
                <li>
                  <strong>iPhone (Safari):</strong> Tap the <strong>Share</strong> button <span className="font-bold">(⎙)</span> and tap{" "}
                  <strong>"Add to Home Screen"</strong>.
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-sm transition cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstallPrompt() {
  const { isInstallable, triggerInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (!isInstallable) return null;

  // If dismissed, render a neat minimized floating pill so user can still access it anytime!
  if (dismissed) {
    return (
      <>
        <button
          onClick={() => triggerInstall(() => setShowGuide(true))}
          className="fixed bottom-4 right-4 z-40 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-full shadow-xl flex items-center space-x-2 text-xs font-semibold transition-all hover:scale-105 cursor-pointer border border-white/20"
          title="Install GateWay PWA"
        >
          <Download className="w-4 h-4" />
          <span>Install App</span>
        </button>

        {showGuide && <InstallGuideModal onClose={() => setShowGuide(false)} />}
      </>
    );
  }

  return (
    <>
      <aside
        aria-label="App installation notification"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-white border border-sky-100 rounded-2xl shadow-2xl p-4 z-40 flex items-center justify-between space-x-3 transition-all animate-bounce hover:animate-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 leading-tight">Install GateWay App</h4>
            <p className="text-xs text-slate-500">Download to PC or Android for 1-click access.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => triggerInstall(() => setShowGuide(true))}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
          >
            Download
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {showGuide && <InstallGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
}
