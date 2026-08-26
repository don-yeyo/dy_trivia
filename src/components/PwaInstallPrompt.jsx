import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-40 max-w-sm glass-panel p-3.5 rounded-2xl shadow-2xl border border-red-500/30 flex items-center justify-between gap-3 animate-bounce-in">
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/favicon.svg" alt="App Icon" className="w-8 h-8 rounded-lg shrink-0" />
        <div className="text-xs text-white leading-tight truncate">
          <div className="font-bold">Instalar App Don Yeyo</div>
          <div className="text-gray-300 text-[11px]">Acceso rápido para la Trivia</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md"
        >
          Instalar
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 text-gray-400 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
