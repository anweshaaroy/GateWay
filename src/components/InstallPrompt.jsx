import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

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

  const isInstallable = !isStandalone;

  const directInstall = async () => {
    if (deferredPromptGlobal) {
      try {
        deferredPromptGlobal.prompt();
        const choice = await deferredPromptGlobal.userChoice;
        if (choice.outcome === "accepted") {
          deferredPromptGlobal = null;
          notifyListeners();
        }
      } catch (err) {
        console.error("Direct install error:", err);
      }
    }
  };

  return {
    isInstallable,
    isInstalled: isStandalone,
    hasNativePrompt: Boolean(deferredPromptGlobal),
    directInstall,
  };
}

export default function InstallPrompt() {
  const { isInstallable, directInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <aside
      aria-label="App installation notification"
      className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white border border-sky-100 rounded-2xl shadow-2xl p-4 z-[60] flex items-center justify-between space-x-3 transition-all animate-bounce hover:animate-none"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-800 leading-tight">Install GateWay App</h4>
          <p className="text-xs text-slate-500">1-Click direct install for PC & Android.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={directInstall}
          className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
        >
          Download
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
